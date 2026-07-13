import axios from 'axios';

// ✅ Get API URL from environment - THIS IS THE ONLY URL YOUR FRONTEND SHOULD USE
const API_URL = import.meta.env.VITE_API_URL || '';
console.log('🔍 API URL:', API_URL);

// ✅ Add /api to the base URL
const baseURL = API_URL ? `${API_URL}/api` : '/api';
console.log('🔍 Base URL with /api:', baseURL);

// ✅ Create axios instance with the correct base URL
const api = axios.create({
  baseURL: baseURL,  // This will be: https://chat-application-backend-it24.onrender.com/api
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// ✅ Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log(`📡 Request: ${config.method.toUpperCase()} ${config.baseURL}${config.url}`);
    return config;
  },
  (error) => Promise.reject(error)
);

// ✅ Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('❌ API Error:', error.response?.status, error.response?.data);
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;