<script>
  import { onMount } from 'svelte';
  import { analytics } from '../services/api.js';

  let overview = null;
  let trends = null;
  let popularQueries = null;
  let documentTypes = null;
  let performance = null;
  let loading = true;

  onMount(async () => {
    try {
      [overview, trends, popularQueries, documentTypes, performance] = await Promise.all([
        analytics.getOverview(),
        analytics.getSearchTrends(30),
        analytics.getPopularQueries(10),
        analytics.getDocumentTypes(),
        analytics.getPerformance()
      ]);
    } catch (error) {
      console.error('Failed to load analytics:', error);
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
  <div class="mb-6">
    <h2 class="text-3xl font-bold text-gray-900 mb-2">Analytics Dashboard</h2>
    <p class="text-gray-600">Insights into your document collection and search patterns</p>
  </div>

  {#if loading}
    <div class="flex justify-center py-12">
      <div class="spinner"></div>
    </div>
  {:else}
    <!-- Overview Stats -->
    {#if overview}
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div class="card">
          <h3 class="text-lg font-semibold text-gray-700 mb-3">Documents</h3>
          <div class="space-y-2">
            <p class="text-3xl font-bold text-primary-600">{overview.documents.total}</p>
            <div class="text-sm text-gray-600 space-y-1">
              <p>{formatBytes(overview.documents.total_size)} total</p>
              <p>{overview.documents.total_words.toLocaleString()} words</p>
              <p>{overview.documents.recent} added this week</p>
            </div>
          </div>
        </div>

        <div class="card">
          <h3 class="text-lg font-semibold text-gray-700 mb-3">Searches</h3>
          <div class="space-y-2">
            <p class="text-3xl font-bold text-primary-600">{overview.searches.total}</p>
            <div class="text-sm text-gray-600 space-y-1">
              <p>Avg: {overview.searches.avg_time_ms.toFixed(0)}ms</p>
              <p>{overview.searches.recent} this week</p>
            </div>
          </div>
        </div>

        <div class="card">
          <h3 class="text-lg font-semibold text-gray-700 mb-3">Chat Messages</h3>
          <div class="space-y-2">
            <p class="text-3xl font-bold text-primary-600">{overview.chat.total_messages}</p>
            <div class="text-sm text-gray-600">
              <p>Conversations with AI</p>
            </div>
          </div>
        </div>
      </div>
    {/if}

    <!-- Popular Queries -->
    {#if popularQueries && popularQueries.queries.length > 0}
      <div class="card mb-8">
        <h3 class="text-xl font-semibold text-gray-900 mb-4">Most Popular Searches</h3>
        <div class="space-y-3">
          {#each popularQueries.queries as query, index}
            <div class="flex items-center justify-between p-3 bg-gray-50 rounded">
              <div class="flex items-center space-x-3">
                <span class="text-2xl font-bold text-primary-600">#{index + 1}</span>
                <div>
                  <p class="font-medium text-gray-900">{query.query}</p>
                  <p class="text-sm text-gray-600">
                    {query.count} searches • Avg {query.avg_time_ms.toFixed(0)}ms
                  </p>
                </div>
              </div>
              <div class="text-right">
                <div class="text-sm text-gray-500">{query.count}x</div>
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Document Types -->
    {#if documentTypes && documentTypes.types.length > 0}
      <div class="card mb-8">
        <h3 class="text-xl font-semibold text-gray-900 mb-4">Document Types</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          {#each documentTypes.types as type}
            <div class="p-4 bg-gray-50 rounded-lg">
              <div class="flex items-center justify-between mb-2">
                <span class="text-lg font-semibold uppercase">{type.file_type}</span>
                <span class="text-2xl font-bold text-primary-600">{type.count}</span>
              </div>
              <p class="text-sm text-gray-600">{formatBytes(type.total_size)}</p>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Performance Metrics -->
    {#if performance}
      <div class="card">
        <h3 class="text-xl font-semibold text-gray-900 mb-4">Performance Metrics</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 class="font-medium text-gray-700 mb-3">Search Performance</h4>
            <div class="space-y-2 text-sm">
              <div class="flex justify-between">
                <span class="text-gray-600">Average:</span>
                <span class="font-medium">{performance.search.avg_time_ms.toFixed(0)}ms</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">Fastest:</span>
                <span class="font-medium text-green-600">{performance.search.min_time_ms.toFixed(0)}ms</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">Slowest:</span>
                <span class="font-medium text-red-600">{performance.search.max_time_ms.toFixed(0)}ms</span>
              </div>
            </div>
          </div>

          <div>
            <h4 class="font-medium text-gray-700 mb-3">Chat Performance</h4>
            <div class="space-y-2 text-sm">
              <div class="flex justify-between">
                <span class="text-gray-600">Average:</span>
                <span class="font-medium">{performance.chat.avg_time_ms.toFixed(0)}ms</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">Fastest:</span>
                <span class="font-medium text-green-600">{performance.chat.min_time_ms.toFixed(0)}ms</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">Slowest:</span>
                <span class="font-medium text-red-600">{performance.chat.max_time_ms.toFixed(0)}ms</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    {/if}
  {/if}
</div>
