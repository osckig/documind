<script>
  import { createEventDispatcher, afterUpdate } from 'svelte';
  import { marked } from 'marked';

  export let messages = [];
  export let loading = false;

  const dispatch = createEventDispatcher();

  let input = '';
  let chatContainer;

  afterUpdate(() => {
    if (chatContainer) {
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
  });

  function handleSubmit(event) {
    event.preventDefault();
    if (input.trim() && !loading) {
      dispatch('send', { message: input.trim() });
      input = '';
    }
  }

  function clearChat() {
    dispatch('clear');
  }

  function renderMarkdown(content) {
    return marked(content);
  }
</script>

<div class="card flex flex-col h-[calc(100vh-16rem)]">
  <!-- Chat Header -->
  <div class="flex items-center justify-between pb-4 border-b border-gray-200">
    <div>
      <h3 class="font-semibold text-gray-900">AI Assistant</h3>
      <p class="text-sm text-gray-500">Ask questions about your documents</p>
    </div>
    <button
      on:click={clearChat}
      class="btn btn-secondary text-sm"
      disabled={messages.length === 0}
    >
      Clear Chat
    </button>
  </div>

  <!-- Messages Container -->
  <div bind:this={chatContainer} class="flex-1 overflow-y-auto py-4 space-y-4">
    {#if messages.length === 0}
      <div class="text-center py-12 text-gray-500">
        <p class="text-4xl mb-4">💬</p>
        <p class="text-lg font-medium">Start a conversation</p>
        <p class="text-sm">Ask questions about your documents and get AI-powered answers</p>

        <div class="mt-8 text-left max-w-md mx-auto space-y-2">
          <p class="font-medium text-gray-700">Example questions:</p>
          <ul class="text-sm space-y-1">
            <li>• "What are the key points in my latest invoice?"</li>
            <li>• "Summarize the contract terms"</li>
            <li>• "Find all documents mentioning payment schedules"</li>
            <li>• "What is 2 + 2?" (uses calculator tool 🧮)</li>
            <li>• "How many documents do I have?" (uses document stats tool 📊)</li>
          </ul>
        </div>
      </div>
    {/if}

    {#each messages as message, index}
      <div class="message {message.role === 'user' ? 'user-message' : 'assistant-message'} fade-in">
        <div class="flex items-start space-x-3">
          <div class="message-icon">
            {message.role === 'user' ? '👤' : '🤖'}
          </div>

          <div class="flex-1">
            <!-- Tool Usage Badge -->
            {#if message.tool_used}
              <div class="tool-badge mb-2">
                <span class="tool-icon">
                  {#if message.tool_used === 'calculator'}
                    🧮
                  {:else if message.tool_used === 'web_search'}
                    🌐
                  {:else if message.tool_used === 'document_stats'}
                    📊
                  {:else}
                    🔧
                  {/if}
                </span>
                <span class="tool-name">Used tool: {message.tool_used}</span>
              </div>
            {/if}

            <div class="message-content">
              {@html renderMarkdown(message.content)}
            </div>

            {#if message.sources && message.sources.length > 0}
              <div class="mt-3 sources">
                <p class="text-xs font-semibold text-gray-700 mb-2">Sources:</p>
                <div class="space-y-2">
                  {#each message.sources as source}
                    <div class="source-card">
                      <div class="flex items-center space-x-2 mb-1">
                        <span class="text-sm">📄</span>
                        <span class="font-medium text-sm">{source.filename}</span>
                        {#if source.page_number}
                          <span class="text-xs text-gray-500">Page {source.page_number}</span>
                        {/if}
                      </div>
                      <p class="text-xs text-gray-600 line-clamp-2">
                        {source.content_preview}
                      </p>
                    </div>
                  {/each}
                </div>
              </div>
            {/if}
          </div>
        </div>
      </div>
    {/each}

    {#if loading}
      <div class="message assistant-message fade-in">
        <div class="flex items-start space-x-3">
          <div class="message-icon">🤖</div>
          <div class="flex-1">
            <div class="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        </div>
      </div>
    {/if}
  </div>

  <!-- Input Area -->
  <form on:submit={handleSubmit} class="pt-4 border-t border-gray-200">
    <div class="flex space-x-3">
      <input
        type="text"
        bind:value={input}
        placeholder="Ask a question..."
        class="input flex-1"
        disabled={loading}
      />
      <button
        type="submit"
        class="btn btn-primary"
        disabled={loading || !input.trim()}
      >
        {loading ? 'Sending...' : 'Send'}
      </button>
    </div>
  </form>
</div>

<style>
  .message {
    padding: 1rem;
    border-radius: 0.5rem;
  }

  .user-message {
    background-color: #dbeafe;
    margin-left: 2rem;
  }

  .assistant-message {
    background-color: #f3f4f6;
    margin-right: 2rem;
  }

  .message-icon {
    font-size: 1.5rem;
    width: 2rem;
    height: 2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .message-content {
    color: #1f2937;
    line-height: 1.6;
  }

  .message-content :global(p) {
    margin-bottom: 0.5rem;
  }

  .message-content :global(code) {
    background-color: rgba(0, 0, 0, 0.1);
    padding: 0.125rem 0.25rem;
    border-radius: 0.25rem;
    font-size: 0.875rem;
  }

  .message-content :global(pre) {
    background-color: rgba(0, 0, 0, 0.1);
    padding: 0.75rem;
    border-radius: 0.375rem;
    overflow-x: auto;
    margin: 0.5rem 0;
  }

  .sources {
    background-color: rgba(255, 255, 255, 0.6);
    padding: 0.75rem;
    border-radius: 0.375rem;
  }

  .source-card {
    background-color: white;
    padding: 0.5rem;
    border-radius: 0.25rem;
    border: 1px solid #e5e7eb;
  }

  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .tool-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.25rem 0.75rem;
    background-color: #dbeafe;
    border: 1px solid #93c5fd;
    border-radius: 0.375rem;
    font-size: 0.75rem;
    color: #1e40af;
  }

  .tool-icon {
    font-size: 1rem;
  }

  .tool-name {
    font-weight: 600;
  }

  .typing-indicator {
    display: flex;
    space-x: 4px;
    padding: 1rem;
  }

  .typing-indicator span {
    width: 8px;
    height: 8px;
    background-color: #6b7280;
    border-radius: 50%;
    display: inline-block;
    animation: typing 1.4s infinite;
    margin-right: 4px;
  }

  .typing-indicator span:nth-child(2) {
    animation-delay: 0.2s;
  }

  .typing-indicator span:nth-child(3) {
    animation-delay: 0.4s;
  }

  @keyframes typing {
    0%, 60%, 100% {
      transform: translateY(0);
      opacity: 0.7;
    }
    30% {
      transform: translateY(-10px);
      opacity: 1;
    }
  }
</style>
