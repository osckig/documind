<script>
  export let results = [];
  export let query = '';

  function highlightText(text, query) {
    if (!query) return text;
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '<mark class="bg-yellow-200">$1</mark>');
  }

  function getScoreColor(score) {
    if (score >= 0.8) return 'text-green-600';
    if (score >= 0.6) return 'text-yellow-600';
    return 'text-gray-600';
  }

  function getScoreLabel(score) {
    if (score >= 0.8) return 'Highly Relevant';
    if (score >= 0.6) return 'Relevant';
    return 'Somewhat Relevant';
  }
</script>

<div class="space-y-4">
  <div class="flex items-center justify-between mb-4">
    <h3 class="text-lg font-semibold text-gray-900">
      Found {results.length} result{results.length !== 1 ? 's' : ''}
    </h3>
  </div>

  {#each results as result, index}
    <div class="card hover:shadow-lg transition-shadow slide-up" style="animation-delay: {index * 50}ms">
      <div class="flex items-start justify-between mb-3">
        <div class="flex-1">
          <div class="flex items-center space-x-2 mb-2">
            <span class="text-2xl">📄</span>
            <h4 class="font-semibold text-gray-900">{result.filename}</h4>
            {#if result.page_number}
              <span class="text-sm text-gray-500">Page {result.page_number}</span>
            {/if}
          </div>

          <div class="text-sm text-gray-600 space-y-1 mb-2">
            <p><strong>Type:</strong> {result.file_type.toUpperCase()}</p>
            <p><strong>Document ID:</strong> {result.document_id}</p>
          </div>
        </div>

        {#if result.score !== null && result.score !== undefined}
          <div class="text-right">
            <div class="text-2xl font-bold {getScoreColor(result.score)}">
              {(result.score * 100).toFixed(0)}%
            </div>
            <div class="text-xs {getScoreColor(result.score)}">
              {getScoreLabel(result.score)}
            </div>
          </div>
        {/if}
      </div>

      <div class="bg-gray-50 rounded p-4 text-sm text-gray-700 leading-relaxed">
        {@html highlightText(result.content, query)}
      </div>

      {#if result.metadata}
        <div class="mt-3 text-xs text-gray-500">
          <details>
            <summary class="cursor-pointer hover:text-gray-700">View metadata</summary>
            <pre class="mt-2 p-2 bg-gray-100 rounded overflow-x-auto">{JSON.stringify(result.metadata, null, 2)}</pre>
          </details>
        </div>
      {/if}
    </div>
  {/each}
</div>

<style>
  mark {
    padding: 2px 4px;
    border-radius: 2px;
  }
</style>
