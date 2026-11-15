import axios from 'axios';

const baseURL = process.env.REACT_APP_API_URL
  || (process.env.NODE_ENV === 'production'
    ? 'https://e-commerce-platform-2-458q.onrender.com/api'
    : '/api');

// Create axios instance with base URL
const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor – attach Bearer token from localStorage
api.interceptors.request.use(
  (config) => {
    const userInfo = localStorage.getItem('userInfo');
    if (userInfo) {
      const { token } = JSON.parse(userInfo);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor – auto-logout on 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('userInfo');
      // Redirect to login if not already there
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

export const getCategories = async () => {
  const { data } = await api.get('/categories');
  const categories = Array.isArray(data) ? data : data?.categories;

  if (!Array.isArray(categories)) {
    throw new Error('Unexpected response from categories API');
  }

  return categories;
};
