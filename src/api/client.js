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
  // Called after Paystack redirects back — verifies the transaction and syncs the subscription
  verifyCheckout: (reference) => client.get('/billing/verify-checkout', { params: { reference } }),
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
  getLowStockCount: () => client.get('/products/low-stock'),
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
  // locationId is optional — omit (pass undefined) for an all-locations aggregate view
  getDaily: (date, locationId) => client.get('/reports/daily', { params: { date, ...(locationId ? { locationId } : {}) } }),
  getWeekly: (date, locationId) => client.get('/reports/weekly', { params: { date, ...(locationId ? { locationId } : {}) } }),
  getProfit: (params) => client.get('/reports/profit', { params }),
  // Optional locationId scopes the dashboard to a single branch; omit for all-locations view
  getDashboard: (locationId) => client.get('/reports/dashboard', { params: locationId ? { locationId } : undefined }),
  // P&L report — date required, locationId optional for branch scoping
  getPnL: (date, locationId) => client.get('/reports/pnl', { params: { date, ...(locationId ? { locationId } : {}) } }),
  getExpensesSummary: (params) => client.get('/reports/expenses-summary', { params }),
  getCashDrawerReport: (params) => client.get('/reports/cash-drawer', { params }),
  // Monthly revenue breakdown — year required, locationId optional for branch scoping
  getMonthly: ({ year, locationId } = {}) => client.get('/reports/monthly', { params: { year, ...(locationId ? { locationId } : {}) } }),
  // Trend analysis over a date range — startDate/endDate required, locationId optional
  getTrends: ({ startDate, endDate, locationId } = {}) => client.get('/reports/trends', { params: { startDate, endDate, ...(locationId ? { locationId } : {}) } }),
  // Per-cashier performance report — startDate/endDate required, locationId optional
  getCashierReport: ({ startDate, endDate, locationId } = {}) => client.get('/reports/cashier', { params: { startDate, endDate, ...(locationId ? { locationId } : {}) } }),
  // Product sales velocity (units/day) — locationId optional for branch scoping
  getInventoryVelocity: ({ locationId } = {}) => client.get('/reports/inventory-velocity', { params: locationId ? { locationId } : {} }),
  // Annual P&L summary — year required, locationId optional for branch scoping
  getPnl: ({ year, locationId } = {}) => client.get('/reports/pnl', { params: { year, ...(locationId ? { locationId } : {}) } }),
  // Export report data as a downloadable file — responseType blob so caller can create an object URL
  exportData: ({ type, format, startDate, endDate, locationId } = {}) =>
    client.get('/reports/export', { params: { type, format, startDate, endDate, ...(locationId ? { locationId } : {}) }, responseType: 'blob' }),
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

// Receipt API — send a receipt via WhatsApp using the public receiptToken
export const receiptApi = {
  send: (token, phone) => client.post(`/receipts/${token}/send`, { phone })
};

// Locations API — multi-branch management
export const locationsApi = {
  getAll: () => client.get('/locations'),
  getById: (id) => client.get(`/locations/${id}`),
  create: (data) => client.post('/locations', data),
  update: (id, data) => client.put(`/locations/${id}`, data),
  deactivate: (id) => client.delete(`/locations/${id}`),
  assignStaff: (id, userId) => client.post(`/locations/${id}/staff`, { userId }),
  removeStaff: (id, userId) => client.delete(`/locations/${id}/staff/${userId}`),
  getStock: (locationId) => client.get(`/locations/${locationId}/stock`),
};

// Stock Transfers API — move inventory between branches
export const stockTransfersApi = {
  getAll: (params) => client.get('/stock-transfers', { params }),
  create: (data) => client.post('/stock-transfers', data),
  confirm: (id) => client.post(`/stock-transfers/${id}/confirm`),
};

// Suppliers API — manage product suppliers
export const suppliersApi = {
  getAll: () => client.get('/suppliers'),
  getById: (id) => client.get(`/suppliers/${id}`),
  create: (data) => client.post('/suppliers', data),
  update: (id, data) => client.put(`/suppliers/${id}`, data),
  deactivate: (id) => client.delete(`/suppliers/${id}`),
};

// Purchase Orders API — manage stock purchase orders
export const purchaseOrdersApi = {
  getAll: (params) => client.get('/purchase-orders', { params }),
  getById: (id) => client.get(`/purchase-orders/${id}`),
  create: (data) => client.post('/purchase-orders', data),
  update: (id, data) => client.put(`/purchase-orders/${id}`, data),
  submit: (id) => client.post(`/purchase-orders/${id}/submit`),
  receive: (id, data) => client.post(`/purchase-orders/${id}/receive`, data),
  cancel: (id) => client.post(`/purchase-orders/${id}/cancel`),
  // Returns raw axios response so caller can create an object URL from the blob
  exportPdf: (id) => client.get(`/purchase-orders/${id}/export`, { responseType: 'blob' }),
};

// Cash Drawer API — session open/close and history
export const cashDrawerApi = {
  // Fetch the currently open session; pass locationId to scope to a branch
  getActive: (locationId) => client.get('/cash-drawer/current', { params: locationId ? { locationId } : {} }),
  open: (data) => client.post('/cash-drawer/open', data),
  close: (sessionId, data) => client.post(`/cash-drawer/${sessionId}/close`, data),
  getHistory: (params) => client.get('/cash-drawer/history', { params }),
};

// Expenses API — CRUD and Cloudinary upload params
export const expensesApi = {
  getAll: (params) => client.get('/expenses', { params }),
  getById: (id) => client.get(`/expenses/${id}`),
  create: (data) => client.post('/expenses', data),
  update: (id, data) => client.put(`/expenses/${id}`, data),
  delete: (id) => client.delete(`/expenses/${id}`),
  // Returns { cloudName, uploadPreset, folder } for browser-direct Cloudinary upload
  getCloudinaryParams: () => client.get('/expenses/cloudinary-params'),
};

// Pharmacy — Batch Management API
// Tracks lot/batch numbers, expiry dates, and quantities per product
export const batchesApi = {
  getForProduct: (productId) => client.get(`/products/${productId}/batches`),
  add: (productId, data) => client.post(`/products/${productId}/batches`, data),
  update: (id, data) => client.put(`/batches/${id}`, data),
  dispose: (id, data) => client.post(`/batches/${id}/dispose`, data),
  getExpiring: (days = 90) => client.get('/batches/expiring', { params: { days } }),
  getExpired: () => client.get('/batches/expired'),
};

// Pharmacy — Product Units of Measure API
// Supports tablet/strip/box conversions with individual selling prices
export const productUnitsApi = {
  getForProduct: (productId) => client.get(`/products/${productId}/units`),
  add: (productId, data) => client.post(`/products/${productId}/units`, data),
  update: (productId, unitId, data) => client.put(`/products/${productId}/units/${unitId}`, data),
  remove: (productId, unitId) => client.delete(`/products/${productId}/units/${unitId}`),
};

// Customers API — customer accounts and loyalty balances
export const customersApi = {
  getAll: (params) => client.get('/customers', { params }),
  getById: (id) => client.get(`/customers/${id}`),
  create: (data) => client.post('/customers', data),
  update: (id, data) => client.put(`/customers/${id}`, data),
  // Soft-delete / deactivate a customer (keeps sale history intact)
  deactivate: (id) => client.delete(`/customers/${id}`),
  delete: (id) => client.delete(`/customers/${id}`),
  // Search customers by name, phone, or email — used for checkout customer lookup
  search: (query) => client.get('/customers/search', { params: { q: query } }),
  // Loyalty balance + transaction history for a specific customer
  getLoyalty: (customerId) => client.get(`/customers/${customerId}/loyalty`),
  // Manual point correction — body: { points, note }
  adjustLoyalty: (customerId, data) => client.post(`/customers/${customerId}/loyalty/adjust`, data),
  // Award bonus points — body: { points, note }
  awardBonus: (customerId, data) => client.post(`/customers/${customerId}/loyalty/bonus`, data),
};

// Pharmacy — Prescribers API
// Manage prescribing doctors/practitioners linked to prescriptions
export const prescribersApi = {
  search: (params) => client.get('/prescribers', { params }),
  create: (data) => client.post('/prescribers', data),
  update: (id, data) => client.put(`/prescribers/${id}`, data),
};

// Pharmacy — Prescriptions API
// Full prescription lifecycle: create, view, dispense, and export
export const prescriptionsApi = {
  getAll: (params) => client.get('/prescriptions', { params }),
  getById: (id) => client.get(`/prescriptions/${id}`),
  create: (data) => client.post('/prescriptions', data),
  update: (id, data) => client.put(`/prescriptions/${id}`, data),
  dispense: (id, data) => client.post(`/prescriptions/${id}/dispense`, data),
  // Returns raw blob so caller can build an object URL for download
  export: (params) => client.get('/prescriptions/export', { params, responseType: 'blob' }),
};

// Pharmacy — Controlled Substances Register API
// Regulatory audit trail for scheduled / controlled drug dispensings
export const controlledSubstancesApi = {
  getRegister: (params) => client.get('/controlled-substances/register', { params }),
  exportRegister: (params) => client.get('/controlled-substances/register/export', { params, responseType: 'blob' }),
};

// Accounting Export API — Xero and QuickBooks export for OWNER users
export const accountingApi = {
  // Returns a blob — caller must create an object URL for download
  exportXero: (params) => client.get('/accounting/export/xero', { params, responseType: 'blob' }),
  // Returns a blob — caller must create an object URL for download
  exportQuickbooks: (params) => client.get('/accounting/export/quickbooks', { params, responseType: 'blob' }),
  // Log of past accounting exports (date, range, user)
  getHistory: (params) => client.get('/accounting/export/history', { params }),
};

// Support Chatbot API — public endpoint, no auth required
export const chatApi = {
  send: (messages) => client.post('/chat', { messages }),
};

export default client;
