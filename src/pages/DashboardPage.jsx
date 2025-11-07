/**
 * Dashboard Principal
 * Muestra métricas generales y acceso rápido
 */
import { useState, useEffect } from 'react';
import { Container, Row, Col, Card } from 'react-bootstrap';
import { reportService } from '../services/api';
import { toast } from 'react-toastify';

const DashboardPage = () => {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    try {
      const data = await reportService.getMetrics();
      setMetrics(data);
    } catch (error) {
      toast.error('Error al cargar métricas');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Container className="mt-4">
        <div className="text-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Cargando...</span>
          </div>
        </div>
      </Container>
    );
  }

  return (
    <Container className="mt-4">
      <h2 className="mb-4">Dashboard</h2>

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
              <h3>{Math.round(metrics?.avg_shopkeepers_per_seller || 0)}</h3>
              <small className="text-muted">Tenderos por vendedor</small>
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
                <span>Sistema operando normalmente</span>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default DashboardPage;

