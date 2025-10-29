"""
Calculator tool for mathematical operations
"""
from typing import List
import ast
import operator
import time
import logging
from .base import BaseTool, ToolParameter, ToolResult

logger = logging.getLogger(__name__)


class CalculatorTool(BaseTool):
    """Tool for performing mathematical calculations"""

    def get_name(self) -> str:
        return "calculator"

    def get_description(self) -> str:
        return "Performs mathematical calculations. Supports basic arithmetic (+, -, *, /), exponentiation (**), and parentheses. Examples: '2 + 2', '(10 * 5) + 3', '2 ** 8'"

    def get_parameters(self) -> List[ToolParameter]:
        return [
            ToolParameter(
                name="expression",
                type="string",
                description="Mathematical expression to evaluate (e.g., '2 + 2', '10 * 5 + 3')",
                required=True
            )
        ]

    # Safe operators for evaluation
    SAFE_OPERATORS = {
        ast.Add: operator.add,
        ast.Sub: operator.sub,
        ast.Mult: operator.mul,
        ast.Div: operator.truediv,
        ast.Pow: operator.pow,
        ast.USub: operator.neg,
        ast.UAdd: operator.pos,
        ast.Mod: operator.mod,
        ast.FloorDiv: operator.floordiv,
    }

    def _safe_eval(self, node):
        """Safely evaluate mathematical expressions"""
        if isinstance(node, ast.Num):  # number
            return node.n
        elif isinstance(node, ast.BinOp):  # binary operation
            op_type = type(node.op)
            if op_type not in self.SAFE_OPERATORS:
                raise ValueError(f"Unsupported operation: {op_type.__name__}")
            left = self._safe_eval(node.left)
            right = self._safe_eval(node.right)
            return self.SAFE_OPERATORS[op_type](left, right)
        elif isinstance(node, ast.UnaryOp):  # unary operation
            op_type = type(node.op)
            if op_type not in self.SAFE_OPERATORS:
                raise ValueError(f"Unsupported operation: {op_type.__name__}")
            operand = self._safe_eval(node.operand)
            return self.SAFE_OPERATORS[op_type](operand)
        else:
            raise ValueError(f"Unsupported expression type: {type(node).__name__}")

    async def execute(self, expression: str, **kwargs) -> ToolResult:
        """Execute calculator operation"""
        start_time = time.time()

        try:
            # Clean the expression
            expression = expression.strip()

            # Parse the expression
            tree = ast.parse(expression, mode='eval')

            # Evaluate safely
            result = self._safe_eval(tree.body)

            execution_time = (time.time() - start_time) * 1000

            logger.info(f"Calculator: {expression} = {result}")

            return ToolResult(
                tool_name=self.name,
                success=True,
                result={
                    "expression": expression,
                    "answer": result,
                    "formatted": f"{expression} = {result}"
                },
                execution_time_ms=execution_time
            )

        except ZeroDivisionError:
            return ToolResult(
                tool_name=self.name,
                success=False,
                result=None,
                error="Division by zero error"
            )
        except SyntaxError as e:
            return ToolResult(
                tool_name=self.name,
                success=False,
                result=None,
                error=f"Invalid mathematical expression: {str(e)}"
            )
        except Exception as e:
            logger.error(f"Calculator error: {e}")
            return ToolResult(
                tool_name=self.name,
                success=False,
                result=None,
                error=f"Calculation error: {str(e)}"
            )
