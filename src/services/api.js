/**
 * Servicio API - Cliente HTTP para consumir microservicios
 */
import axios from 'axios';
import { MS_AUTH_URL, MS_GEO_URL, MS_USER_URL, MS_REPORT_URL, MS_PRODUCT_URL } from '../config';

// Crear instancia de axios
const api = axios.create({
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor para agregar token JWT a todas las peticiones
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para manejar errores de respuesta
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token inválido o expirado
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ============================================================================
// AUTH SERVICE
// ============================================================================

export const authService = {
  login: async (email, password) => {
    const response = await api.post(`${MS_AUTH_URL}/login`, {
      email,
      password
    });
    return response.data;
  },

  me: async () => {
    const response = await api.get(`${MS_AUTH_URL}/me`);
    return response.data;
  },

  // Gestión de Usuarios
  getUsers: async (filters = {}) => {
    const response = await api.get(`${MS_AUTH_URL}/users`, { params: filters });
    return response.data;
  },

  getUser: async (id) => {
    const response = await api.get(`${MS_AUTH_URL}/users/${id}`);
    return response.data;
  },

  createUser: async (userData) => {
    const response = await api.post(`${MS_AUTH_URL}/users`, userData);
    return response.data;
  },

  updateUser: async (id, userData) => {
    const response = await api.put(`${MS_AUTH_URL}/users/${id}`, userData);
    return response.data;
  },

  toggleUserStatus: async (id) => {
    const response = await api.patch(`${MS_AUTH_URL}/users/${id}/toggle-status`);
    return response.data;
  },

  resetUserPassword: async (id) => {
    const response = await api.post(`${MS_AUTH_URL}/users/${id}/reset-password`);
    return response.data;
  },

  updateUserPassword: async (id, password) => {
    const response = await api.patch(`${MS_AUTH_URL}/users/${id}/password`, { password });
    return response.data;
  },

  getRoles: async () => {
    const response = await api.get(`${MS_AUTH_URL}/users/roles`);
    return response.data;
  }
};

// ============================================================================
// GEO SERVICE
// ============================================================================

export const geoService = {
  getCities: async () => {
    const response = await api.get(`${MS_GEO_URL}/cities`);
    return response.data;
  },

  getCity: async (id) => {
    const response = await api.get(`${MS_GEO_URL}/cities/${id}`);
    return response.data;
  },

  getZones: async (cityId = null) => {
    const params = cityId ? { city_id: cityId } : {};
    const response = await api.get(`${MS_GEO_URL}/zones`, { params });
    return response.data;
  },

  getZone: async (id) => {
    const response = await api.get(`${MS_GEO_URL}/zones/${id}`);
    return response.data;
  }
};

// ============================================================================
// USER SERVICE
// ============================================================================

export const userService = {
  // Sellers
  getSellers: async (zoneId = null, isActive = true) => {
    const params = {};
    if (zoneId) params.zone_id = zoneId;
    if (isActive !== null) params.is_active = isActive;
    const response = await api.get(`${MS_USER_URL}/sellers`, { params });
    return response.data;
  },

  getSeller: async (id) => {
    const response = await api.get(`${MS_USER_URL}/sellers/${id}`);
    return response.data;
  },

  createSeller: async (sellerData) => {
    const response = await api.post(`${MS_USER_URL}/sellers`, sellerData);
    return response.data;
  },

  updateSeller: async (id, sellerData) => {
    const response = await api.put(`${MS_USER_URL}/sellers/${id}`, sellerData);
    return response.data;
  },

  deleteSeller: async (id) => {
    const response = await api.delete(`${MS_USER_URL}/sellers/${id}`);
    return response.data;
  },

  // Shopkeepers
  getShopkeepers: async (filters = {}) => {
    const response = await api.get(`${MS_USER_URL}/shopkeepers`, { params: filters });
    return response.data;
  },

  getShopkeeper: async (id) => {
    const response = await api.get(`${MS_USER_URL}/shopkeepers/${id}`);
    return response.data;
  },

  createShopkeeper: async (shopkeeperData) => {
    const response = await api.post(`${MS_USER_URL}/shopkeepers`, shopkeeperData);
    return response.data;
  },

  updateShopkeeper: async (id, shopkeeperData) => {
    const response = await api.put(`${MS_USER_URL}/shopkeepers/${id}`, shopkeeperData);
    return response.data;
  },

  deleteShopkeeper: async (id) => {
    const response = await api.delete(`${MS_USER_URL}/shopkeepers/${id}`);
    return response.data;
  },

  getUnassignedShopkeepers: async () => {
    const response = await api.get(`${MS_USER_URL}/shopkeepers/unassigned`);
    return response.data;
  },

  // Assignments
  assignShopkeeper: async (assignmentData) => {
    const response = await api.post(`${MS_USER_URL}/assign`, assignmentData);
    return response.data;
  },

  reassignShopkeeper: async (reassignmentData) => {
    const response = await api.post(`${MS_USER_URL}/reassign`, reassignmentData);
    return response.data;
  },

  getAssignments: async (sellerId = null) => {
    const params = sellerId ? { seller_id: sellerId } : {};
    const response = await api.get(`${MS_USER_URL}/assignments`, { params });
    return response.data;
  },

  getAssignmentHistory: async (shopkeeperId) => {
    const response = await api.get(`${MS_USER_URL}/assignments/history/${shopkeeperId}`);
    return response.data;
  },

  unassignShopkeeper: async (assignmentId) => {
    const response = await api.delete(`${MS_USER_URL}/assignments/${assignmentId}`);
    return response.data;
<<<<<<< HEAD
    },
=======
  },
>>>>>>> origin/main

  // Inventory
  getInventory: async (shopkeeperId, lowStockOnly = false) => {
    const params = lowStockOnly ? { low_stock_only: true } : {};
    const response = await api.get(`${MS_USER_URL}/inventory/${shopkeeperId}`, { params });
    return response.data;
  },

  getInventorySummary: async (shopkeeperId) => {
    const response = await api.get(`${MS_USER_URL}/inventory/${shopkeeperId}/summary`);
    return response.data;
  },

  addInventoryItem: async (data) => {
    const response = await api.post(`${MS_USER_URL}/inventory`, data);
    return response.data;
  },

  updateInventoryItem: async (id, data) => {
    const response = await api.put(`${MS_USER_URL}/inventory/${id}`, data);
    return response.data;
  },

  deleteInventoryItem: async (id) => {
    const response = await api.delete(`${MS_USER_URL}/inventory/${id}`);
    return response.data;
  },

  adjustStock: async (shopkeeperId, data) => {
    const response = await api.post(`${MS_USER_URL}/inventory/${shopkeeperId}/adjust-stock`, data);
    return response.data;
  }
};

// ============================================================================
// REPORT SERVICE
// ============================================================================

export const reportService = {
  getCoverage: async (cityId = null) => {
    const params = cityId ? { city_id: cityId } : {};
    const response = await api.get(`${MS_REPORT_URL}/coverage`, { params });
    return response.data;
  },

  getSellersPerformance: async (zoneId = null) => {
    const params = zoneId ? { zone_id: zoneId } : {};
    const response = await api.get(`${MS_REPORT_URL}/sellers-performance`, { params });
    return response.data;
  },

  getZoneStatistics: async (zoneId) => {
    const response = await api.get(`${MS_REPORT_URL}/zones/${zoneId}/statistics`);
    return response.data;
  },

  getMetrics: async () => {
    const response = await api.get(`${MS_REPORT_URL}/metrics`);
    return response.data;
  },

  exportReport: async (exportData) => {
    const response = await api.post(`${MS_REPORT_URL}/export`, exportData, {
      responseType: 'blob'
    });
    return response.data;
  },

  getSalesComparison: async (comparisonType = 'both') => {
    const params = { comparison_type: comparisonType };
    const response = await api.get(`${MS_REPORT_URL}/sales-comparison`, { params });
    return response.data;
  }
};

// ============================================================================
// PRODUCT SERVICE
// ============================================================================

export const productService = {
  /**
   * Obtener todos los productos.
   * Si se envía un filtro de categoría, se aplica como parámetro.
   */
  getAll: async (category = null) => {
    const params = {};
    if (category) params.category = category;
    const response = await api.get(`${MS_PRODUCT_URL}/`, { params });
    return response.data;
  },

  /**
   * Obtener un producto por su ID.
   */
  getById: async (id) => {
    const response = await api.get(`${MS_PRODUCT_URL}/${id}`);
    return response.data;
  },

  /**
   * Crear un nuevo producto.
   */
  createProduct: async (productData) => {
    const response = await api.post(`${MS_PRODUCT_URL}/`, productData);
    return response.data;
  },

  /**
   * Actualizar un producto existente.
   */
  updateProduct: async (id, productData) => {
    const response = await api.put(`${MS_PRODUCT_URL}/${id}`, productData);
    return response.data;
  },

  /**
   * Desactivar un producto (en lugar de eliminarlo físicamente).
   * Esto envía un PUT con is_active = false.
   */
  deactivateProduct: async (id) => {
    // El backend expone DELETE /{id} que hace soft delete (is_active=false)
    const response = await api.delete(`${MS_PRODUCT_URL}/${id}`);
    return response.data;
  }
  
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

