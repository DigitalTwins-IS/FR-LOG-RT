/**
 * Datos de ejemplo para el Dashboard
 * Se usan cuando los microservicios no están disponibles
 */

export const mockShopkeepers = [
  { id: 1, name: "Tienda La Esperanza", business_name: "Supermercado La Esperanza", seller_id: 1 },
  { id: 2, name: "Tienda El Progreso", business_name: "Mercado El Progreso", seller_id: 1 },
  { id: 3, name: "Tienda San José", business_name: "Supermercado San José", seller_id: 2 },
  { id: 4, name: "Tienda La Esperanza 2", business_name: "Mercado La Esperanza", seller_id: null },
  { id: 5, name: "Tienda El Dorado", business_name: "Supermercado El Dorado", seller_id: 2 }
];

export const mockSellers = [
  { id: 1, name: "Carlos Mendoza", zone_id: 1 },
  { id: 2, name: "Ana García", zone_id: 2 },
  { id: 3, name: "Luis Rodríguez", zone_id: 1 }
];

export const mockInventories = [
  {
    shopkeeper_id: 1,
    total_products: 50,
    low_stock_items: 8,
    total_value: 1250000
  },
  {
    shopkeeper_id: 2,
    total_products: 35,
    low_stock_items: 5,
    total_value: 890000
  },
  {
    shopkeeper_id: 3,
    total_products: 42,
    low_stock_items: 12,
    total_value: 1100000
  },
  {
    shopkeeper_id: 4,
    total_products: 28,
    low_stock_items: 15,
    total_value: 650000
  },
  {
    shopkeeper_id: 5,
    total_products: 38,
    low_stock_items: 3,
    total_value: 950000
  }
];

export const mockSystemMetrics = {
  total_cities: 5,
  total_zones: 9,
  system_health: 'healthy'
};

/**
 * Calcula las métricas del dashboard basadas en los datos proporcionados
 */
export const calculateDashboardMetrics = (shopkeepers, sellers, inventories, systemMetrics = mockSystemMetrics) => {
  // Calcular métricas de stock
  const totalInventories = inventories.reduce((sum, inv) => sum + inv.total_products, 0);
  const totalStockValue = inventories.reduce((sum, inv) => sum + (inv.total_value || 0), 0);
  const lowStockInventories = inventories.reduce((sum, inv) => sum + inv.low_stock_items, 0);
  const outOfStockInventories = inventories.filter(inv => inv.total_products > 0 && inv.low_stock_items === inv.total_products).length;
  // Sumar productos con stock normal de TODOS los tenderos
  const normalStockInventories = inventories.reduce((sum, inv) => {
    const normalItems = inv.total_products - inv.low_stock_items;
    return sum + (normalItems > 0 ? normalItems : 0);
  }, 0);
  
  // Calcular métricas de asignaciones
  const activeAssignments = shopkeepers.filter(s => s.seller_id).length;
  const unassignedShopkeepers = shopkeepers.filter(s => !s.seller_id).length;
  const avgShopkeepersPerSeller = sellers.length > 0 ? Math.round(activeAssignments / sellers.length) : 0;
  
  return {
    ...systemMetrics,
    total_sellers: sellers.length,
    total_shopkeepers: shopkeepers.length,
    active_assignments: activeAssignments,
    unassigned_shopkeepers: unassignedShopkeepers,
    avg_shopkeepers_per_seller: avgShopkeepersPerSeller,
    total_inventories: totalInventories,
    total_stock_value: totalStockValue,
    low_stock_inventories: lowStockInventories,
    out_of_stock_inventories: outOfStockInventories,
    normal_stock_inventories: normalStockInventories
  };
};
