"""
Tool manager for coordinating tool usage
"""
from typing import List, Dict, Any, Optional
import re
import json
import logging
from .base import BaseTool, ToolResult

logger = logging.getLogger(__name__)


class ToolManager:
    """Manages available tools and their execution"""

    def __init__(self):
        self.tools: Dict[str, BaseTool] = {}

    def register_tool(self, tool: BaseTool):
        """Register a tool"""
        self.tools[tool.name] = tool
        logger.info(f"Registered tool: {tool.name}")

    def get_tool(self, name: str) -> Optional[BaseTool]:
        """Get a tool by name"""
        return self.tools.get(name)

    def get_all_tools(self) -> List[BaseTool]:
        """Get all registered tools"""
        return list(self.tools.values())

    def get_tools_prompt(self) -> str:
        """Generate a prompt describing all available tools"""
        if not self.tools:
            return ""

        tool_descriptions = []
        for tool in self.tools.values():
            tool_descriptions.append(tool.get_prompt_description())

        prompt = f"""
You have access to the following tools to help answer questions:

{chr(10).join(tool_descriptions)}

When you need to use a tool, respond with:
TOOL_USE: <tool_name>
PARAMETERS: {{"param1": "value1", "param2": "value2"}}

The tool will be executed and you'll receive the results to incorporate in your answer.

IMPORTANT:
- Use tools when you need to perform calculations, search for current information, or get system data
- For questions like "what is 2 plus 2", use the calculator tool
- For questions about current events or latest information, use the web_search tool
- For questions about uploaded documents, use the document_stats tool
- After receiving tool results, provide a natural language answer incorporating the results
"""
        return prompt

    def parse_tool_use(self, text: str) -> Optional[tuple[str, Dict[str, Any]]]:
        """Parse tool usage from LLM response"""
        try:
            # Look for TOOL_USE and PARAMETERS patterns
            tool_pattern = r"TOOL_USE:\s*(\w+)"
            params_pattern = r"PARAMETERS:\s*(\{.*?\})"

            tool_match = re.search(tool_pattern, text, re.IGNORECASE)
            params_match = re.search(params_pattern, text, re.IGNORECASE | re.DOTALL)

            if tool_match:
                tool_name = tool_match.group(1).strip()

                # Parse parameters if provided
                parameters = {}
                if params_match:
                    try:
                        params_str = params_match.group(1).strip()
                        parameters = json.loads(params_str)
                    except json.JSONDecodeError as e:
                        logger.warning(f"Failed to parse tool parameters: {e}")

                return (tool_name, parameters)

            return None

        except Exception as e:
            logger.error(f"Error parsing tool use: {e}")
            return None

    async def execute_tool(self, tool_name: str, parameters: Dict[str, Any]) -> ToolResult:
        """Execute a tool with given parameters"""
        tool = self.get_tool(tool_name)

        if not tool:
            return ToolResult(
                tool_name=tool_name,
                success=False,
                result=None,
                error=f"Tool '{tool_name}' not found. Available tools: {', '.join(self.tools.keys())}"
            )

        try:
            result = await tool.execute(**parameters)
            return result
        except Exception as e:
            logger.error(f"Error executing tool {tool_name}: {e}")
            return ToolResult(
                tool_name=tool_name,
                success=False,
                result=None,
                error=f"Tool execution error: {str(e)}"
            )

    def format_tool_result_for_llm(self, result: ToolResult) -> str:
        """Format tool result for inclusion in LLM prompt"""
        if result.success:
            result_str = json.dumps(result.result, indent=2)
            return f"""
TOOL_RESULT:
Tool: {result.tool_name}
Status: Success
Result:
{result_str}

Use this information to provide a helpful answer to the user's question.
"""
        else:
            return f"""
TOOL_RESULT:
Tool: {result.tool_name}
Status: Failed
Error: {result.error}

The tool failed. Please inform the user and suggest alternatives if possible.
"""
