/**
 * Servicio API unificado - Cliente HTTP para consumir microservicios
 */
import axios from 'axios';
import {
  MS_AUTH_URL,
  MS_GEO_URL,
  MS_USER_URL,
  MS_REPORT_URL,
  MS_PRODUCT_URL
} from '../config';

// ============================================================
// CONFIGURACIÓN BASE DE AXIOS
// ============================================================
const api = axios.create({
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' }
});

// Interceptor para agregar token JWT a todas las peticiones
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor para manejar errores de respuesta
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ============================================================
// AUTH SERVICE
// ============================================================
export const authService = {
  login: async (email, password) => {
    const response = await api.post(`${MS_AUTH_URL}/login`, { email, password });
    return response.data;
  },
  me: async () => {
    const response = await api.get(`${MS_AUTH_URL}/me`);
    return response.data;
  }
};

// ============================================================
// GEO SERVICE
// ============================================================
export const geoService = {
  getCities: async () => (await api.get(`${MS_GEO_URL}/cities`)).data,
  getCity: async (id) => (await api.get(`${MS_GEO_URL}/cities/${id}`)).data,
  getZones: async (cityId = null) => {
    const params = cityId ? { city_id: cityId } : {};
    const response = await api.get(`${MS_GEO_URL}/zones`, { params });
    return response.data;
  },
  getZone: async (id) => (await api.get(`${MS_GEO_URL}/zones/${id}`)).data
};

// ============================================================
// USER SERVICE
// ============================================================
export const userService = {
  // Sellers
  getSellers: async (zoneId = null, isActive = true) => {
    const params = {};
    if (zoneId) params.zone_id = zoneId;
    if (isActive !== null) params.is_active = isActive;
    return (await api.get(`${MS_USER_URL}/sellers`, { params })).data;
  },
  getSeller: async (id) => (await api.get(`${MS_USER_URL}/sellers/${id}`)).data,
  createSeller: async (data) => (await api.post(`${MS_USER_URL}/sellers`, data)).data,
  updateSeller: async (id, data) => (await api.put(`${MS_USER_URL}/sellers/${id}`, data)).data,
  deleteSeller: async (id) => (await api.delete(`${MS_USER_URL}/sellers/${id}`)).data,

  // Shopkeepers
  getShopkeepers: async (filters = {}) =>
    (await api.get(`${MS_USER_URL}/shopkeepers`, { params: filters })).data,
  getShopkeeper: async (id) => (await api.get(`${MS_USER_URL}/shopkeepers/${id}`)).data,
  createShopkeeper: async (data) => (await api.post(`${MS_USER_URL}/shopkeepers`, data)).data,
  updateShopkeeper: async (id, data) => (await api.put(`${MS_USER_URL}/shopkeepers/${id}`, data)).data,
  deleteShopkeeper: async (id) => (await api.delete(`${MS_USER_URL}/shopkeepers/${id}`)).data,
  getUnassignedShopkeepers: async () =>
    (await api.get(`${MS_USER_URL}/shopkeepers/unassigned`)).data,

  // Assignments
  assignShopkeeper: async (data) => (await api.post(`${MS_USER_URL}/assign`, data)).data,
  reassignShopkeeper: async (data) => (await api.post(`${MS_USER_URL}/reassign`, data)).data,
  getAssignments: async (sellerId = null) => {
    const params = sellerId ? { seller_id: sellerId } : {};
    return (await api.get(`${MS_USER_URL}/assignments`, { params })).data;
  },
  getAssignmentHistory: async (shopkeeperId) =>
    (await api.get(`${MS_USER_URL}/assignments/history/${shopkeeperId}`)).data,
  unassignShopkeeper: async (id) =>
    (await api.delete(`${MS_USER_URL}/assignments/${id}`)).data,

  // Aliases hacia inventoryService (compatibilidad)
  getProducts: async (category = null, isActive = true) =>
    await inventoryService.getProducts(category, isActive),
  getInventory: async (shopkeeperId, lowStockOnly = false) =>
    await inventoryService.getShopkeeperInventory(shopkeeperId, lowStockOnly),
  getInventorySummary: async (shopkeeperId) =>
    await inventoryService.getInventorySummary(shopkeeperId),
  addInventoryItem: async (data) => await inventoryService.addInventoryItem(data),
  updateInventoryItem: async (id, data) => await inventoryService.updateInventoryItem(id, data),
  adjustStock: async (id, data) => await inventoryService.adjustStock(id, data),
  deleteInventoryItem: async (id) => await inventoryService.deleteInventoryItem(id),
  createProduct: async (data) => await inventoryService.createProduct(data),
  getCategories: async () => await inventoryService.getCategories()
};

// ============================================================
// REPORT SERVICE
// ============================================================
export const reportService = {
  getCoverage: async (cityId = null) => {
    const params = cityId ? { city_id: cityId } : {};
    return (await api.get(`${MS_REPORT_URL}/coverage`, { params })).data;
  },
  getSellersPerformance: async (zoneId = null) => {
    const params = zoneId ? { zone_id: zoneId } : {};
    return (await api.get(`${MS_REPORT_URL}/sellers-performance`, { params })).data;
  },
  getZoneStatistics: async (zoneId) =>
    (await api.get(`${MS_REPORT_URL}/zones/${zoneId}/statistics`)).data,
  getMetrics: async () => (await api.get(`${MS_REPORT_URL}/metrics`)).data,
  exportReport: async (data) =>
    (await api.post(`${MS_REPORT_URL}/export`, data, { responseType: 'blob' })).data
};

// ============================================================
// PRODUCT SERVICE (microservicio dedicado)
// ============================================================
export const productService = {
  getAll: async (category = null) => {
    const params = category ? { category } : {};
    return (await api.get(`${MS_PRODUCT_URL}/`, { params })).data;
  },
  getById: async (id) => (await api.get(`${MS_PRODUCT_URL}/${id}`)).data,
  createProduct: async (data) => (await api.post(`${MS_PRODUCT_URL}/`, data)).data,
  updateProduct: async (id, data) => (await api.put(`${MS_PRODUCT_URL}/${id}`, data)).data,
  deactivateProduct: async (id) => (await api.delete(`${MS_PRODUCT_URL}/${id}`)).data
};

// ============================================================
// INVENTORY SERVICE (productos e inventarios desde MS_PRODUCT_URL)
// ============================================================
export const inventoryService = {
  getProducts: async (category = null, isActive = true) => {
    const params = {};
    if (category) params.category = category;
    if (isActive !== null) params.is_active = isActive;
    return (await api.get(`${MS_PRODUCT_URL}/`, { params })).data;
  },
  createProduct: async (data) => (await api.post(`${MS_PRODUCT_URL}/`, data)).data,
  getShopkeeperInventory: async (shopkeeperId, lowStockOnly = false) => {
    const params = { low_stock_only: lowStockOnly };
    return (await api.get(`${MS_PRODUCT_URL}/inventory/${shopkeeperId}`, { params })).data;
  },
  getInventorySummary: async (shopkeeperId) =>
    (await api.get(`${MS_PRODUCT_URL}/inventory/${shopkeeperId}/summary`)).data,
  addInventoryItem: async (data) => (await api.post(`${MS_PRODUCT_URL}/inventory`, data)).data,
  updateInventoryItem: async (id, data) =>
    (await api.put(`${MS_PRODUCT_URL}/inventory/${id}`, data)).data,
  adjustStock: async (shopkeeperId, data) =>
    (await api.post(`${MS_PRODUCT_URL}/inventory/${shopkeeperId}/adjust-stock`, data)).data,
  deleteInventoryItem: async (id) => (await api.delete(`${MS_PRODUCT_URL}/inventory/${id}`)).data,
  getCategories: async () => (await api.get(`${MS_PRODUCT_URL}/categories`)).data
};

export default api;
