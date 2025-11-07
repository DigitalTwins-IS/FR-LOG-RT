/**
 * Página de Comparación de Ventas - HU11
 * Como administrador, quiero comparar ventas entre zonas y ciudades,
 * para detectar áreas de mayor desempeño.
 */
import { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Form, Alert, Badge } from 'react-bootstrap';
import { reportService } from '../services/api';
import { toast } from 'react-toastify';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';

// Registrar componentes de Chart.js
ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend);

const SalesComparisonPage = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [comparisonType, setComparisonType] = useState('both');

  useEffect(() => {
    loadData();
  }, [comparisonType]);

  const loadData = async () => {
    try {
      setLoading(true);
      const result = await reportService.getSalesComparison(comparisonType);
      setData(result);
    } catch (error) {
      toast.error('Error al cargar comparación de ventas');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getPerformanceColor = (score) => {
    if (score >= 80) return 'success';
    if (score >= 60) return 'warning';
    return 'danger';
  };

  const getPerformanceBadge = (score) => {
    if (score >= 80) return 'Excelente';
    if (score >= 60) return 'Bueno';
    return 'Mejorable';
  };

  const isZonesView = comparisonType !== 'cities';
  const isCitiesView = comparisonType !== 'zones';
  const zonesData = data?.zones ?? [];
  const citiesData = data?.cities ?? [];
  const topZones = data?.top_zones ?? [];
  const topCities = data?.top_cities ?? [];

  const totalZoneShopkeepers = zonesData.reduce((acc, z) => acc + (z.total_shopkeepers || 0), 0);
  const totalCityShopkeepers = citiesData.reduce((acc, c) => acc + (c.total_shopkeepers || 0), 0);
  const totalZoneSellers = zonesData.reduce((acc, z) => acc + (z.total_sellers || 0), 0);
  const totalCitySellers = citiesData.reduce((acc, c) => acc + (c.total_sellers || 0), 0);
  const avgZoneLoad = totalZoneSellers ? totalZoneShopkeepers / totalZoneSellers : 0;
  const avgCityLoad = totalCitySellers ? totalCityShopkeepers / totalCitySellers : 0;
  const avgZoneScore = zonesData.length ? zonesData.reduce((acc, z) => acc + (z.performance_score || 0), 0) / zonesData.length : 0;
  const avgCityScore = citiesData.length ? citiesData.reduce((acc, c) => acc + (c.performance_score || 0), 0) / citiesData.length : 0;

  // Datos para gráfico de zonas
  const zonesChartData = zonesData.length ? {
    labels: zonesData.map(z => z.zone_name),
    datasets: [
      {
        label: 'Tenderos Asignados',
        data: zonesData.map(z => z.total_shopkeepers),
        backgroundColor: 'rgba(54, 162, 235, 0.6)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1
      },
      {
        label: 'Score de Desempeño',
        data: zonesData.map(z => z.performance_score),
        backgroundColor: 'rgba(75, 192, 192, 0.6)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 1,
        yAxisID: 'y1',
      }
    ]
  } : null;

  // Datos para gráfico de ciudades
  const citiesChartData = citiesData.length ? {
    labels: citiesData.map(c => c.city_name),
    datasets: [
      {
        label: 'Tenderos Asignados',
        data: citiesData.map(c => c.total_shopkeepers),
        backgroundColor: 'rgba(255, 99, 132, 0.6)',
        borderColor: 'rgba(255, 99, 132, 1)',
        borderWidth: 1
      },
      {
        label: 'Total Vendedores',
        data: citiesData.map(c => c.total_sellers),
        backgroundColor: 'rgba(255, 206, 86, 0.6)',
        borderColor: 'rgba(255, 206, 86, 1)',
        borderWidth: 1
      }
    ]
  } : null;

  // Datos para gráfico de líneas de desempeño
  const performanceChartData = zonesData.length ? {
    labels: zonesData.map(z => z.zone_name),
    datasets: [
      {
        label: 'Score de Desempeño',
        data: zonesData.map(z => z.performance_score),
        borderColor: 'rgba(75, 192, 192, 1)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.4,
        fill: true
      },
      {
        label: 'Penetración de Mercado',
        data: zonesData.map(z => z.market_penetration),
        borderColor: 'rgba(153, 102, 255, 1)',
        backgroundColor: 'rgba(153, 102, 255, 0.2)',
        tension: 0.4,
        fill: true
      }
    ]
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
          <h2>📊 Comparación de Ventas por Zonas y Ciudades</h2>
          <p className="text-muted">Detecta áreas de mayor desempeño - HU11</p>
        </Col>
        <Col md={4} className="text-end">
          <Form.Select
            value={comparisonType}
            onChange={(e) => setComparisonType(e.target.value)}
            style={{ display: 'inline-block', width: 'auto' }}
          >
            <option value="both">Zonas y Ciudades</option>
            <option value="zones">Solo Zonas</option>
            <option value="cities">Solo Ciudades</option>
          </Form.Select>
        </Col>
      </Row>

      {/* Top Performers */}
      {(isZonesView && topZones.length > 0) || (isCitiesView && topCities.length > 0) ? (
        <Row className="mb-4">
          <Col>
            <Alert variant="success">
              <Alert.Heading>🏆 Áreas de Mayor Desempeño</Alert.Heading>
              <Row>
                {isZonesView && topZones.length > 0 && (
                  <Col md={6} className="mb-3 mb-md-0">
                    <h6 className="text-success">Zonas destacadas</h6>
                    <div className="d-flex gap-2 flex-wrap">
                      {topZones.map((item, index) => (
                        <Badge key={item.zone_id} bg="success" className="p-2" style={{ fontSize: '0.95rem' }}>
                          {index + 1}. {item.zone_name} · {item.city_name} · {item.performance_score.toFixed(1)}%
                        </Badge>
                      ))}
                    </div>
                  </Col>
                )}
                {isCitiesView && topCities.length > 0 && (
                  <Col md={6}>
                    <h6 className="text-primary">Ciudades destacadas</h6>
                    <div className="d-flex gap-2 flex-wrap">
                      {topCities.map((city, index) => (
                        <Badge key={city.city_id} bg="primary" className="p-2" style={{ fontSize: '0.95rem' }}>
                          {index + 1}. {city.city_name} · {city.performance_score.toFixed(1)}%
                        </Badge>
                      ))}
                    </div>
                  </Col>
                )}
              </Row>
            </Alert>
          </Col>
        </Row>
      ) : null}

      {/* Métricas Generales */}
      <Row className="mb-4">
        <Col md={6}>
          <Card className="text-center border-primary">
            <Card.Body>
              <h5 className="text-muted">Zonas Analizadas</h5>
              <h2 className="text-primary">{zonesData.length}</h2>
              <p className="mb-0 small text-muted">Score promedio: {avgZoneScore.toFixed(1)}%</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={6}>
          <Card className="text-center border-success">
            <Card.Body>
              <h5 className="text-muted">Ciudades Analizadas</h5>
              <h2 className="text-success">{citiesData.length}</h2>
              <p className="mb-0 small text-muted">Score promedio: {avgCityScore.toFixed(1)}%</p>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      <Row className="mb-4">
        {isZonesView && (
          <Col md={6} className="mb-3 mb-md-0">
            <Card className="border-info">
              <Card.Body>
                <h6 className="text-info">Impacto en Zonas</h6>
                <p className="mb-1"><strong>Total tenderos:</strong> {totalZoneShopkeepers}</p>
                <p className="mb-0"><strong>Promedio tenderos/vendedor:</strong> {avgZoneLoad.toFixed(1)}</p>
              </Card.Body>
            </Card>
          </Col>
        )}
        {isCitiesView && (
          <Col md={6}>
            <Card className="border-warning">
              <Card.Body>
                <h6 className="text-warning">Impacto en Ciudades</h6>
                <p className="mb-1"><strong>Total tenderos:</strong> {totalCityShopkeepers}</p>
                <p className="mb-0"><strong>Promedio tenderos/vendedor:</strong> {avgCityLoad.toFixed(1)}</p>
              </Card.Body>
            </Card>
          </Col>
        )}
      </Row>

      {/* Gráficos de Zonas */}
      {isZonesView && zonesData.length > 0 && (
        <>
          <Row className="mb-4">
            <Col>
              <Card>
                <Card.Header>
                  <strong>📈 Comparación de Zonas - Actividad de Mercado</strong>
                </Card.Header>
                <Card.Body>
                  {zonesChartData && (
                    <Bar 
                      data={zonesChartData}
                      options={{
                        responsive: true,
                        plugins: {
                          legend: {
                            position: 'top',
                          },
                          title: {
                            display: true,
                            text: 'Tenderos Asignados por Zona'
                          }
                        },
                        scales: {
                          y: {
                            beginAtZero: true,
                            title: {
                              display: true,
                              text: 'Cantidad de Tenderos'
                            }
                          },
                          y1: {
                            type: 'linear',
                            position: 'right',
                            beginAtZero: true,
                            max: 100,
                            title: {
                              display: true,
                              text: 'Score de Desempeño (%)'
                            }
                          }
                        }
                      }}
                    />
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <Row className="mb-4">
            <Col>
              <Card>
                <Card.Header>
                  <strong>📊 Tendencias de Desempeño</strong>
                </Card.Header>
                <Card.Body>
                  {performanceChartData && (
                    <Line 
                      data={performanceChartData}
                      options={{
                        responsive: true,
                        plugins: {
                          legend: {
                            position: 'top',
                          },
                          title: {
                            display: true,
                            text: 'Score de Desempeño y Penetración de Mercado'
                          }
                        },
                        scales: {
                          y: {
                            beginAtZero: true,
                            title: {
                              display: true,
                              text: 'Valor'
                            }
                          }
                        }
                      }}
                    />
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </>
      )}

      {/* Gráfico de Ciudades */}
      {isCitiesView && citiesData.length > 0 && (
        <Row className="mb-4">
          <Col>
            <Card>
              <Card.Header>
                <strong>🏙️ Comparación de Ciudades</strong>
              </Card.Header>
              <Card.Body>
                {citiesChartData && (
                  <Bar 
                    data={citiesChartData}
                    options={{
                      responsive: true,
                      plugins: {
                        legend: {
                          position: 'top',
                        },
                        title: {
                          display: true,
                          text: 'Distribución por Ciudad'
                        }
                      },
                      scales: {
                        y: {
                          beginAtZero: true,
                          title: {
                            display: true,
                            text: 'Cantidad'
                          }
                        }
                      }
                    }}
                  />
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {/* Tabla de Comparación por Zonas */}
      {isZonesView && (
        <Row className="mb-4">
          <Col>
            <Card>
              <Card.Header>
                <strong>📍 Comparación de Zonas</strong>
              </Card.Header>
              <Card.Body>
                <Table striped bordered hover responsive>
                  <thead>
                    <tr>
                      <th>Zona</th>
                      <th>Ciudad</th>
                      <th>Tenderos</th>
                      <th>Vendedores</th>
                      <th>Penetración</th>
                      <th>Score</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {zonesData.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="text-center text-muted">
                          No hay datos disponibles
                        </td>
                      </tr>
                    ) : (
                      zonesData.map(zone => (
                        <tr key={zone.zone_id}>
                          <td><strong>{zone.zone_name}</strong></td>
                          <td>{zone.city_name}</td>
                          <td className="text-center">
                            <Badge bg="info">{zone.total_shopkeepers}</Badge>
                          </td>
                          <td className="text-center">
                            <Badge bg="secondary">{zone.total_sellers}</Badge>
                          </td>
                          <td className="text-center">
                            {zone.market_penetration.toFixed(1)}
                          </td>
                          <td>
                            <div className="d-flex align-items-center">
                              <div className="progress flex-grow-1" style={{ height: '20px' }}>
                                <div 
                                  className={`progress-bar bg-${getPerformanceColor(zone.performance_score)}`}
                                  role="progressbar"
                                  style={{ width: `${zone.performance_score}%` }}
                                >
                                  {zone.performance_score.toFixed(1)}%
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="text-center">
                            <Badge bg={getPerformanceColor(zone.performance_score)}>
                              {getPerformanceBadge(zone.performance_score)}
                            </Badge>
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
      )}

      {/* Tabla de Comparación por Ciudades */}
      {isCitiesView && (
        <Row className="mb-4">
          <Col>
            <Card>
              <Card.Header>
                <strong>🏙️ Comparación de Ciudades</strong>
              </Card.Header>
              <Card.Body>
                <Table striped bordered hover responsive>
                  <thead>
                    <tr>
                      <th>Ciudad</th>
                      <th>Zonas</th>
                      <th>Tenderos</th>
                      <th>Vendedores</th>
                      <th>Penetración</th>
                      <th>Score</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {citiesData.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="text-center text-muted">
                          No hay datos disponibles
                        </td>
                      </tr>
                    ) : (
                      citiesData.map(city => (
                        <tr key={city.city_id}>
                          <td><strong>{city.city_name}</strong></td>
                          <td className="text-center">
                            <Badge bg="primary">{city.total_zones}</Badge>
                          </td>
                          <td className="text-center">
                            <Badge bg="info">{city.total_shopkeepers}</Badge>
                          </td>
                          <td className="text-center">
                            <Badge bg="secondary">{city.total_sellers}</Badge>
                          </td>
                          <td className="text-center">
                            {city.market_penetration.toFixed(1)}
                          </td>
                          <td>
                            <div className="d-flex align-items-center">
                              <div className="progress flex-grow-1" style={{ height: '20px' }}>
                                <div 
                                  className={`progress-bar bg-${getPerformanceColor(city.performance_score)}`}
                                  role="progressbar"
                                  style={{ width: `${city.performance_score}%` }}
                                >
                                  {city.performance_score.toFixed(1)}%
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="text-center">
                            <Badge bg={getPerformanceColor(city.performance_score)}>
                              {getPerformanceBadge(city.performance_score)}
                            </Badge>
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
      )}

      {/* Información del Reporte */}
      <Row className="mt-4">
        <Col>
          <Alert variant="info">
            <Alert.Heading>📅 Información del Reporte</Alert.Heading>
            <hr />
            <p className="mb-0">
              <strong>Fecha de generación:</strong> {new Date(data?.report_date).toLocaleString('es-CO')}
              <br />
              <strong>Tipo de comparación:</strong> {comparisonType === 'both' ? 'Zonas y Ciudades' : comparisonType === 'zones' ? 'Solo Zonas' : 'Solo Ciudades'}
            </p>
          </Alert>
        </Col>
      </Row>
    </Container>
  );
};

export default SalesComparisonPage;
