/**
 * Dashboard Principal
 * Muestra métricas generales y acceso rápido
 */
import { useState, useEffect } from 'react';
import { Container, Row, Col, Card } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { userService } from '../services/api';
import { toast } from 'react-toastify';
import { mockShopkeepers, mockSellers, mockInventories, calculateDashboardMetrics } from '../data/dashboard-mock-data';

const DashboardPage = () => {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [usingMockData, setUsingMockData] = useState(false);

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    try {
      setLoading(true);
      let shopkeepers = [];
      let sellers = [];
      let inventories = [];
      let mockDataUsed = false;

      try {
        // Intentar obtener datos reales de los microservicios
        shopkeepers = await userService.getShopkeepers();
        sellers = await userService.getSellers();
        
        // Intentar obtener inventarios de todos los tenderos
        if (shopkeepers.length > 0) {
          const inventoryPromises = shopkeepers.map(shopkeeper => 
            userService.getInventorySummary(shopkeeper.id).catch(() => {
              console.warn(`No se pudo obtener inventario para tendero ${shopkeeper.id}`);
              return null;
            })
          );
          
          const inventoryResults = await Promise.all(inventoryPromises);
          inventories = inventoryResults.filter(inv => inv !== null);
        }
      } catch (error) {
        console.warn('Error obteniendo datos reales, usando datos de ejemplo:', error);
        mockDataUsed = true;
      }

      // Si no hay datos reales o hay muy pocos, usar datos de ejemplo
      if (shopkeepers.length === 0 || inventories.length === 0) {
        console.log('Usando datos de ejemplo para el dashboard');
        mockDataUsed = true;
        shopkeepers = mockShopkeepers;
        sellers = mockSellers;
        inventories = mockInventories;
      }

      // Calcular métricas usando la función helper
      const data = calculateDashboardMetrics(shopkeepers, sellers, inventories, {
        total_cities: 5,
        total_zones: 9,
        system_health: 'healthy'
      });
      
      data.using_mock_data = mockDataUsed;
      
      setMetrics(data);
      setUsingMockData(mockDataUsed);
      
      if (mockDataUsed) {
        toast.info('Mostrando datos de ejemplo - Los microservicios no están disponibles');
      }
      
    } catch (error) {
      console.error('Error cargando métricas:', error);
      toast.error('Error al cargar métricas del dashboard');
      
      // En caso de error total, mostrar datos básicos
      setMetrics({
        total_cities: 0,
        total_zones: 0,
        total_sellers: 0,
        total_shopkeepers: 0,
        active_assignments: 0,
        unassigned_shopkeepers: 0,
        avg_shopkeepers_per_seller: 0,
        total_inventories: 0,
        low_stock_inventories: 0,
        out_of_stock_inventories: 0,
        normal_stock_inventories: 0,
        system_health: 'error',
        using_mock_data: false
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Container className="mt-4">
        <div className="text-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Cargando métricas...</span>
          </div>
          <p className="mt-2">Cargando métricas del sistema...</p>
        </div>
      </Container>
    );
  }

  if (!metrics) {
    return (
      <Container className="mt-4">
        <div className="text-center">
          <p className="text-muted">No se pudieron cargar las métricas</p>
          <button className="btn btn-primary" onClick={loadMetrics}>
            Reintentar
          </button>
        </div>
      </Container>
    );
  }

  return (
    <Container className="mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Dashboard</h2>
        {usingMockData && (
          <div className="alert alert-warning alert-sm mb-0" role="alert">
            <i className="bi bi-exclamation-triangle me-1"></i>
            Datos de ejemplo
          </div>
        )}
      </div>

      <Row>
        <Col md={3}>
          <Card className="mb-3">
            <Card.Body>
              <Card.Title>Ciudades</Card.Title>
              <h2>{metrics?.total_cities || 0}</h2>
              <small className="text-muted">Total de ciudades</small>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3}>
          <Card className="mb-3">
            <Card.Body>
              <Card.Title>Zonas</Card.Title>
              <h2>{metrics?.total_zones || 0}</h2>
              <small className="text-muted">Zonas activas</small>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3}>
          <Card className="mb-3">
            <Card.Body>
              <Card.Title>Vendedores</Card.Title>
              <h2>{metrics?.total_sellers || 0}</h2>
              <small className="text-muted">Vendedores activos</small>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3}>
          <Card className="mb-3">
            <Card.Body>
              <Card.Title>Tenderos</Card.Title>
              <h2>{metrics?.total_shopkeepers || 0}</h2>
              <small className="text-muted">Tenderos registrados</small>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row>
        <Col md={4}>
          <Card>
            <Card.Body>
              <Card.Title>Asignaciones Activas</Card.Title>
              <h3>{metrics?.active_assignments || 0}</h3>
              <small className="text-muted">Tenderos asignados</small>
            </Card.Body>
          </Card>
        </Col>

        <Col md={4}>
          <Card>
            <Card.Body>
              <Card.Title>Sin Asignar</Card.Title>
              <h3>{metrics?.unassigned_shopkeepers || 0}</h3>
              <small className="text-muted">Tenderos disponibles</small>
            </Card.Body>
          </Card>
        </Col>

        <Col md={4}>
          <Card>
            <Card.Body>
              <Card.Title>Promedio</Card.Title>
              <h3>{metrics?.avg_shopkeepers_per_seller?.toFixed(1) || 0}</h3>
              <small className="text-muted">Tenderos por vendedor</small>
            </Card.Body>
          </Card>
        </Col>
      </Row>

       <Row className="mt-3">
         <Col md={3}>
           <Card as={Link} to="/inventory" className="text-decoration-none">
             <Card.Body>
               <Card.Title>Inventarios</Card.Title>
               <h2>{metrics?.total_inventories || 0}</h2>
               <small className="text-muted">Total de inventarios</small>
             </Card.Body>
           </Card>
         </Col>

         <Col md={3}>
           <Card as={Link} to="/inventory?filter=low-stock" className="text-decoration-none">
             <Card.Body>
               <Card.Title>Stock Bajo</Card.Title>
               <h2 className="text-warning">{metrics?.low_stock_inventories || 0}</h2>
               <small className="text-muted">Necesitan reposición</small>
             </Card.Body>
           </Card>
         </Col>

         <Col md={3}>
           <Card as={Link} to="/inventory?filter=out-of-stock" className="text-decoration-none">
             <Card.Body>
               <Card.Title>Sin Stock</Card.Title>
               <h2 className="text-danger">{metrics?.out_of_stock_inventories || 0}</h2>
               <small className="text-muted">Requieren atención</small>
             </Card.Body>
           </Card>
         </Col>

         <Col md={3}>
           <Card as={Link} to="/inventory?filter=normal-stock" className="text-decoration-none">
             <Card.Body>
               <Card.Title>Stock Normal</Card.Title>
               <h2 className="text-success">{metrics?.normal_stock_inventories || 0}</h2>
               <small className="text-muted">En buen estado</small>
             </Card.Body>
           </Card>
         </Col>
       </Row>

       {/* Total de Stock */}
       <Row className="mt-3">
         <Col md={12}>
           <Card className="bg-light">
             <Card.Body>
               <Card.Title>💰 Valor Total del Stock</Card.Title>
               <h3 className="text-success">
                 {new Intl.NumberFormat('es-CO', { 
                   style: 'currency', 
                   currency: 'COP', 
                   minimumFractionDigits: 0 
                 }).format(metrics?.total_stock_value || 0)}
               </h3>
               <small className="text-muted">Valor total de todos los inventarios</small>
             </Card.Body>
           </Card>
         </Col>
       </Row>

      <Row className="mt-3">
        <Col md={12}>
          <Card>
            <Card.Body>
              <Card.Title>Estado del Sistema</Card.Title>
              <div className="d-flex align-items-center">
                <span className={`badge ${metrics?.system_health === 'healthy' ? 'bg-success' : 'bg-warning'} me-2`}>
                  {metrics?.system_health}
                </span>
                <span>
                  {metrics?.system_health === 'healthy' 
                    ? 'Sistema operando normalmente' 
                    : 'Sistema con problemas de conexión'
                  }
                </span>
                {usingMockData && (
                  <span className="ms-3 text-muted">
                    <i className="bi bi-info-circle me-1"></i>
                    Usando datos de ejemplo
                  </span>
                )}
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default DashboardPage;

