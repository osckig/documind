"""
Embedding service for generating and managing vector embeddings
"""
import weaviate
from weaviate.classes.config import Configure, Property, DataType
from sentence_transformers import SentenceTransformer
from typing import List, Dict, Any, Optional
import logging
from config.settings import settings

logger = logging.getLogger(__name__)


class EmbeddingService:
    """Service for generating and managing embeddings"""

    def __init__(self):
        """Initialize embedding service"""
        # Initialize Weaviate client
        self.client = weaviate.connect_to_local(
            host=settings.weaviate_url.replace("http://", "").replace("https://", "")
        )

        # Initialize embedding model
        logger.info(f"Loading embedding model: {settings.embedding_model}")
        self.model = SentenceTransformer(settings.embedding_model)
        logger.info("Embedding model loaded successfully")

    async def initialize_schema(self):
        """Initialize Weaviate schema"""
        try:
            # Create DocumentChunk class if it doesn't exist
            if not self.client.collections.exists("DocumentChunk"):
                self.client.collections.create(
                    name="DocumentChunk",
                    description="Document chunks with embeddings",
                    vectorizer_config=Configure.Vectorizer.none(),
                    properties=[
                        Property(name="content", data_type=DataType.TEXT),
                        Property(name="document_id", data_type=DataType.INT),
                        Property(name="chunk_index", data_type=DataType.INT),
                        Property(name="filename", data_type=DataType.TEXT),
                        Property(name="file_type", data_type=DataType.TEXT),
                        Property(name="page_number", data_type=DataType.INT),
                        Property(name="metadata", data_type=DataType.OBJECT),
                    ]
                )
                logger.info("DocumentChunk class created in Weaviate")

            # Create Document class if it doesn't exist
            if not self.client.collections.exists("Document"):
                self.client.collections.create(
                    name="Document",
                    description="Full documents with metadata",
                    vectorizer_config=Configure.Vectorizer.none(),
                    properties=[
                        Property(name="filename", data_type=DataType.TEXT),
                        Property(name="title", data_type=DataType.TEXT),
                        Property(name="content", data_type=DataType.TEXT),
                        Property(name="file_type", data_type=DataType.TEXT),
                        Property(name="user_id", data_type=DataType.INT),
                        Property(name="metadata", data_type=DataType.OBJECT),
                    ]
                )
                logger.info("Document class created in Weaviate")

        except Exception as e:
            logger.error(f"Error initializing Weaviate schema: {e}")
            raise

    def generate_embedding(self, text: str) -> List[float]:
        """Generate embedding for text"""
        try:
            embedding = self.model.encode(text, convert_to_tensor=False)
            return embedding.tolist()
        except Exception as e:
            logger.error(f"Error generating embedding: {e}")
            raise

    def generate_embeddings_batch(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings for multiple texts"""
        try:
            embeddings = self.model.encode(texts, convert_to_tensor=False, show_progress_bar=True)
            return [emb.tolist() for emb in embeddings]
        except Exception as e:
            logger.error(f"Error generating batch embeddings: {e}")
            raise

    async def store_document_chunk(
        self,
        content: str,
        document_id: int,
        chunk_index: int,
        filename: str,
        file_type: str,
        page_number: Optional[int] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> str:
        """Store document chunk with embedding in Weaviate"""
        try:
            # Generate embedding
            embedding = self.generate_embedding(content)

            # Prepare data object
            data_object = {
                "content": content,
                "document_id": document_id,
                "chunk_index": chunk_index,
                "filename": filename,
                "file_type": file_type,
                "page_number": page_number,
                "metadata": metadata or {}
            }

            # Store in Weaviate
            collection = self.client.collections.get("DocumentChunk")
            result = collection.data.insert(
                properties=data_object,
                vector=embedding
            )

            logger.info(f"Stored chunk {chunk_index} for document {document_id}")
            return str(result)

        except Exception as e:
            logger.error(f"Error storing document chunk: {e}")
            raise

    async def store_document_chunks_batch(
        self,
        chunks: List[Dict[str, Any]]
    ) -> List[str]:
        """Store multiple document chunks in batch"""
        try:
            # Extract content for batch embedding generation
            contents = [chunk["content"] for chunk in chunks]
            embeddings = self.generate_embeddings_batch(contents)

            # Store in Weaviate
            collection = self.client.collections.get("DocumentChunk")
            ids = []

            with collection.batch.dynamic() as batch:
                for chunk, embedding in zip(chunks, embeddings):
                    result = batch.add_object(
                        properties=chunk,
                        vector=embedding
                    )
                    ids.append(str(result))

            logger.info(f"Stored {len(chunks)} chunks in batch")
            return ids

        except Exception as e:
            logger.error(f"Error storing document chunks in batch: {e}")
            raise

    async def search_similar_chunks(
        self,
        query: str,
        limit: int = 10,
        filters: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """Search for similar chunks using vector similarity"""
        try:
            # Generate query embedding
            query_embedding = self.generate_embedding(query)

            # Search in Weaviate
            collection = self.client.collections.get("DocumentChunk")

            # Build query
            query_builder = collection.query.near_vector(
                near_vector=query_embedding,
                limit=limit,
                return_metadata=['distance', 'score']
            )

            # Execute search
            results = query_builder

            # Format results
            formatted_results = []
            for obj in results.objects:
                formatted_results.append({
                    "id": str(obj.uuid),
                    "content": obj.properties.get("content"),
                    "document_id": obj.properties.get("document_id"),
                    "filename": obj.properties.get("filename"),
                    "file_type": obj.properties.get("file_type"),
                    "page_number": obj.properties.get("page_number"),
                    "metadata": obj.properties.get("metadata"),
                    "score": obj.metadata.score if hasattr(obj.metadata, 'score') else None,
                    "distance": obj.metadata.distance if hasattr(obj.metadata, 'distance') else None
                })

            logger.info(f"Found {len(formatted_results)} similar chunks")
            return formatted_results

        except Exception as e:
            logger.error(f"Error searching similar chunks: {e}")
            raise

    async def delete_document_chunks(self, document_id: int):
        """Delete all chunks for a document"""
        try:
            collection = self.client.collections.get("DocumentChunk")
            collection.data.delete_many(
                where={
                    "path": ["document_id"],
                    "operator": "Equal",
                    "valueInt": document_id
                }
            )
            logger.info(f"Deleted all chunks for document {document_id}")
        except Exception as e:
            logger.error(f"Error deleting document chunks: {e}")
            raise

    def close(self):
        """Close Weaviate client"""
        self.client.close()
        logger.info("Weaviate client closed")
