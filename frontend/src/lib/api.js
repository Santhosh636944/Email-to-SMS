import axios from 'axios';

// Shared axios instance. Vite proxies /api -> http://localhost:5000
const api = axios.create({
  baseURL: '/api',
  timeout: 20000,
});

export const apiBase = '/api';

export default api;
