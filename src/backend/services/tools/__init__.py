"""
Tools package for AI agent capabilities
"""
from .base import BaseTool, ToolParameter, ToolResult, ToolDefinition
from .calculator import CalculatorTool
from .web_search import WebSearchTool
from .document_stats import DocumentStatsTool

__all__ = [
    "BaseTool",
    "ToolParameter",
    "ToolResult",
    "ToolDefinition",
    "CalculatorTool",
    "WebSearchTool",
    "DocumentStatsTool",
]
