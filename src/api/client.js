import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

const client = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor to add auth token
client.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle token refresh
client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          const response = await axios.post(`${API_URL}/auth/refresh`, {
            refreshToken
          });

          const { accessToken, refreshToken: newRefreshToken } = response.data.data;
          localStorage.setItem('accessToken', accessToken);
          localStorage.setItem('refreshToken', newRefreshToken);

          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return client(originalRequest);
        }
      } catch (refreshError) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        localStorage.removeItem('tenant');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    // Plan limit exceeded — dispatch upgrade event
    if (error.response?.status === 403 && error.response?.data?.upgrade) {
      window.dispatchEvent(new CustomEvent('upgrade-required', {
        detail: { error: error.response.data }
      }));
    }

    // Subscription expired — dispatch expired event
    if (error.response?.status === 402 && error.response?.data?.code === 'SUBSCRIPTION_EXPIRED') {
      window.dispatchEvent(new CustomEvent('subscription-expired', {
        detail: { error: error.response.data }
      }));
    }

    return Promise.reject(error);
  }
);

// Billing API
export const billingApi = {
  getSubscription: () => client.get('/billing/subscription'),
  createCheckout: (paystackPlanCode) => client.post('/billing/checkout', { paystackPlanCode }),
  getManageInfo: () => client.get('/billing/manage'),
  cancelSubscription: () => client.post('/billing/cancel'),
};

// Auth API
export const authApi = {
  register: (data) => client.post('/auth/register', data),
  login: (data) => client.post('/auth/login', data),
  refresh: (refreshToken) => client.post('/auth/refresh', { refreshToken }),
  resendVerification: () => client.post('/auth/resend-verification'),
  forgotPassword: (email) => client.post('/auth/forgot-password', { email }),
  resetPassword: (token, password) => client.post('/auth/reset-password', { token, password }),
  verifyEmail: (token) => client.post(`/auth/verify-email?token=${encodeURIComponent(token)}`),
};

// Products API
export const productsApi = {
  getAll: (params) => client.get('/products', { params }),
  getById: (id) => client.get(`/products/${id}`),
  create: (data) => client.post('/products', data),
  update: (id, data) => client.put(`/products/${id}`, data),
  delete: (id) => client.delete(`/products/${id}`),
  adjustStock: (id, adjustment) => client.post(`/products/${id}/adjust-stock`, { adjustment }),
  bulkUpload: (rows) => client.post('/products/bulk', { rows })
};

// Categories API
export const categoriesApi = {
  getAll: () => client.get('/categories'),
  getById: (id) => client.get(`/categories/${id}`),
  create: (data) => client.post('/categories', data),
  update: (id, data) => client.put(`/categories/${id}`, data),
  delete: (id) => client.delete(`/categories/${id}`)
};

// Sales API
export const salesApi = {
  getAll: (params) => client.get('/sales', { params }),
  getById: (id) => client.get(`/sales/${id}`),
  create: (data) => client.post('/sales', data)
};

// Reports API
export const reportsApi = {
  getDaily: (date) => client.get('/reports/daily', { params: { date } }),
  getWeekly: (date) => client.get('/reports/weekly', { params: { date } }),
  getProfit: (params) => client.get('/reports/profit', { params }),
  getDashboard: () => client.get('/reports/dashboard')
};

// Settings API
export const settingsApi = {
  get: () => client.get('/settings'),
  update: (data) => client.put('/settings', data),
  getNotificationPrefs: () => client.get('/settings/notifications'),
  updateNotificationPrefs: (data) => client.put('/settings/notifications', data),
};

// Users API
export const usersApi = {
  getAll: () => client.get('/users'),
  getById: (id) => client.get(`/users/${id}`),
  create: (data) => client.post('/users', data),
  update: (id, data) => client.put(`/users/${id}`, data),
  delete: (id) => client.delete(`/users/${id}`)
};

export default client;
