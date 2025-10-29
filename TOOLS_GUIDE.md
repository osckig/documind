# Tool System Guide

The AI Document Search system now includes a powerful tool system that allows the AI to perform actions beyond document search, similar to Verba (Elysia) from Weaviate.

## Overview

The system can intelligently choose and use tools when answering questions:

- **🧮 Calculator Tool**: Performs mathematical calculations
- **📊 Document Stats Tool**: Gets statistics about uploaded documents
- **🌐 Web Search Tool**: Searches the web for current information

## How It Works

1. **User asks a question**: "What is 2 + 2?"
2. **System detects tool need**: Recognizes this requires the calculator
3. **Tool executes**: Calculator computes the result
4. **AI provides answer**: "The answer is 4" with tool badge shown

## Tool Usage Examples

### Calculator Tool 🧮

**Triggers**: Questions containing calculations or math expressions

**Examples:**
```
User: "What is 2 + 2?"
Response: Uses calculator tool → "The answer is 4"

User: "Calculate 15 * 8 + 10"
Response: Uses calculator tool → "15 * 8 + 10 = 130"

User: "What is 2 ** 8?"
Response: Uses calculator tool → "2 to the power of 8 is 256"
```

**Supported Operations:**
- Addition: `+`
- Subtraction: `-`
- Multiplication: `*`
- Division: `/`
- Exponentiation: `**`
- Parentheses: `()`
- Modulo: `%`
- Floor division: `//`

### Document Stats Tool 📊

**Triggers**: Questions about uploaded documents

**Examples:**
```
User: "How many documents do I have?"
Response: Uses document_stats tool → "You have 5 documents uploaded"

User: "What files are uploaded?"
Response: Uses document_stats tool → Lists all documents with details

User: "Show me document count"
Response: Uses document_stats tool → Shows total count and types
```

**Information Provided:**
- Total number of documents
- Total number of chunks
- File types distribution
- List of documents with details (when requested)

### Web Search Tool 🌐

**Triggers**: Questions about current events or latest information

**Examples:**
```
User: "Search web for latest AI news"
Response: Uses web_search tool → Returns recent AI news

User: "What's happening with OpenAI?"
Response: Uses web_search tool → Searches and summarizes results
```

**Note**: Uses DuckDuckGo API (no API key required)

## How to Use Tools

### As a User

Simply ask natural questions:

✅ **Good Examples:**
- "What is 5 times 8?"
- "Calculate 100 / 4"
- "How many PDFs do I have?"
- "List all my documents"

The system automatically:
1. Detects which tool to use
2. Executes the tool
3. Shows a tool badge (🧮, 📊, or 🌐)
4. Provides the answer

### Tool Detection

Tools are triggered by keywords in your question:

| Tool | Keywords |
|------|----------|
| Calculator | calculate, compute, what is, plus, minus, times, divided, +, -, *, / |
| Document Stats | how many documents, how many files, what documents, list documents |
| Web Search | search web, latest, current, recent news |

## Architecture

### Tool Structure

```
services/tools/
├── base.py              # Base classes for all tools
├── calculator.py        # Calculator tool
├── web_search.py        # Web search tool
├── document_stats.py    # Document statistics tool
└── manager.py           # Tool manager (coordinates tool usage)
```

### Adding New Tools

1. **Create a new tool file** in `src/backend/services/tools/`

```python
from typing import List
from .base import BaseTool, ToolParameter, ToolResult

class MyCustomTool(BaseTool):
    def get_name(self) -> str:
        return "my_tool"

    def get_description(self) -> str:
        return "Description of what the tool does"

    def get_parameters(self) -> List[ToolParameter]:
        return [
            ToolParameter(
                name="param1",
                type="string",
                description="What this parameter does",
                required=True
            )
        ]

    async def execute(self, param1: str, **kwargs) -> ToolResult:
        try:
            # Your tool logic here
            result = do_something(param1)

            return ToolResult(
                tool_name=self.name,
                success=True,
                result=result
            )
        except Exception as e:
            return ToolResult(
                tool_name=self.name,
                success=False,
                result=None,
                error=str(e)
            )
```

2. **Register the tool** in `search_service_local.py`:

```python
from services.tools.my_custom_tool import MyCustomTool

# In __init__:
self.tool_manager.register_tool(MyCustomTool())
```

3. **Add trigger logic** in the `rag_query` method:

```python
# In rag_query method, add detection:
elif any(keyword in question_lower for keyword in ['trigger', 'words']):
    tool_result = await self.tool_manager.execute_tool('my_tool', {'param1': value})
    tool_used = 'my_tool'
```

4. **Add frontend icon** in `ChatInterface.svelte`:

```svelte
{:else if message.tool_used === 'my_tool'}
  🔧
```

## Tool Ideas to Implement

### 1. Date/Time Tool ⏰
```python
# Returns current date/time or calculates date differences
"What time is it?"
"What day is today?"
"How many days until December 25?"
```

### 2. Unit Converter Tool 📏
```python
# Converts between units
"Convert 100 USD to KES"
"How many kilometers is 5 miles?"
"Convert 25°C to Fahrenheit"
```

### 3. Text Analyzer Tool 📝
```python
# Analyzes text from documents
"Count words in my latest document"
"What's the sentiment of this document?"
"Extract all dates from uploaded files"
```

### 4. Export Tool 💾
```python
# Exports data in various formats
"Export search results to CSV"
"Download document summary as PDF"
```

### 5. Translation Tool 🌍
```python
# Translates text between languages
"Translate this to Swahili"
"What does 'habari' mean in English?"
```

### 6. Database Query Tool 🗄️
```python
# Queries the SQLite database
"Show me searches from last week"
"Which document has the most chunks?"
```

## Frontend Integration

Tools are automatically displayed in the chat interface:

```svelte
<!-- Tool badge appears above the message -->
{#if message.tool_used}
  <div class="tool-badge">
    <span class="tool-icon">🧮</span>
    <span>Used tool: calculator</span>
  </div>
{/if}
```

**Styling:**
- Blue background with border
- Icon + tool name
- Appears only for assistant messages
- Shows which tool was used

## Testing Tools

### Test Calculator:
1. Start the system
2. Go to Chat mode
3. Ask: "What is 2 + 2?"
4. Look for calculator icon 🧮

### Test Document Stats:
1. Upload some documents first
2. Ask: "How many documents do I have?"
3. Look for stats icon 📊

### Test Web Search:
1. Ask: "Search web for Python programming"
2. Look for web icon 🌐
3. (Requires internet connection)

## Configuration

### Enable/Disable Tools

In `search_service_local.py`:

```python
# Disable tools for a specific query
response = await self.rag_query(
    question,
    use_tools=False  # Disable tools
)
```

### Adjust Tool Triggers

Modify the keyword lists in `rag_query` method:

```python
# Make calculator more/less sensitive
if any(keyword in question_lower for keyword in [
    'calculate', 'compute', 'what is',  # Original
    'solve', 'equation', 'math'         # Add more
]):
```

## Performance

**Tool Execution Times:**
- Calculator: < 1ms
- Document Stats: < 50ms
- Web Search: 500-2000ms (depends on network)

**Impact on Response Time:**
- Without tools: ~2-5s (Ollama generation)
- With calculator: +1ms (negligible)
- With web search: +1-2s (network delay)

## Security

### Calculator Tool
- ✅ Safe evaluation (no `eval()` or `exec()`)
- ✅ Only allows math operations
- ✅ No file system access
- ✅ No network access

### Web Search Tool
- ✅ Read-only (no data sent)
- ✅ Uses DuckDuckGo API (privacy-focused)
- ✅ Results are filtered

### Document Stats Tool
- ✅ Only accesses user's own documents
- ✅ Read-only operation
- ✅ No deletion or modification

## Troubleshooting

### Tool Not Being Used

**Problem**: Ask "what is 2 + 2?" but no tool is used

**Solutions:**
1. Check trigger keywords are in the question
2. Verify tool is registered in `__init__`
3. Check logs for tool detection
4. Ensure `use_tools=True` (default)

### Tool Execution Failed

**Problem**: Tool badge shows but answer is error

**Solutions:**
1. Check tool logs in backend console
2. Verify tool parameters are correct
3. For web search: check internet connection
4. For document stats: ensure documents are uploaded

### Tool Badge Not Showing

**Problem**: Tool executes but no badge appears

**Solutions:**
1. Check `tool_used` is passed from backend
2. Verify frontend code includes tool badge section
3. Check CSS styles for `.tool-badge`

## Best Practices

### 1. Keep Tools Simple
- Each tool should do one thing well
- Avoid complex logic in tools
- Use clear, descriptive names

### 2. Handle Errors Gracefully
- Always return `ToolResult`
- Provide helpful error messages
- Don't crash on invalid input

### 3. Make Tools Fast
- Cache results when possible
- Use async operations
- Avoid long-running operations

### 4. Document Everything
- Clear descriptions
- Example usage
- Parameter explanations

## Future Enhancements

### Smart Tool Selection
Instead of keyword matching, use the LLM to decide which tool to use:

```python
# Ask Ollama which tool to use
tool_prompt = f"Which tool should I use for: {question}?"
tool_choice = ollama.generate(prompt=tool_prompt)
```

### Tool Chaining
Allow using multiple tools in sequence:

```python
# Use calculator, then document stats
"Calculate 2+2, then show me that many documents"
```

### User-Defined Tools
Let users create custom tools via UI:

```python
# Define tool in settings
{
  "name": "my_tool",
  "command": "python script.py {input}",
  "triggers": ["run script"]
}
```

## Conclusion

The tool system makes your AI assistant more powerful and versatile. It can now:
- ✅ Perform calculations
- ✅ Search the web
- ✅ Analyze your documents
- ✅ And more with custom tools!

Tools are automatically used when needed, making the experience seamless for users.

---

**Need help?** Check the logs or ask: "How do I use tools?"
