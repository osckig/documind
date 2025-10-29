<script>
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();

  let query = '';
  let searchType = 'semantic';

  function handleSubmit(event) {
    event.preventDefault();
    if (query.trim()) {
      dispatch('search', { query: query.trim(), searchType });
    }
  }
</script>

<div class="card">
  <form on:submit={handleSubmit} class="space-y-4">
    <div>
      <input
        type="text"
        bind:value={query}
        placeholder="Search your documents..."
        class="input text-lg"
        required
      />
    </div>

    <div class="flex items-center justify-between">
      <div class="flex space-x-4">
        <label class="flex items-center space-x-2">
          <input type="radio" bind:group={searchType} value="semantic" />
          <span class="text-sm">Semantic</span>
        </label>
        <label class="flex items-center space-x-2">
          <input type="radio" bind:group={searchType} value="keyword" />
          <span class="text-sm">Keyword</span>
        </label>
        <label class="flex items-center space-x-2">
          <input type="radio" bind:group={searchType} value="hybrid" />
          <span class="text-sm">Hybrid</span>
        </label>
      </div>

      <button type="submit" class="btn btn-primary">
        Search
      </button>
    </div>
  </form>
</div>

<style>
  input[type="radio"] {
    accent-color: #0284c7;
  }
</style>
