import api from './client'

export const authApi = {
  signup: (data) => api.post('/auth/signup', data),
  verifyOtp: (data) => api.post('/auth/verify', data),
  resendOtp: (email) => api.post('/auth/resend-otp', { email }),
  login: (data) => api.post('/auth/login', data),
  logout: (refresh_token) => api.post('/auth/logout', { refresh_token }),
  refresh: (refresh_token) => api.post('/auth/refresh', { refresh_token }),
  getProfile: () => api.get('/users/me'),
}

export const foodApi = {
  getFoods: () => api.get('/foods'),
  getProteins: () => api.get('/proteins'),
  getExtras: () => api.get('/extras'),
}

export const cartApi = {
  getCart: () => api.get('/cart'),
  addToCart: (data) => api.post('/cart/add', data),
  removeItem: (id) => api.delete(`/cart/items/${id}`),
  clearCart: () => api.delete('/cart/clear'),
}

export const orderApi = {
  placeOrder: (params) => api.post('/orders', null, { params }),
  getOrder: (id) => api.get(`/orders/${id}`),
  getMyOrders: () => api.get('/users/me/orders'),
}

export const paymentApi = {
  initiate: (order_id) => api.post('/payments/initiate', { order_id }),
  verify: (reference) => api.get(`/payments/${reference}/verify`),
}

export const addressApi = {
  list: () => api.get('/users/addresses'),
  add: (data) => api.post('/users/addresses', data),
  setDefault: (id) => api.patch(`/users/addresses/${id}/default`),
  remove: (id) => api.delete(`/users/addresses/${id}`),
}

export const adminApi = {
  // Foods
  addFood: (data) => api.post('/admin/foods', data),
  updateFood: (id, data) => api.put(`/admin/foods/${id}`, data),
  toggleAvailability: (id, available) =>
    api.patch(`/admin/foods/${id}/availability`, null, { params: { available } }),
  // Proteins & Extras
  addProtein: (data) => api.post('/admin/proteins', data),
  addExtra: (data) => api.post('/admin/extras', data),
  // Orders
  getAllOrders: () => api.get('/admin/orders'),
  updateOrderStatus: (id, new_status) =>
    api.patch(`/admin/orders/${id}/status`, { new_status }),
  // Users
  getAllUsers: () => api.get('/admin/users'),
}
