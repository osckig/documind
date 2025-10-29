<script>
  import { createEventDispatcher } from 'svelte';

  export let user = null;

  const dispatch = createEventDispatcher();

  function logout() {
    dispatch('logout');
  }
</script>

<header class="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
  <div class="flex items-center justify-between">
    <div class="flex items-center space-x-4">
      <h1 class="text-2xl font-bold text-primary-600">
        AI Document Search
      </h1>
      <span class="text-sm text-gray-500">for Kenyan SMEs</span>
    </div>

    <div class="flex items-center space-x-4">
      {#if user}
        <div class="flex items-center space-x-3">
          <div class="text-right">
            <p class="text-sm font-medium text-gray-700">{user.full_name || user.username}</p>
            <p class="text-xs text-gray-500">{user.email}</p>
          </div>
          <button
            on:click={logout}
            class="btn btn-secondary text-sm"
          >
            Logout
          </button>
        </div>
      {/if}
    </div>
  </div>
</header>

<style>
  header {
    position: sticky;
    top: 0;
    z-index: 10;
  }
</style>
