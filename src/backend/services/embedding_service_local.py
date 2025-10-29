"""
Local embedding service using FAISS for vector storage
"""
import faiss
import numpy as np
from sentence_transformers import SentenceTransformer
from typing import List, Dict, Any, Optional
import logging
import pickle
import os
from config.settings import settings

logger = logging.getLogger(__name__)


class LocalEmbeddingService:
    """Service for generating and managing embeddings locally with FAISS"""

    def __init__(self):
        """Initialize embedding service"""
        # Initialize embedding model
        logger.info(f"Loading embedding model: {settings.embedding_model}")
        self.model = SentenceTransformer(settings.embedding_model)
        self.dimension = settings.embedding_dimension
        logger.info("Embedding model loaded successfully")

        # Initialize FAISS index
        self.index = faiss.IndexFlatL2(self.dimension)  # L2 distance (Euclidean)

        # Store metadata for each vector
        self.metadata_store: Dict[int, Dict[str, Any]] = {}
        self.next_id = 0

        # Paths for persistence
        self.index_path = "data/embeddings/faiss_index.bin"
        self.metadata_path = "data/embeddings/metadata.pkl"

        # Load existing index if available
        self._load_index()

    def _load_index(self):
        """Load FAISS index and metadata from disk"""
        try:
            if os.path.exists(self.index_path) and os.path.exists(self.metadata_path):
                self.index = faiss.read_index(self.index_path)
                with open(self.metadata_path, 'rb') as f:
                    data = pickle.load(f)
                    self.metadata_store = data['metadata']
                    self.next_id = data['next_id']
                logger.info(f"Loaded FAISS index with {self.index.ntotal} vectors")
        except Exception as e:
            logger.warning(f"Could not load existing index: {e}. Starting fresh.")

    def _save_index(self):
        """Save FAISS index and metadata to disk"""
        try:
            os.makedirs(os.path.dirname(self.index_path), exist_ok=True)
            faiss.write_index(self.index, self.index_path)
            with open(self.metadata_path, 'wb') as f:
                pickle.dump({
                    'metadata': self.metadata_store,
                    'next_id': self.next_id
                }, f)
            logger.info(f"Saved FAISS index with {self.index.ntotal} vectors")
        except Exception as e:
            logger.error(f"Error saving index: {e}")

    async def initialize_schema(self):
        """Initialize schema (no-op for local storage, kept for compatibility)"""
        logger.info("Local embedding service initialized")

    def generate_embedding(self, text: str) -> np.ndarray:
        """Generate embedding for text"""
        try:
            embedding = self.model.encode(text, convert_to_tensor=False)
            return embedding
        except Exception as e:
            logger.error(f"Error generating embedding: {e}")
            raise

    def generate_embeddings_batch(self, texts: List[str]) -> List[np.ndarray]:
        """Generate embeddings for multiple texts"""
        try:
            embeddings = self.model.encode(texts, convert_to_tensor=False, show_progress_bar=True)
            return [emb for emb in embeddings]
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
        """Store document chunk with embedding in FAISS"""
        try:
            # Generate embedding
            embedding = self.generate_embedding(content)

            # Convert to numpy array and reshape for FAISS
            vector = np.array([embedding]).astype('float32')

            # Add to FAISS index
            self.index.add(vector)

            # Store metadata
            chunk_id = self.next_id
            self.metadata_store[chunk_id] = {
                "content": content,
                "document_id": document_id,
                "chunk_index": chunk_index,
                "filename": filename,
                "file_type": file_type,
                "page_number": page_number,
                "metadata": metadata or {}
            }

            self.next_id += 1

            # Save to disk
            self._save_index()

            logger.info(f"Stored chunk {chunk_index} for document {document_id}")
            return str(chunk_id)

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

            # Convert to numpy array
            vectors = np.array(embeddings).astype('float32')

            # Add all vectors to FAISS index
            self.index.add(vectors)

            # Store metadata
            ids = []
            for i, chunk in enumerate(chunks):
                chunk_id = self.next_id
                self.metadata_store[chunk_id] = chunk
                ids.append(str(chunk_id))
                self.next_id += 1

            # Save to disk
            self._save_index()

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
            query_vector = np.array([query_embedding]).astype('float32')

            # Search in FAISS
            distances, indices = self.index.search(query_vector, min(limit * 2, self.index.ntotal))

            # Format results
            formatted_results = []
            for i, idx in enumerate(indices[0]):
                if idx == -1:  # FAISS returns -1 for empty results
                    continue

                if idx in self.metadata_store:
                    metadata = self.metadata_store[idx]

                    # Apply filters if provided
                    if filters:
                        skip = False
                        for key, value in filters.items():
                            if key in metadata and metadata[key] != value:
                                skip = True
                                break
                        if skip:
                            continue

                    # Convert L2 distance to similarity score (0-1 range)
                    # Lower distance = higher similarity
                    distance = float(distances[0][i])
                    score = 1.0 / (1.0 + distance)  # Convert distance to similarity

                    result = {
                        "id": str(idx),
                        "content": metadata.get("content"),
                        "document_id": metadata.get("document_id"),
                        "filename": metadata.get("filename"),
                        "file_type": metadata.get("file_type"),
                        "page_number": metadata.get("page_number"),
                        "metadata": metadata.get("metadata"),
                        "score": score,
                        "distance": distance
                    }
                    formatted_results.append(result)

                    if len(formatted_results) >= limit:
                        break

            logger.info(f"Found {len(formatted_results)} similar chunks")
            return formatted_results

        except Exception as e:
            logger.error(f"Error searching similar chunks: {e}")
            raise

    async def delete_document_chunks(self, document_id: int):
        """Delete all chunks for a document"""
        try:
            # FAISS doesn't support deletion, so we rebuild the index without the chunks
            # Find indices to keep
            indices_to_keep = []
            new_metadata = {}
            new_id = 0

            for idx, metadata in self.metadata_store.items():
                if metadata.get("document_id") != document_id:
                    indices_to_keep.append(idx)
                    new_metadata[new_id] = metadata
                    new_id += 1

            if len(indices_to_keep) < len(self.metadata_store):
                # Rebuild index
                new_index = faiss.IndexFlatL2(self.dimension)

                # Re-add vectors
                if indices_to_keep:
                    vectors_to_keep = []
                    for idx in indices_to_keep:
                        # Reconstruct vector from stored content
                        content = self.metadata_store[idx]["content"]
                        embedding = self.generate_embedding(content)
                        vectors_to_keep.append(embedding)

                    vectors_array = np.array(vectors_to_keep).astype('float32')
                    new_index.add(vectors_array)

                # Replace index and metadata
                self.index = new_index
                self.metadata_store = new_metadata
                self.next_id = new_id

                # Save
                self._save_index()

                logger.info(f"Deleted all chunks for document {document_id}")
            else:
                logger.info(f"No chunks found for document {document_id}")

        except Exception as e:
            logger.error(f"Error deleting document chunks: {e}")
            raise

    def close(self):
        """Save and close"""
        self._save_index()
        logger.info("Local embedding service closed")
