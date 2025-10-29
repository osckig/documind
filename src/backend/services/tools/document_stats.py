"""
Document statistics tool
"""
from typing import List
import time
import logging
from .base import BaseTool, ToolParameter, ToolResult

logger = logging.getLogger(__name__)


class DocumentStatsTool(BaseTool):
    """Tool for getting statistics about uploaded documents"""

    def __init__(self, embedding_service):
        """Initialize with reference to embedding service"""
        self.embedding_service = embedding_service
        super().__init__()

    def get_name(self) -> str:
        return "document_stats"

    def get_description(self) -> str:
        return "Gets statistics about the uploaded documents, including total count, file types, and available documents. Use this when the user asks 'how many documents do I have?' or 'what files are uploaded?'"

    def get_parameters(self) -> List[ToolParameter]:
        return [
            ToolParameter(
                name="include_details",
                type="boolean",
                description="Whether to include detailed list of documents (default: false)",
                required=False,
                default=False
            )
        ]

    async def execute(self, include_details: bool = False, **kwargs) -> ToolResult:
        """Execute document stats retrieval"""
        start_time = time.time()

        try:
            # Get all documents from metadata store
            metadata_store = self.embedding_service.metadata_store

            if not metadata_store:
                return ToolResult(
                    tool_name=self.name,
                    success=True,
                    result={
                        "total_documents": 0,
                        "total_chunks": 0,
                        "message": "No documents uploaded yet"
                    },
                    execution_time_ms=(time.time() - start_time) * 1000
                )

            # Count unique documents
            document_ids = set()
            file_types = {}
            documents = {}

            for idx, metadata in metadata_store.items():
                doc_id = metadata.get("document_id")
                file_type = metadata.get("file_type", "unknown")
                filename = metadata.get("filename")

                if doc_id:
                    document_ids.add(doc_id)

                    # Count file types
                    file_types[file_type] = file_types.get(file_type, 0) + 1

                    # Store document info
                    if doc_id not in documents:
                        documents[doc_id] = {
                            "id": doc_id,
                            "filename": filename,
                            "file_type": file_type,
                            "chunks": 0
                        }
                    documents[doc_id]["chunks"] += 1

            result = {
                "total_documents": len(document_ids),
                "total_chunks": len(metadata_store),
                "file_types": file_types,
            }

            if include_details:
                result["documents"] = list(documents.values())

            execution_time = (time.time() - start_time) * 1000

            logger.info(f"Document stats: {len(document_ids)} documents, {len(metadata_store)} chunks")

            return ToolResult(
                tool_name=self.name,
                success=True,
                result=result,
                execution_time_ms=execution_time
            )

        except Exception as e:
            logger.error(f"Document stats error: {e}")
            return ToolResult(
                tool_name=self.name,
                success=False,
                result=None,
                error=f"Failed to get document stats: {str(e)}"
            )
