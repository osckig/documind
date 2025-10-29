"""
Search service with RAG capabilities using Ollama and Tools
"""
from typing import List, Dict, Any, Optional
import logging
import ollama
from config.settings import settings
from services.embedding_service_local import LocalEmbeddingService
from services.tools.manager import ToolManager
from services.tools.calculator import CalculatorTool
from services.tools.web_search import WebSearchTool
from services.tools.document_stats import DocumentStatsTool

logger = logging.getLogger(__name__)


class LocalSearchService:
    """Service for semantic search and RAG using Ollama"""

    def __init__(self):
        """Initialize search service"""
        self.embedding_service = LocalEmbeddingService()

        # Ollama client
        self.ollama_client = ollama.Client(host=settings.ollama_base_url)
        self.model = settings.ollama_model

        # Initialize tool manager
        self.tool_manager = ToolManager()
        self.tool_manager.register_tool(CalculatorTool())
        self.tool_manager.register_tool(WebSearchTool())
        self.tool_manager.register_tool(DocumentStatsTool(self.embedding_service))
        logger.info(f"Registered {len(self.tool_manager.tools)} tools")

        # Test Ollama connection
        try:
            models = self.ollama_client.list()
            logger.info(f"Connected to Ollama. Available models: {[m['name'] for m in models.get('models', [])]}")
        except Exception as e:
            logger.warning(f"Could not connect to Ollama: {e}. Make sure Ollama is running on {settings.ollama_base_url}")

        # RAG prompt template
        self.rag_prompt_template = """You are a helpful AI assistant for a document search system used by Small and Medium Enterprises (SMEs) in Kenya.

Use the following pieces of context from the documents to answer the question. If you don't know the answer or the context doesn't contain relevant information, say so. Don't make up information.

Context:
{context}

Question: {question}

Answer:"""

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
        # Simple implementation: search through all stored chunks
        try:
            all_chunks = []
            for idx, metadata in self.embedding_service.metadata_store.items():
                content = metadata.get("content", "").lower()
                query_lower = query.lower()

                # Simple keyword matching
                if query_lower in content:
                    # Calculate simple relevance score based on frequency
                    frequency = content.count(query_lower)
                    score = min(frequency / 10.0, 1.0)  # Cap at 1.0

                    all_chunks.append({
                        "id": str(idx),
                        "content": metadata.get("content"),
                        "document_id": metadata.get("document_id"),
                        "filename": metadata.get("filename"),
                        "file_type": metadata.get("file_type"),
                        "page_number": metadata.get("page_number"),
                        "metadata": metadata.get("metadata"),
                        "score": score,
                        "distance": 1.0 - score
                    })

            # Sort by score and limit
            all_chunks.sort(key=lambda x: x["score"], reverse=True)
            results = all_chunks[:limit]

            logger.info(f"Keyword search returned {len(results)} results")
            return results

        except Exception as e:
            logger.error(f"Error in keyword search: {e}")
            return []

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

            # Combine and re-rank
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
        filters: Optional[Dict[str, Any]] = None,
        use_tools: bool = True
    ) -> Dict[str, Any]:
        """Answer question using RAG with Ollama and Tools"""
        try:
            # First, check if we should use a tool
            tool_used = None
            tool_result = None

            if use_tools:
                # Try to determine if a tool should be used based on the question
                question_lower = question.lower()

                # Calculator tool triggers
                if any(keyword in question_lower for keyword in ['calculate', 'compute', 'what is', 'plus', 'minus', 'times', 'divided', '+', '-', '*', '/']):
                    # Extract mathematical expression
                    import re
                    # Look for patterns like "2 + 2" or "what is 10 * 5"
                    math_pattern = r'(\d+[\s\+\-\*\/\(\)]+[\d\s\+\-\*\/\(\)]+\d+)'
                    match = re.search(math_pattern, question)
                    if match:
                        expression = match.group(1).strip()
                        tool_result = await self.tool_manager.execute_tool('calculator', {'expression': expression})
                        tool_used = 'calculator'

                # Document stats tool triggers
                elif any(keyword in question_lower for keyword in ['how many documents', 'how many files', 'what documents', 'list documents', 'document count']):
                    tool_result = await self.tool_manager.execute_tool('document_stats', {'include_details': True})
                    tool_used = 'document_stats'

                # Web search tool triggers
                elif any(keyword in question_lower for keyword in ['search web', 'latest', 'current', 'recent news', 'what\'s happening']):
                    # Extract search query (remove trigger words)
                    search_query = question_lower
                    for trigger in ['search web for', 'search for', 'find', 'what is']:
                        search_query = search_query.replace(trigger, '').strip()
                    tool_result = await self.tool_manager.execute_tool('web_search', {'query': search_query, 'max_results': 5})
                    tool_used = 'web_search'

            # Retrieve relevant chunks from documents
            chunks = await self.semantic_search(
                query=question,
                limit=limit,
                filters=filters
            )

            # Prepare context
            context = ""
            if chunks:
                context = "\n\n".join([
                    f"[Document: {chunk['filename']}, Page: {chunk.get('page_number', 'N/A')}]\n{chunk['content']}"
                    for chunk in chunks
                ])

            # Create prompt with tool information if tool was used
            if tool_result and tool_result.success:
                tool_info = self.tool_manager.format_tool_result_for_llm(tool_result)
                if context:
                    prompt = f"""{self.tool_manager.get_tools_prompt()}

{tool_info}

Context from documents:
{context}

Question: {question}

Provide a helpful answer using the tool result and document context."""
                else:
                    prompt = f"""{self.tool_manager.get_tools_prompt()}

{tool_info}

Question: {question}

Provide a helpful answer using the tool result."""
            elif context:
                prompt = self.rag_prompt_template.format(context=context, question=question)
            else:
                # No context and no tool result - provide general guidance
                prompt = f"""{self.tool_manager.get_tools_prompt()}

Question: {question}

I don't have relevant documents for this question. Please provide a helpful response or suggest using a tool if appropriate."""

            # Generate answer using Ollama
            try:
                response = self.ollama_client.generate(
                    model=self.model,
                    prompt=prompt,
                    options={
                        "temperature": settings.llm_temperature,
                        "num_predict": settings.llm_max_tokens,
                    }
                )
                answer = response['response'].strip()
            except Exception as e:
                logger.error(f"Ollama error: {e}")
                return {
                    "answer": f"Error generating response. Make sure Ollama is running and the '{self.model}' model is installed. Run: ollama pull {self.model}",
                    "sources": [],
                    "error": str(e)
                }

            # Prepare sources
            sources = [
                {
                    "id": chunk["id"],
                    "document_id": chunk["document_id"],
                    "filename": chunk["filename"],
                    "content_preview": chunk["content"][:200] + "..." if len(chunk["content"]) > 200 else chunk["content"],
                    "page_number": chunk.get("page_number"),
                    "score": chunk.get("score")
                }
                for chunk in chunks
            ]

            logger.info(f"RAG query completed with {len(sources)} sources{' and tool: ' + tool_used if tool_used else ''}")

            result = {
                "answer": answer,
                "sources": sources,
                "context_used": bool(context),
                "model": self.model
            }

            # Add tool information if tool was used
            if tool_used and tool_result:
                result["tool_used"] = tool_used
                result["tool_result"] = tool_result.dict()

            return result

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
