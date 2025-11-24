/**
 * Configuración de la aplicación
 */

// API Base URL - usar API Gateway Nginx
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

// Microservices URLs (directo, sin Gateway - para desarrollo)
export const MS_AUTH_URL = import.meta.env.VITE_MS_AUTH_URL || 'http://localhost:8001/api/v1/auth';
export const MS_GEO_URL = import.meta.env.VITE_MS_GEO_URL || 'http://localhost:8003/api/v1/geo';
export const MS_USER_URL = import.meta.env.VITE_MS_USER_URL || 'http://localhost:8002/api/v1/users';
export const MS_REPORT_URL = import.meta.env.VITE_MS_REPORT_URL || 'http://localhost:8004/api/v1/reports';
export const MS_PRODUCT_URL = import.meta.env.VITE_MS_PRODUCT_URL || 'http://localhost:8005/api/v1/products';

export const WS_USER_URL = import.meta.env.VITE_WS_USER_URL || 'ws://localhost:8002/api/v1/users';

// Map Configuration
export const MAP_CONFIG = {
  center: [
    parseFloat(import.meta.env.VITE_MAP_CENTER_LAT) || 4.7110,
    parseFloat(import.meta.env.VITE_MAP_CENTER_LNG) || -74.0721
  ],
  zoom: parseInt(import.meta.env.VITE_MAP_ZOOM) || 6,
  minZoom: 5,
  maxZoom: 18
};

// App Configuration
export const APP_CONFIG = {
  name: 'Digital Twins',
  version: '1.0.0',
  maxShopkeepersPerSeller: 80,
  maxSellersPerZone: 10
};

// Feature Flags - Sprint 1
/* export const FEATURES = {
  enableDashboard: false,    // Sprint 2
  enableReports: false,       // Sprint 2
  enableMap: true,            // Sprint 1
  enableSellers: true,        // Sprint 1
  enableShopkeepers: true     // Sprint 1
}; */

// Zone Colors (para el mapa)
export const ZONE_COLORS = {
  'Norte': '#E74C3C',
  'Centro': '#3498DB',
  'Sur': '#2ECC71',
  'default': '#95A5A6'
};

const config = {
  API_BASE_URL,
  MS_AUTH_URL,
  MS_GEO_URL,
  MS_USER_URL,
  MS_REPORT_URL,
  MS_PRODUCT_URL,
  WS_USER_URL,
  MAP_CONFIG,
  ZONE_COLORS
};

export default config;