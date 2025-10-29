import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const auth = {
  login: async (username, password) => {
    const formData = new FormData();
    formData.append('username', username);
    formData.append('password', password);
    const response = await api.post('/api/auth/login', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  register: async (userData) => {
    const response = await api.post('/api/auth/register', userData);
    return response.data;
  },

  getMe: async () => {
    const response = await api.get('/api/auth/me');
    return response.data;
  },
};

export const documents = {
  upload: async (file, onProgress) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/api/upload/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        if (onProgress) {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          onProgress(percentCompleted);
        }
      },
    });
    return response.data;
  },

  list: async (skip = 0, limit = 50) => {
    const response = await api.get('/api/upload/documents', {
      params: { skip, limit },
    });
    return response.data;
  },

  get: async (id) => {
    const response = await api.get(`/api/upload/documents/${id}`);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/api/upload/documents/${id}`);
    return response.data;
  },
};

export const search = {
  search: async (query, options = {}) => {
    const response = await api.post('/api/search/search', {
      query,
      limit: options.limit || 10,
      search_type: options.searchType || 'semantic',
      filters: options.filters,
      threshold: options.threshold,
    });
    return response.data;
  },

  ask: async (question, options = {}) => {
    const response = await api.post('/api/search/ask', {
      question,
      limit: options.limit || 5,
      filters: options.filters,
    });
    return response.data;
  },

  chat: async (messages, sessionId = null, filters = null) => {
    const response = await api.post('/api/search/chat', {
      messages,
      session_id: sessionId,
      filters,
    });
    return response.data;
  },

  getHistory: async (sessionId) => {
    const response = await api.get(`/api/search/history/${sessionId}`);
    return response.data;
  },
};

export const analytics = {
  getOverview: async () => {
    const response = await api.get('/api/analytics/overview');
    return response.data;
  },

  getSearchTrends: async (days = 30) => {
    const response = await api.get('/api/analytics/search-trends', {
      params: { days },
    });
    return response.data;
  },

  getPopularQueries: async (limit = 10) => {
    const response = await api.get('/api/analytics/popular-queries', {
      params: { limit },
    });
    return response.data;
  },

  getDocumentTypes: async () => {
    const response = await api.get('/api/analytics/document-types');
    return response.data;
  },

  getPerformance: async () => {
    const response = await api.get('/api/analytics/performance');
    return response.data;
  },
};

export default api;
