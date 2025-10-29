"""
Base tool classes for the AI agent system
"""
from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
import logging

logger = logging.getLogger(__name__)


class ToolParameter(BaseModel):
    """Parameter definition for a tool"""
    name: str
    type: str  # "string", "number", "boolean", "object", "array"
    description: str
    required: bool = True
    default: Optional[Any] = None


class ToolDefinition(BaseModel):
    """Definition of a tool that the AI can use"""
    name: str
    description: str
    parameters: List[ToolParameter]
    examples: Optional[List[str]] = None


class ToolResult(BaseModel):
    """Result from tool execution"""
    tool_name: str
    success: bool
    result: Any
    error: Optional[str] = None
    execution_time_ms: Optional[float] = None


class BaseTool(ABC):
    """Base class for all tools"""

    def __init__(self):
        self.name = self.get_name()
        self.description = self.get_description()
        self.parameters = self.get_parameters()

    @abstractmethod
    def get_name(self) -> str:
        """Return the tool name"""
        pass

    @abstractmethod
    def get_description(self) -> str:
        """Return the tool description"""
        pass

    @abstractmethod
    def get_parameters(self) -> List[ToolParameter]:
        """Return the tool parameters"""
        pass

    @abstractmethod
    async def execute(self, **kwargs) -> ToolResult:
        """Execute the tool with given parameters"""
        pass

    def to_definition(self) -> ToolDefinition:
        """Convert to tool definition"""
        return ToolDefinition(
            name=self.name,
            description=self.description,
            parameters=self.parameters
        )

    def get_prompt_description(self) -> str:
        """Get a description suitable for the LLM prompt"""
        param_desc = []
        for param in self.parameters:
            req = "required" if param.required else "optional"
            param_desc.append(f"  - {param.name} ({param.type}, {req}): {param.description}")

        params_str = "\n".join(param_desc)
        return f"""Tool: {self.name}
Description: {self.description}
Parameters:
{params_str}

Usage: Use this tool by responding with:
TOOL_USE: {self.name}
PARAMETERS: {{"param1": "value1", "param2": "value2"}}
"""
