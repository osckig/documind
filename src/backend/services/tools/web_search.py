"""
Web search tool using DuckDuckGo
"""
from typing import List
import time
import logging
import aiohttp
from .base import BaseTool, ToolParameter, ToolResult

logger = logging.getLogger(__name__)


class WebSearchTool(BaseTool):
    """Tool for searching the web"""

    def get_name(self) -> str:
        return "web_search"

    def get_description(self) -> str:
        return "Searches the web using DuckDuckGo to find current information not in the documents. Use this when the user asks about current events, latest news, or information not found in uploaded documents."

    def get_parameters(self) -> List[ToolParameter]:
        return [
            ToolParameter(
                name="query",
                type="string",
                description="Search query to look up on the web",
                required=True
            ),
            ToolParameter(
                name="max_results",
                type="number",
                description="Maximum number of results to return (default: 5)",
                required=False,
                default=5
            )
        ]

    async def execute(self, query: str, max_results: int = 5, **kwargs) -> ToolResult:
        """Execute web search"""
        start_time = time.time()

        try:
            # Use DuckDuckGo Instant Answer API (no API key required)
            url = f"https://api.duckduckgo.com/"
            params = {
                "q": query,
                "format": "json",
                "no_html": 1,
                "skip_disambig": 1
            }

            async with aiohttp.ClientSession() as session:
                async with session.get(url, params=params, timeout=10) as response:
                    if response.status == 200:
                        data = await response.json()

                        # Extract relevant information
                        results = []

                        # Abstract (main answer)
                        if data.get("Abstract"):
                            results.append({
                                "title": data.get("Heading", "DuckDuckGo Answer"),
                                "snippet": data.get("Abstract"),
                                "url": data.get("AbstractURL")
                            })

                        # Related topics
                        for topic in data.get("RelatedTopics", [])[:max_results]:
                            if isinstance(topic, dict) and "Text" in topic:
                                results.append({
                                    "title": topic.get("Text", "").split(" - ")[0] if " - " in topic.get("Text", "") else "Related",
                                    "snippet": topic.get("Text"),
                                    "url": topic.get("FirstURL")
                                })

                        execution_time = (time.time() - start_time) * 1000

                        if results:
                            logger.info(f"Web search: {query} - Found {len(results)} results")
                            return ToolResult(
                                tool_name=self.name,
                                success=True,
                                result={
                                    "query": query,
                                    "results": results[:max_results],
                                    "count": len(results)
                                },
                                execution_time_ms=execution_time
                            )
                        else:
                            return ToolResult(
                                tool_name=self.name,
                                success=True,
                                result={
                                    "query": query,
                                    "results": [],
                                    "count": 0,
                                    "message": "No results found"
                                },
                                execution_time_ms=execution_time
                            )
                    else:
                        raise Exception(f"HTTP {response.status}")

        except Exception as e:
            logger.error(f"Web search error: {e}")
            return ToolResult(
                tool_name=self.name,
                success=False,
                result=None,
                error=f"Web search failed: {str(e)}"
            )
