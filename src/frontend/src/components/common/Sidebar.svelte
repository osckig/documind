<script>
  import { Link } from 'svelte-routing';

  let currentPath = window.location.pathname;

  const navItems = [
    { path: '/', label: 'Home', icon: '🏠' },
    { path: '/search', label: 'Search & Chat', icon: '🔍' },
    { path: '/upload', label: 'Upload', icon: '📤' },
    { path: '/analytics', label: 'Analytics', icon: '📊' },
  ];

  function isActive(path) {
    return currentPath === path;
  }
</script>

<aside class="w-64 bg-white border-r border-gray-200">
  <nav class="p-4 space-y-2">
    {#each navItems as item}
      <Link
        to={item.path}
        class="nav-item {isActive(item.path) ? 'active' : ''}"
        on:click={() => currentPath = item.path}
      >
        <span class="icon">{item.icon}</span>
        <span>{item.label}</span>
      </Link>
    {/each}
  </nav>

  <div class="p-4 mt-8 border-t border-gray-200">
    <div class="text-xs text-gray-500 space-y-1">
      <p class="font-semibold">Quick Stats</p>
      <p>Documents: Loading...</p>
      <p>Searches: Loading...</p>
    </div>
  </div>
</aside>

<style>
  aside {
    height: 100vh;
    overflow-y: auto;
  }

  :global(.nav-item) {
    display: flex;
    align-items: center;
    padding: 0.75rem 1rem;
    border-radius: 0.5rem;
    text-decoration: none;
    color: #4b5563;
    transition: all 0.2s;
  }

  :global(.nav-item:hover) {
    background-color: #f3f4f6;
  }

  :global(.nav-item.active) {
    background-color: #dbeafe;
    color: #0369a1;
    font-weight: 600;
  }

  .icon {
    font-size: 1.25rem;
    margin-right: 0.75rem;
  }
</style>
