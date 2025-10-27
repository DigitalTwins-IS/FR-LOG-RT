/**
 * Servicio API - Cliente HTTP para consumir microservicios
 */
import axios from 'axios';
import { MS_AUTH_URL, MS_GEO_URL, MS_USER_URL, MS_REPORT_URL } from '../config';

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
  }
};

//route optimizer service
export const routeOptimizerService = {
  getOptimizedRoute:
  async (sellerId, params = {}) => {
    const queryParams = new URLSearchParams();
    
    if (params.start_latitude) {
      queryParams.append('start_latitude', params.start_latitude);
    }
    if (params.start_longitude) {
      queryParams.append('start_longitude', params.start_longitude);
    }
    
    const queryString = queryParams.toString();
    const url = `${MS_USER_URL}/sellers/${sellerId}/optimized-route${queryString ? '?' + queryString : ''}`;
    
    const response = await api.get(url);
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
  }
};

export default api;

