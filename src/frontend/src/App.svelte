<script>
  import { Router, Route } from 'svelte-routing';
  import { onMount } from 'svelte';
  import { auth } from './services/api.js';

  import Header from './components/common/Header.svelte';
  import Sidebar from './components/common/Sidebar.svelte';

  import Home from './pages/Home.svelte';
  import Search from './pages/Search.svelte';
  import Upload from './pages/Upload.svelte';
  import Analytics from './pages/Analytics.svelte';
  import Login from './pages/Login.svelte';

  let isAuthenticated = false;
  let user = null;
  let loading = true;

  onMount(async () => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        user = await auth.getMe();
        isAuthenticated = true;
      } catch (error) {
        console.error('Auth error:', error);
        localStorage.removeItem('token');
      }
    }
    loading = false;
  });

  function handleLogin(userData) {
    user = userData;
    isAuthenticated = true;
  }

  function handleLogout() {
    localStorage.removeItem('token');
    isAuthenticated = false;
    user = null;
    window.location.href = '/login';
  }
</script>

<Router>
  <div class="app">
    {#if loading}
      <div class="flex items-center justify-center h-screen">
        <div class="spinner"></div>
      </div>
    {:else if !isAuthenticated}
      <Route path="/login" component={Login} />
      <Route path="*">
        <Login on:login={handleLogin} />
      </Route>
    {:else}
      <div class="flex h-screen bg-gray-50">
        <Sidebar />
        <div class="flex-1 flex flex-col overflow-hidden">
          <Header {user} on:logout={handleLogout} />
          <main class="flex-1 overflow-y-auto p-6">
            <Route path="/" component={Home} />
            <Route path="/search" component={Search} />
            <Route path="/upload" component={Upload} />
            <Route path="/analytics" component={Analytics} />
          </main>
        </div>
      </div>
    {/if}
  </div>
</Router>

<style>
  .app {
    min-height: 100vh;
  }
</style>
