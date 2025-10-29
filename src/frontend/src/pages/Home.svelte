<script>
  import { onMount } from 'svelte';
  import { analytics } from '../services/api.js';
  import { Link } from 'svelte-routing';

  let overview = null;
  let loading = true;

  onMount(async () => {
    try {
      overview = await analytics.getOverview();
    } catch (error) {
      console.error('Failed to load overview:', error);
    } finally {
      loading = false;
    }
  });

  function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }
</script>

<div class="max-w-7xl mx-auto">
  <div class="mb-8">
    <h2 class="text-3xl font-bold text-gray-900 mb-2">
      Welcome to AI Document Search
    </h2>
    <p class="text-gray-600">
      Your intelligent document management system for SMEs
    </p>
  </div>

  {#if loading}
    <div class="flex justify-center py-12">
      <div class="spinner"></div>
    </div>
  {:else if overview}
    <!-- Stats Grid -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <!-- Documents Card -->
      <div class="card">
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-semibold text-gray-700">Documents</h3>
          <span class="text-3xl">📚</span>
        </div>
        <div class="space-y-2">
          <div>
            <p class="text-3xl font-bold text-primary-600">{overview.documents.total}</p>
            <p class="text-sm text-gray-500">Total documents</p>
          </div>
          <div class="text-sm text-gray-600">
            <p>{formatBytes(overview.documents.total_size)}</p>
            <p>{overview.documents.total_words.toLocaleString()} words</p>
          </div>
        </div>
      </div>

      <!-- Searches Card -->
      <div class="card">
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-semibold text-gray-700">Searches</h3>
          <span class="text-3xl">🔍</span>
        </div>
        <div class="space-y-2">
          <div>
            <p class="text-3xl font-bold text-primary-600">{overview.searches.total}</p>
            <p class="text-sm text-gray-500">Total searches</p>
          </div>
          <div class="text-sm text-gray-600">
            <p>Avg: {overview.searches.avg_time_ms.toFixed(0)}ms</p>
          </div>
        </div>
      </div>

      <!-- Chat Card -->
      <div class="card">
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-semibold text-gray-700">Conversations</h3>
          <span class="text-3xl">💬</span>
        </div>
        <div class="space-y-2">
          <div>
            <p class="text-3xl font-bold text-primary-600">{overview.chat.total_messages}</p>
            <p class="text-sm text-gray-500">Total messages</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="card">
      <h3 class="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h3>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link to="/upload" class="quick-action">
          <span class="text-3xl mb-2">📤</span>
          <h4 class="font-semibold">Upload Documents</h4>
          <p class="text-sm text-gray-600">Add new documents to your collection</p>
        </Link>

        <Link to="/search" class="quick-action">
          <span class="text-3xl mb-2">🔍</span>
          <h4 class="font-semibold">Search & Chat</h4>
          <p class="text-sm text-gray-600">Find information and ask questions</p>
        </Link>

        <Link to="/analytics" class="quick-action">
          <span class="text-3xl mb-2">📊</span>
          <h4 class="font-semibold">View Analytics</h4>
          <p class="text-sm text-gray-600">Analyze your document usage</p>
        </Link>
      </div>
    </div>
  {/if}
</div>

<style>
  :global(.quick-action) {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: 2rem;
    border: 2px solid #e5e7eb;
    border-radius: 0.5rem;
    text-decoration: none;
    color: inherit;
    transition: all 0.2s;
  }

  :global(.quick-action:hover) {
    border-color: #0284c7;
    background-color: #f0f9ff;
    transform: translateY(-2px);
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  }
</style>
