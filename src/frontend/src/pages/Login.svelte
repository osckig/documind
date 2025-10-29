<script>
  import { createEventDispatcher } from 'svelte';
  import { auth } from '../services/api.js';

  const dispatch = createEventDispatcher();

  let isLogin = true;
  let username = '';
  let email = '';
  let password = '';
  let fullName = '';
  let loading = false;
  let error = null;

  async function handleSubmit(event) {
    event.preventDefault();
    loading = true;
    error = null;

    try {
      if (isLogin) {
        // Login
        const result = await auth.login(username, password);
        localStorage.setItem('token', result.access_token);

        // Get user data
        const user = await auth.getMe();
        dispatch('login', user);
      } else {
        // Register
        await auth.register({
          username,
          email,
          password,
          full_name: fullName || undefined
        });

        // Auto login after registration
        const result = await auth.login(username, password);
        localStorage.setItem('token', result.access_token);

        const user = await auth.getMe();
        dispatch('login', user);
      }
    } catch (err) {
      error = err.response?.data?.detail || (isLogin ? 'Login failed' : 'Registration failed');
      console.error('Auth error:', err);
    } finally {
      loading = false;
    }
  }

  function toggleMode() {
    isLogin = !isLogin;
    error = null;
  }
</script>

<div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100">
  <div class="max-w-md w-full mx-4">
    <div class="card">
      <!-- Header -->
      <div class="text-center mb-8">
        <h1 class="text-4xl font-bold text-primary-600 mb-2">
          AI Document Search
        </h1>
        <p class="text-gray-600">for Kenyan SMEs</p>
      </div>

      <!-- Error Message -->
      {#if error}
        <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      {/if}

      <!-- Form -->
      <form on:submit={handleSubmit} class="space-y-4">
        <div>
          <label for="username" class="block text-sm font-medium text-gray-700 mb-2">
            Username
          </label>
          <input
            id="username"
            type="text"
            bind:value={username}
            required
            class="input"
            placeholder="Enter your username"
          />
        </div>

        {#if !isLogin}
          <div>
            <label for="email" class="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              bind:value={email}
              required
              class="input"
              placeholder="Enter your email"
            />
          </div>

          <div>
            <label for="fullName" class="block text-sm font-medium text-gray-700 mb-2">
              Full Name (Optional)
            </label>
            <input
              id="fullName"
              type="text"
              bind:value={fullName}
              class="input"
              placeholder="Enter your full name"
            />
          </div>
        {/if}

        <div>
          <label for="password" class="block text-sm font-medium text-gray-700 mb-2">
            Password
          </label>
          <input
            id="password"
            type="password"
            bind:value={password}
            required
            class="input"
            placeholder="Enter your password"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          class="btn btn-primary w-full"
        >
          {loading ? 'Please wait...' : (isLogin ? 'Login' : 'Register')}
        </button>
      </form>

      <!-- Toggle Mode -->
      <div class="mt-6 text-center">
        <button
          type="button"
          on:click={toggleMode}
          class="text-primary-600 hover:text-primary-700 text-sm font-medium"
        >
          {isLogin ? "Don't have an account? Register" : 'Already have an account? Login'}
        </button>
      </div>

      <!-- Demo Info -->
      <div class="mt-8 p-4 bg-blue-50 rounded-lg">
        <p class="text-sm text-gray-700 font-medium mb-2">Demo System</p>
        <p class="text-xs text-gray-600">
          This is a demonstration RAG system for document search and Q&A.
          Create an account to get started.
        </p>
      </div>
    </div>
  </div>
</div>
