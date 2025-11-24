/**
 * Página de Cumplimiento de Visitas - HU15
 * Como administrador, quiero ver % de cumplimiento de visitas para evaluar desempeño de cada vendedor
 */
import { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button, Form, Badge, Alert } from 'react-bootstrap';
import { reportService, geoService, userService } from '../services/api';
import { toast } from 'react-toastify';
import { Chart as ChartJS, ArcElement, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

// Registrar componentes de Chart.js
ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const VisitsCompliancePage = () => {
  const [loading, setLoading] = useState(true);
  const [complianceData, setComplianceData] = useState(null);
  const [sellers, setSellers] = useState([]);
  const [zones, setZones] = useState([]);
  const [filters, setFilters] = useState({
    sellerId: '',
    zoneId: '',
    startDate: '',
    endDate: '',
    sortBy: 'compliance_percentage',
    sortOrder: 'desc'
  });

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (sellers.length > 0 || zones.length > 0) {
      loadComplianceData();
    }
  }, [filters]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [sellersData, zonesData] = await Promise.all([
        userService.getSellers(),
        geoService.getZones()
      ]);
      setSellers(sellersData);
      setZones(zonesData);
      await loadComplianceData();
    } catch (error) {
      toast.error('Error al cargar datos iniciales');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const loadComplianceData = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filters.sellerId) params.sellerId = parseInt(filters.sellerId);
      if (filters.zoneId) params.zoneId = parseInt(filters.zoneId);
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      if (filters.sortBy) params.sortBy = filters.sortBy;
      if (filters.sortOrder) params.sortOrder = filters.sortOrder;

      const data = await reportService.getVisitsCompliance(params);
      setComplianceData(data);
    } catch (error) {
      toast.error('Error al cargar reporte de cumplimiento');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleClearFilters = () => {
    setFilters({
      sellerId: '',
      zoneId: '',
      startDate: '',
      endDate: '',
      sortBy: 'compliance_percentage',
      sortOrder: 'desc'
    });
  };

  const getComplianceBadge = (percentage) => {
    if (percentage >= 90) {
      return <Badge bg="success">{percentage.toFixed(1)}%</Badge>;
    } else if (percentage >= 70) {
      return <Badge bg="warning" text="dark">{percentage.toFixed(1)}%</Badge>;
    } else {
      return <Badge bg="danger">{percentage.toFixed(1)}%</Badge>;
    }
  };

  const handleSort = (field) => {
    const newOrder = filters.sortBy === field && filters.sortOrder === 'desc' ? 'asc' : 'desc';
    setFilters(prev => ({
      ...prev,
      sortBy: field,
      sortOrder: newOrder
    }));
  };

  // Datos para gráfico de barras
  const barChartData = complianceData ? {
    labels: complianceData.sellers_compliance.map(s => s.seller_name),
    datasets: [{
      label: '% Cumplimiento',
      data: complianceData.sellers_compliance.map(s => s.compliance_percentage),
      backgroundColor: complianceData.sellers_compliance.map(s => {
        if (s.compliance_percentage >= 90) return 'rgba(40, 167, 69, 0.8)';
        if (s.compliance_percentage >= 70) return 'rgba(255, 193, 7, 0.8)';
        return 'rgba(220, 53, 69, 0.8)';
      }),
      borderColor: complianceData.sellers_compliance.map(s => {
        if (s.compliance_percentage >= 90) return 'rgba(40, 167, 69, 1)';
        if (s.compliance_percentage >= 70) return 'rgba(255, 193, 7, 1)';
        return 'rgba(220, 53, 69, 1)';
      }),
      borderWidth: 1
    }]
  } : null;

  // Datos para gráfico de pastel
  const pieChartData = complianceData ? {
    labels: ['Completadas', 'Pendientes', 'Canceladas'],
    datasets: [{
      data: [
        complianceData.summary.total_completed,
        complianceData.summary.total_pending,
        complianceData.summary.total_cancelled
      ],
      backgroundColor: [
        'rgba(40, 167, 69, 0.8)',
        'rgba(255, 193, 7, 0.8)',
        'rgba(108, 117, 125, 0.8)'
      ],
      borderColor: [
        'rgba(40, 167, 69, 1)',
        'rgba(255, 193, 7, 1)',
        'rgba(108, 117, 125, 1)'
      ],
      borderWidth: 1
    }]
  } : null;

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Cumplimiento de Visitas por Vendedor'
      }
    }
  };

  const pieChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Distribución de Estados de Visitas'
      }
    }
  };

  const handleExportCSV = () => {
    if (!complianceData) return;

    const headers = ['Vendedor', 'Zona', 'Total Visitas', 'Completadas', 'Pendientes', 'Canceladas', '% Cumplimiento'];
    const rows = complianceData.sellers_compliance.map(s => [
      s.seller_name,
      s.zone_name || 'Sin zona',
      s.total_visits,
      s.completed_visits,
      s.pending_visits,
      s.cancelled_visits,
      s.compliance_percentage.toFixed(2)
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `cumplimiento_visitas_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Reporte exportado exitosamente');
  };

  if (loading && !complianceData) {
    return (
      <Container className="mt-4">
        <Alert variant="info">Cargando datos...</Alert>
      </Container>
    );
  }

  return (
    <Container className="mt-4">
      <Row>
        <Col>
          <h2 className="mb-4">📊 Reporte de Cumplimiento de Visitas</h2>
          <p className="text-muted">HU15: Evaluación del desempeño de cada vendedor</p>
        </Col>
      </Row>

      {/* Filtros */}
      <Card className="mb-4">
        <Card.Header>
          <h5>Filtros</h5>
        </Card.Header>
        <Card.Body>
          <Row>
            <Col md={3}>
              <Form.Group className="mb-3">
                <Form.Label>Vendedor</Form.Label>
                <Form.Select
                  value={filters.sellerId}
                  onChange={(e) => handleFilterChange('sellerId', e.target.value)}
                >
                  <option value="">Todos los vendedores</option>
                  {sellers.map(seller => (
                    <option key={seller.id} value={seller.id}>{seller.name}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group className="mb-3">
                <Form.Label>Zona</Form.Label>
                <Form.Select
                  value={filters.zoneId}
                  onChange={(e) => handleFilterChange('zoneId', e.target.value)}
                >
                  <option value="">Todas las zonas</option>
                  {zones.map(zone => (
                    <option key={zone.id} value={zone.id}>{zone.name}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={2}>
              <Form.Group className="mb-3">
                <Form.Label>Fecha Inicio</Form.Label>
                <Form.Control
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => handleFilterChange('startDate', e.target.value)}
                />
              </Form.Group>
            </Col>
            <Col md={2}>
              <Form.Group className="mb-3">
                <Form.Label>Fecha Fin</Form.Label>
                <Form.Control
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => handleFilterChange('endDate', e.target.value)}
                />
              </Form.Group>
            </Col>
            <Col md={2}>
              <Form.Group className="mb-3">
                <Form.Label>Ordenar por</Form.Label>
                <Form.Select
                  value={filters.sortBy}
                  onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                >
                  <option value="compliance_percentage">% Cumplimiento</option>
                  <option value="seller_name">Nombre</option>
                  <option value="total_visits">Total Visitas</option>
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>
          <Row>
            <Col>
              <Button variant="primary" onClick={loadComplianceData} className="me-2">
                Aplicar Filtros
              </Button>
              <Button variant="secondary" onClick={handleClearFilters}>
                Limpiar Filtros
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Resumen */}
      {complianceData && (
        <Row className="mb-4">
          <Col md={3}>
            <Card className="text-center">
              <Card.Body>
                <Card.Title>Total Vendedores</Card.Title>
                <h3>{complianceData.summary.total_sellers}</h3>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="text-center">
              <Card.Body>
                <Card.Title>Promedio Cumplimiento</Card.Title>
                <h3>{getComplianceBadge(complianceData.summary.average_compliance)}</h3>
              </Card.Body>
            </Card>
          </Col>
          <Col md={2}>
            <Card className="text-center">
              <Card.Body>
                <Card.Title>Total Visitas</Card.Title>
                <h3>{complianceData.summary.total_visits}</h3>
              </Card.Body>
            </Card>
          </Col>
          <Col md={2}>
            <Card className="text-center">
              <Card.Body>
                <Card.Title>Completadas</Card.Title>
                <h3 className="text-success">{complianceData.summary.total_completed}</h3>
              </Card.Body>
            </Card>
          </Col>
          <Col md={2}>
            <Card className="text-center">
              <Card.Body>
                <Card.Title>Pendientes</Card.Title>
                <h3 className="text-warning">{complianceData.summary.total_pending}</h3>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {/* Gráficos */}
      {complianceData && complianceData.sellers_compliance.length > 0 && (
        <Row className="mb-4">
          <Col md={8}>
            <Card>
              <Card.Header>
                <h5>Porcentaje de Cumplimiento por Vendedor</h5>
              </Card.Header>
              <Card.Body>
                <div style={{ height: '400px' }}>
                  <Bar data={barChartData} options={chartOptions} />
                </div>
              </Card.Body>
            </Card>
          </Col>
          <Col md={4}>
            <Card>
              <Card.Header>
                <h5>Distribución de Estados</h5>
              </Card.Header>
              <Card.Body>
                <div style={{ height: '400px' }}>
                  <Doughnut data={pieChartData} options={pieChartOptions} />
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {/* Tabla de Resultados */}
      <Card>
        <Card.Header className="d-flex justify-content-between align-items-center">
          <h5>Detalle por Vendedor</h5>
          <Button variant="success" size="sm" onClick={handleExportCSV}>
            Exportar CSV
          </Button>
        </Card.Header>
        <Card.Body>
          {complianceData && complianceData.sellers_compliance.length > 0 ? (
            <Table striped bordered hover responsive>
              <thead>
                <tr>
                  <th 
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleSort('seller_name')}
                  >
                    Vendedor {filters.sortBy === 'seller_name' && (filters.sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th>Zona</th>
                  <th 
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleSort('total_visits')}
                  >
                    Total Visitas {filters.sortBy === 'total_visits' && (filters.sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th>Completadas</th>
                  <th>Pendientes</th>
                  <th>Canceladas</th>
                  <th 
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleSort('compliance_percentage')}
                  >
                    % Cumplimiento {filters.sortBy === 'compliance_percentage' && (filters.sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {complianceData.sellers_compliance.map((seller) => (
                  <tr key={seller.seller_id}>
                    <td>{seller.seller_name}</td>
                    <td>{seller.zone_name || 'Sin zona'}</td>
                    <td>{seller.total_visits}</td>
                    <td className="text-success">{seller.completed_visits}</td>
                    <td className="text-warning">{seller.pending_visits}</td>
                    <td className="text-secondary">{seller.cancelled_visits}</td>
                    <td>{getComplianceBadge(seller.compliance_percentage)}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <Alert variant="info">
              No hay datos disponibles para los filtros seleccionados.
            </Alert>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
};

export default VisitsCompliancePage;

