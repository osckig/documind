<script>
  import { onMount } from 'svelte';
  import { search } from '../services/api.js';
  import SearchBar from '../components/search/SearchBar.svelte';
  import SearchResults from '../components/search/SearchResults.svelte';
  import ChatInterface from '../components/search/ChatInterface.svelte';

  let mode = 'chat'; // 'search' or 'chat'
  let loading = false;
  let error = null;

  // Search mode state
  let searchQuery = '';
  let searchResults = [];
  let searchType = 'semantic';

  // Chat mode state
  let messages = [];
  let sessionId = null;

  async function handleSearch(event) {
    const { query, searchType: type } = event.detail;
    searchQuery = query;
    searchType = type;
    loading = true;
    error = null;

    try {
      const result = await search.search(query, { searchType: type, limit: 10 });
      searchResults = result.results;
    } catch (err) {
      error = err.response?.data?.detail || 'Search failed';
      console.error('Search error:', err);
    } finally {
      loading = false;
    }
  }

  async function handleChatMessage(event) {
    const { message } = event.detail;

    // Add user message
    messages = [...messages, { role: 'user', content: message }];
    loading = true;
    error = null;

    try {
      const result = await search.chat(messages, sessionId);
      sessionId = result.session_id;

      // Add assistant response with tool information
      messages = [
        ...messages,
        {
          role: 'assistant',
          content: result.answer,
          sources: result.sources,
          tool_used: result.tool_used || null,
          tool_result: result.tool_result || null
        }
      ];
    } catch (err) {
      error = err.response?.data?.detail || 'Chat failed';
      console.error('Chat error:', err);
      // Remove the user message if request failed
      messages = messages.slice(0, -1);
    } finally {
      loading = false;
    }
  }

  function switchMode(newMode) {
    mode = newMode;
    error = null;
  }

  function clearChat() {
    messages = [];
    sessionId = null;
  }
</script>

<div class="max-w-7xl mx-auto">
  <div class="mb-6">
    <h2 class="text-3xl font-bold text-gray-900 mb-2">
      {mode === 'search' ? 'Document Search' : 'Chat with Documents'}
    </h2>
    <p class="text-gray-600">
      {mode === 'search'
        ? 'Search through your documents using semantic, keyword, or hybrid search'
        : 'Ask questions and get answers from your documents using AI'}
    </p>
  </div>

  <!-- Mode Toggle -->
  <div class="mb-6 flex space-x-2 bg-white p-2 rounded-lg inline-flex shadow">
    <button
      on:click={() => switchMode('chat')}
      class="px-4 py-2 rounded {mode === 'chat' ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-100'} transition-all"
    >
      💬 Chat Mode
    </button>
    <button
      on:click={() => switchMode('search')}
      class="px-4 py-2 rounded {mode === 'search' ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-100'} transition-all"
    >
      🔍 Search Mode
    </button>
  </div>

  {#if error}
    <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
      {error}
    </div>
  {/if}

  {#if mode === 'search'}
    <div class="space-y-6">
      <SearchBar on:search={handleSearch} />

      {#if loading}
        <div class="flex justify-center py-12">
          <div class="spinner"></div>
        </div>
      {:else if searchResults.length > 0}
        <SearchResults results={searchResults} query={searchQuery} />
      {:else if searchQuery}
        <div class="card text-center py-12">
          <p class="text-gray-500">No results found for "{searchQuery}"</p>
        </div>
      {/if}
    </div>
  {:else}
    <ChatInterface
      {messages}
      {loading}
      on:send={handleChatMessage}
      on:clear={clearChat}
    />
  {/if}
</div>

<style>
  /* Additional styles if needed */
</style>
