"""
Search service with RAG capabilities
"""
from typing import List, Dict, Any, Optional
import logging
from langchain.prompts import PromptTemplate
from langchain_community.chat_models import ChatOpenAI
from langchain.chains import LLMChain
from config.settings import settings
from services.embedding_service import EmbeddingService

logger = logging.getLogger(__name__)


class SearchService:
    """Service for semantic search and RAG"""

    def __init__(self):
        """Initialize search service"""
        self.embedding_service = EmbeddingService()

        # Initialize LLM for RAG
        if settings.openai_api_key:
            self.llm = ChatOpenAI(
                model=settings.llm_model,
                temperature=settings.llm_temperature,
                max_tokens=settings.llm_max_tokens,
                openai_api_key=settings.openai_api_key
            )
        else:
            logger.warning("OpenAI API key not configured. RAG will be disabled.")
            self.llm = None

        # RAG prompt template
        self.rag_prompt = PromptTemplate(
            input_variables=["context", "question"],
            template="""You are a helpful AI assistant for a document search system used by Small and Medium Enterprises (SMEs) in Kenya.

Use the following pieces of context from the documents to answer the question. If you don't know the answer or the context doesn't contain relevant information, say so. Don't make up information.

Context:
{context}

Question: {question}

Answer: """
        )

    async def semantic_search(
        self,
        query: str,
        limit: int = 10,
        filters: Optional[Dict[str, Any]] = None,
        threshold: Optional[float] = None
    ) -> List[Dict[str, Any]]:
        """Perform semantic search"""
        try:
            # Search for similar chunks
            results = await self.embedding_service.search_similar_chunks(
                query=query,
                limit=limit,
                filters=filters
            )

            # Filter by threshold if provided
            if threshold:
                results = [r for r in results if r.get("score", 0) >= threshold]

            logger.info(f"Semantic search returned {len(results)} results")
            return results

        except Exception as e:
            logger.error(f"Error in semantic search: {e}")
            raise

    async def keyword_search(
        self,
        query: str,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """Perform keyword-based search"""
        # This is a placeholder - implement BM25 or similar
        # For now, just use semantic search
        return await self.semantic_search(query, limit)

    async def hybrid_search(
        self,
        query: str,
        limit: int = 10,
        semantic_weight: float = 0.7
    ) -> List[Dict[str, Any]]:
        """Perform hybrid search combining semantic and keyword"""
        try:
            # Get semantic results
            semantic_results = await self.semantic_search(query, limit * 2)

            # Get keyword results
            keyword_results = await self.keyword_search(query, limit * 2)

            # Combine and re-rank (simple implementation)
            combined_results = {}

            for result in semantic_results:
                doc_id = result["id"]
                combined_results[doc_id] = result
                combined_results[doc_id]["final_score"] = result.get("score", 0) * semantic_weight

            for result in keyword_results:
                doc_id = result["id"]
                if doc_id in combined_results:
                    combined_results[doc_id]["final_score"] += result.get("score", 0) * (1 - semantic_weight)
                else:
                    combined_results[doc_id] = result
                    combined_results[doc_id]["final_score"] = result.get("score", 0) * (1 - semantic_weight)

            # Sort by final score
            sorted_results = sorted(
                combined_results.values(),
                key=lambda x: x.get("final_score", 0),
                reverse=True
            )[:limit]

            logger.info(f"Hybrid search returned {len(sorted_results)} results")
            return sorted_results

        except Exception as e:
            logger.error(f"Error in hybrid search: {e}")
            raise

    async def rag_query(
        self,
        question: str,
        limit: int = 5,
        filters: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Answer question using RAG"""
        try:
            if not self.llm:
                return {
                    "answer": "RAG is not configured. Please set OPENAI_API_KEY.",
                    "sources": [],
                    "error": "LLM not configured"
                }

            # Retrieve relevant chunks
            chunks = await self.semantic_search(
                query=question,
                limit=limit,
                filters=filters
            )

            if not chunks:
                return {
                    "answer": "I couldn't find any relevant information in the documents to answer your question.",
                    "sources": [],
                    "context_used": False
                }

            # Prepare context
            context = "\n\n".join([
                f"[Document: {chunk['filename']}, Page: {chunk.get('page_number', 'N/A')}]\n{chunk['content']}"
                for chunk in chunks
            ])

            # Generate answer using LLM
            chain = LLMChain(llm=self.llm, prompt=self.rag_prompt)
            answer = await chain.arun(context=context, question=question)

            # Prepare sources
            sources = [
                {
                    "id": chunk["id"],
                    "document_id": chunk["document_id"],
                    "filename": chunk["filename"],
                    "content_preview": chunk["content"][:200] + "...",
                    "page_number": chunk.get("page_number"),
                    "score": chunk.get("score")
                }
                for chunk in chunks
            ]

            logger.info(f"RAG query completed with {len(sources)} sources")

            return {
                "answer": answer.strip(),
                "sources": sources,
                "context_used": True,
                "model": settings.llm_model
            }

        except Exception as e:
            logger.error(f"Error in RAG query: {e}")
            return {
                "answer": f"An error occurred while processing your question: {str(e)}",
                "sources": [],
                "error": str(e)
            }

    async def chat(
        self,
        messages: List[Dict[str, str]],
        filters: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Multi-turn conversation with RAG"""
        try:
            if not messages:
                raise ValueError("No messages provided")

            # Get the last user message
            last_message = None
            for msg in reversed(messages):
                if msg.get("role") == "user":
                    last_message = msg.get("content")
                    break

            if not last_message:
                raise ValueError("No user message found")

            # Use RAG to answer
            response = await self.rag_query(last_message, filters=filters)

            return response

        except Exception as e:
            logger.error(f"Error in chat: {e}")
            return {
                "answer": f"An error occurred: {str(e)}",
                "sources": [],
                "error": str(e)
            }

    def close(self):
        """Close resources"""
        self.embedding_service.close()
