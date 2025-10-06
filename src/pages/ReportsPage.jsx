/**
 * Página de Reportes - HU5
 * Como administrador, quiero generar reportes y análisis del sistema
 */
import { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button, Form, Alert } from 'react-bootstrap';
import { reportService, geoService } from '../services/api';
import { toast } from 'react-toastify';
import { Chart as ChartJS, ArcElement, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

// Registrar componentes de Chart.js
ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const ReportsPage = () => {
  const [loading, setLoading] = useState(true);
  const [coverage, setCoverage] = useState(null);
  const [performance, setPerformance] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [cities, setCities] = useState([]);
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedZone, setSelectedZone] = useState('');

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (metrics) {
      loadReports();
    }
  }, [selectedCity, selectedZone]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [metricsData, citiesData] = await Promise.all([
        reportService.getMetrics(),
        geoService.getCities()
      ]);
      setMetrics(metricsData);
      setCities(citiesData);
      
      // Cargar reportes iniciales
      await loadReports();
    } catch (error) {
      toast.error('Error al cargar datos');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const loadReports = async () => {
    try {
      const [coverageData, performanceData] = await Promise.all([
        reportService.getCoverage(selectedCity || null),
        reportService.getSellersPerformance(selectedZone || null)
      ]);
      setCoverage(coverageData);
      setPerformance(performanceData);
    } catch (error) {
      toast.error('Error al cargar reportes');
      console.error(error);
    }
  };

  const handleExport = async (reportType, format) => {
    try {
      const exportData = {
        report_type: reportType,
        format: format,
        city_id: selectedCity ? parseInt(selectedCity) : null,
        zone_id: selectedZone ? parseInt(selectedZone) : null
      };

      const blob = await reportService.exportReport(exportData);
      
      // Crear link de descarga
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${reportType}_report.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('Reporte exportado exitosamente');
    } catch (error) {
      toast.error('Error al exportar reporte');
      console.error(error);
    }
  };

  // Datos para gráfico de cobertura
  const coverageChartData = coverage ? {
    labels: coverage.zones.map(z => z.zone_name),
    datasets: [{
      label: 'Vendedores',
      data: coverage.zones.map(z => z.total_sellers),
      backgroundColor: 'rgba(54, 162, 235, 0.6)',
      borderColor: 'rgba(54, 162, 235, 1)',
      borderWidth: 1
    }, {
      label: 'Tenderos',
      data: coverage.zones.map(z => z.total_shopkeepers),
      backgroundColor: 'rgba(255, 99, 132, 0.6)',
      borderColor: 'rgba(255, 99, 132, 1)',
      borderWidth: 1
    }]
  } : null;

  // Datos para gráfico circular de estado
  const statusChartData = metrics ? {
    labels: ['Asignados', 'Sin Asignar'],
    datasets: [{
      data: [metrics.active_assignments, metrics.unassigned_shopkeepers],
      backgroundColor: [
        'rgba(75, 192, 192, 0.6)',
        'rgba(255, 206, 86, 0.6)'
      ],
      borderColor: [
        'rgba(75, 192, 192, 1)',
        'rgba(255, 206, 86, 1)'
      ],
      borderWidth: 1
    }]
  } : null;

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
      <Row className="mb-4">
        <Col md={8}>
          <h2>📊 Reportes y Análisis</h2>
          <p className="text-muted">Visualización y exportación de datos (HU5)</p>
        </Col>
        <Col md={4} className="text-end">
          <Button 
            variant="success" 
            className="me-2"
            onClick={() => handleExport('coverage', 'csv')}
          >
            📥 Exportar CSV
          </Button>
          <Button 
            variant="info"
            onClick={() => handleExport('coverage', 'json')}
          >
            📥 Exportar JSON
          </Button>
        </Col>
      </Row>

      {/* Filtros */}
      <Row className="mb-4">
        <Col md={6}>
          <Form.Group>
            <Form.Label>Filtrar por Ciudad</Form.Label>
            <Form.Select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
            >
              <option value="">Todas las ciudades</option>
              {cities.map(city => (
                <option key={city.id} value={city.id}>{city.name}</option>
              ))}
            </Form.Select>
          </Form.Group>
        </Col>
        <Col md={6}>
          <Alert variant="info" className="mb-0">
            <strong>Fecha del reporte:</strong> {new Date(coverage?.report_date).toLocaleString('es-CO')}
          </Alert>
        </Col>
      </Row>

      {/* Métricas Generales */}
      <Row className="mb-4">
        <Col md={3}>
          <Card className="text-center">
            <Card.Body>
              <h5 className="text-muted">Ciudades</h5>
              <h2>{metrics?.total_cities || 0}</h2>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center">
            <Card.Body>
              <h5 className="text-muted">Zonas</h5>
              <h2>{metrics?.total_zones || 0}</h2>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center">
            <Card.Body>
              <h5 className="text-muted">Vendedores</h5>
              <h2>{metrics?.total_sellers || 0}</h2>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center">
            <Card.Body>
              <h5 className="text-muted">Tenderos</h5>
              <h2>{metrics?.total_shopkeepers || 0}</h2>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Gráficos */}
      <Row className="mb-4">
        <Col md={8}>
          <Card>
            <Card.Header>
              <strong>Cobertura por Zona</strong>
            </Card.Header>
            <Card.Body>
              {coverageChartData && (
                <Bar 
                  data={coverageChartData}
                  options={{
                    responsive: true,
                    plugins: {
                      legend: {
                        position: 'top',
                      },
                      title: {
                        display: true,
                        text: 'Distribución de Vendedores y Tenderos por Zona'
                      }
                    },
                    scales: {
                      y: {
                        beginAtZero: true
                      }
                    }
                  }}
                />
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col md={4}>
          <Card>
            <Card.Header>
              <strong>Estado de Asignaciones</strong>
            </Card.Header>
            <Card.Body>
              {statusChartData && (
                <Doughnut 
                  data={statusChartData}
                  options={{
                    responsive: true,
                    plugins: {
                      legend: {
                        position: 'bottom',
                      },
                      title: {
                        display: true,
                        text: 'Tenderos Asignados vs Sin Asignar'
                      }
                    }
                  }}
                />
              )}
              <div className="text-center mt-3">
                <strong>Promedio:</strong> {metrics?.avg_shopkeepers_per_seller?.toFixed(1)} tenderos/vendedor
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Tabla de Cobertura por Zona */}
      <Row className="mb-4">
        <Col>
          <Card>
            <Card.Header>
              <strong>📍 Reporte de Cobertura Territorial</strong>
            </Card.Header>
            <Card.Body>
              <Table striped bordered hover responsive>
                <thead>
                  <tr>
                    <th>Zona</th>
                    <th>Ciudad</th>
                    <th>Vendedores</th>
                    <th>Tenderos</th>
                    <th>Cobertura</th>
                  </tr>
                </thead>
                <tbody>
                  {coverage?.zones.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="text-center text-muted">
                        No hay datos disponibles
                      </td>
                    </tr>
                  ) : (
                    coverage?.zones.map(zone => (
                      <tr key={zone.zone_id}>
                        <td>{zone.zone_name}</td>
                        <td>{zone.city_name}</td>
                        <td className="text-center">{zone.total_sellers}</td>
                        <td className="text-center">{zone.total_shopkeepers}</td>
                        <td>
                          <div className="d-flex align-items-center">
                            <div className="progress flex-grow-1 me-2" style={{ height: '20px' }}>
                              <div 
                                className={`progress-bar ${
                                  zone.coverage_percentage > 75 ? 'bg-success' :
                                  zone.coverage_percentage > 50 ? 'bg-warning' : 'bg-danger'
                                }`}
                                role="progressbar"
                                style={{ width: `${zone.coverage_percentage}%` }}
                              >
                                {zone.coverage_percentage.toFixed(1)}%
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Tabla de Rendimiento de Vendedores */}
      <Row>
        <Col>
          <Card>
            <Card.Header className="d-flex justify-content-between align-items-center">
              <strong>👥 Rendimiento de Vendedores</strong>
              <span className="text-muted">
                Promedio: {performance?.avg_shopkeepers_per_seller?.toFixed(1)} tenderos/vendedor
              </span>
            </Card.Header>
            <Card.Body>
              <Table striped bordered hover responsive>
                <thead>
                  <tr>
                    <th>Vendedor</th>
                    <th>Email</th>
                    <th>Zona</th>
                    <th>Tenderos</th>
                    <th>Eficiencia</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {performance?.sellers.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="text-center text-muted">
                        No hay datos disponibles
                      </td>
                    </tr>
                  ) : (
                    performance?.sellers.map(seller => (
                      <tr key={seller.seller_id}>
                        <td>{seller.seller_name}</td>
                        <td><small>{seller.seller_email}</small></td>
                        <td>{seller.zone_name}</td>
                        <td className="text-center">
                          <span className={seller.is_over_limit ? 'text-danger fw-bold' : ''}>
                            {seller.total_shopkeepers}
                          </span>
                          {seller.is_over_limit && ' ⚠️'}
                        </td>
                        <td>
                          <div className="d-flex align-items-center">
                            <div className="progress flex-grow-1 me-2" style={{ height: '20px' }}>
                              <div 
                                className={`progress-bar ${
                                  seller.efficiency_score > 75 ? 'bg-success' :
                                  seller.efficiency_score > 50 ? 'bg-warning' : 'bg-danger'
                                }`}
                                role="progressbar"
                                style={{ width: `${seller.efficiency_score}%` }}
                              >
                                {seller.efficiency_score.toFixed(0)}%
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>
                          {seller.is_over_limit ? (
                            <span className="badge bg-warning text-dark">Sobrecarga</span>
                          ) : seller.total_shopkeepers === 0 ? (
                            <span className="badge bg-secondary">Sin tenderos</span>
                          ) : (
                            <span className="badge bg-success">Normal</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Resumen Final */}
      <Row className="mt-4">
        <Col>
          <Alert variant={metrics?.system_health === 'healthy' ? 'success' : 'warning'}>
            <Alert.Heading>Estado del Sistema: {metrics?.system_health}</Alert.Heading>
            <hr />
            <p className="mb-0">
              <strong>Total de ciudades:</strong> {coverage?.total_cities} | 
              <strong> Total de zonas:</strong> {coverage?.total_zones} | 
              <strong> Total de vendedores:</strong> {coverage?.total_sellers} | 
              <strong> Total de tenderos:</strong> {coverage?.total_shopkeepers}
            </p>
          </Alert>
        </Col>
      </Row>
    </Container>
  );
};

export default ReportsPage;

