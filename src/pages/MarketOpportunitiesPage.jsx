/**
 * Página: Análisis de Oportunidades de Mercado (HU19)
 * Combina inventarios, zonas y visitas para mostrar brechas estratégicas.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Container,
  Row,
  Col,
  Card,
  Form,
  Button,
  Table,
  Badge,
  Alert,
  Spinner
} from 'react-bootstrap';
import { toast } from 'react-toastify';
import { Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { reportService, geoService } from '../services/api';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const initialFilters = {
  cityId: '',
  zoneId: '',
  category: '',
  startDate: '',
  endDate: '',
  popularityThreshold: 0.4,
  minMissing: 1
};

const formatCurrency = (value) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0
  }).format(value || 0);

const MarketOpportunitiesPage = () => {
  const [loading, setLoading] = useState(true);
  const [cities, setCities] = useState([]);
  const [zones, setZones] = useState([]);
  const [data, setData] = useState(null);
  const [filters, setFilters] = useState(initialFilters);

  useEffect(() => {
    const loadMetadata = async () => {
      try {
        setLoading(true);
        const [citiesResponse, zonesResponse] = await Promise.all([
          geoService.getCities(),
          geoService.getZones()
        ]);
        setCities(citiesResponse);
        setZones(zonesResponse);
        await fetchData(initialFilters);
      } catch (error) {
        console.error(error);
        toast.error('No fue posible cargar el análisis de mercado');
      } finally {
        setLoading(false);
      }
    };

    loadMetadata();
  }, []);

  const fetchData = async (currentFilters = filters) => {
    try {
      setLoading(true);
      const response = await reportService.getMarketOpportunities({
        cityId: currentFilters.cityId || undefined,
        zoneId: currentFilters.zoneId || undefined,
        category: currentFilters.category || undefined,
        startDate: currentFilters.startDate || undefined,
        endDate: currentFilters.endDate || undefined,
        popularityThreshold: currentFilters.popularityThreshold,
        minMissing: currentFilters.minMissing
      });
      setData(response);
    } catch (error) {
      console.error(error);
      toast.error('Ocurrió un error generando el análisis');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleApplyFilters = async () => {
    await fetchData(filters);
  };

  const handleResetFilters = async () => {
    setFilters(initialFilters);
    await fetchData(initialFilters);
  };

  const handleExportCsv = () => {
    if (!data?.missing_popular_products?.length) {
      toast.info('No hay datos para exportar');
      return;
    }
    const headers = [
      'Producto',
      'Categoría',
      'Popularidad',
      'Tenderos sin stock',
      'Zonas impactadas',
      'Potencial mensual',
      'Prioridad'
    ];
    const rows = data.missing_popular_products.map((item) => [
      item.product_name,
      item.category || 'N/A',
      `${(item.global_popularity * 100).toFixed(1)}%`,
      item.missing_shopkeepers,
      item.impacted_zones.join(' / '),
      item.potential_monthly_revenue,
      item.priority
    ]);
    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `oportunidades_mercado_${new Date().toISOString().slice(0, 10)}.csv`);
    link.click();
    URL.revokeObjectURL(url);
  };

  const filteredZones = useMemo(() => {
    if (!filters.cityId) return zones;
    return zones.filter((zone) => zone.city_id === Number(filters.cityId));
  }, [filters.cityId, zones]);

  const topMissingProducts = useMemo(
    () => data?.missing_popular_products?.slice(0, 6) || [],
    [data]
  );

  const barChartData = useMemo(() => {
    if (!topMissingProducts.length) return null;
    return {
      labels: topMissingProducts.map((item) => item.product_name),
      datasets: [
        {
          label: 'Tenderos sin stock',
          data: topMissingProducts.map((item) => item.missing_shopkeepers),
          backgroundColor: 'rgba(40, 167, 69, 0.7)'
        },
        {
          label: 'Popularidad %',
          data: topMissingProducts.map((item) => item.global_popularity * 100),
          backgroundColor: 'rgba(0, 123, 255, 0.5)'
        }
      ]
    };
  }, [topMissingProducts]);

  const lineChartData = useMemo(() => {
    if (!data?.demand_trends) return null;
    const timeline = data.demand_trends.timeline || [];
    const forecast = data.demand_trends.forecast || [];
    const labels = [
      ...timeline.map((point) => point.label),
      ...forecast.map((point) => point.label)
    ];
    if (!labels.length) return null;
    const actualDemandMap = timeline.reduce((acc, point) => {
      acc[point.label] = point.total_demand;
      return acc;
    }, {});
    const forecastMap = forecast.reduce((acc, point) => {
      acc[point.label] = point.expected_demand;
      return acc;
    }, {});
    return {
      labels,
      datasets: [
        {
          label: 'Demanda observada',
          data: labels.map((label) => actualDemandMap[label] ?? null),
          borderColor: 'rgba(40, 167, 69, 1)',
          backgroundColor: 'rgba(40, 167, 69, 0.2)',
          tension: 0.3
        },
        {
          label: 'Demanda proyectada',
          data: labels.map((label) => forecastMap[label] ?? null),
          borderColor: 'rgba(255, 193, 7, 1)',
          borderDash: [6, 6],
          tension: 0.3
        }
      ]
    };
  }, [data]);

  const summary = data?.summary;

  return (
    <Container className="mt-4">
      <Row className="mb-4">
        <Col>
          <h2>📈 Oportunidades de Mercado</h2>
          <p className="text-muted">
            Identifica productos populares faltantes, tendencias por zona y recomendaciones estratégicas.
          </p>
        </Col>
        <Col className="text-end">
          <Button variant="outline-success" onClick={handleExportCsv}>
            Exportar CSV
          </Button>
        </Col>
      </Row>

      {/* Filtros */}
      <Card className="mb-4">
        <Card.Header>Filtros</Card.Header>
        <Card.Body>
          <Row className="g-3">
            <Col md={3}>
              <Form.Group>
                <Form.Label>Ciudad</Form.Label>
                <Form.Select
                  value={filters.cityId}
                  onChange={(e) => handleFilterChange('cityId', e.target.value)}
                >
                  <option value="">Todas</option>
                  {cities.map((city) => (
                    <option key={city.id} value={city.id}>
                      {city.name}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label>Zona</Form.Label>
                <Form.Select
                  value={filters.zoneId}
                  onChange={(e) => handleFilterChange('zoneId', e.target.value)}
                >
                  <option value="">Todas</option>
                  {filteredZones.map((zone) => (
                    <option key={zone.id} value={zone.id}>
                      {zone.name}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label>Categoría</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Ej: Bebidas"
                  value={filters.category}
                  onChange={(e) => handleFilterChange('category', e.target.value)}
                />
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label>Umbral de popularidad</Form.Label>
                <Form.Range
                  min={0.1}
                  max={1}
                  step={0.05}
                  value={filters.popularityThreshold}
                  onChange={(e) =>
                    handleFilterChange('popularityThreshold', Number(e.target.value))
                  }
                />
                <small className="text-muted">
                  {Math.round(filters.popularityThreshold * 100)}% mínimo
                </small>
              </Form.Group>
            </Col>
          </Row>

          <Row className="g-3 mt-1">
            <Col md={3}>
              <Form.Group>
                <Form.Label>Fecha inicio</Form.Label>
                <Form.Control
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => handleFilterChange('startDate', e.target.value)}
                />
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label>Fecha fin</Form.Label>
                <Form.Control
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => handleFilterChange('endDate', e.target.value)}
                />
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label>Mínimo de tenderos sin stock</Form.Label>
                <Form.Control
                  type="number"
                  min={1}
                  value={filters.minMissing}
                  onChange={(e) => handleFilterChange('minMissing', Number(e.target.value))}
                />
              </Form.Group>
            </Col>
            <Col md={3} className="d-flex align-items-end justify-content-end gap-2">
              <Button variant="primary" onClick={handleApplyFilters}>
                Aplicar
              </Button>
              <Button variant="secondary" onClick={handleResetFilters}>
                Limpiar
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {loading && (
        <div className="text-center py-5">
          <Spinner animation="border" role="status" />
          <p className="mt-2">Generando análisis...</p>
        </div>
      )}

      {!loading && !data && (
        <Alert variant="warning">No se pudo obtener información en este momento.</Alert>
      )}

      {!loading && data && (
        <>
          {/* Resumen */}
          <Row className="mb-4 g-3">
            <Col md={4}>
              <Card className="text-center">
                <Card.Body>
                  <Card.Title>Productos con brecha</Card.Title>
                  <h3>{summary?.total_products_missing ?? 0}</h3>
                </Card.Body>
              </Card>
            </Col>
            <Col md={4}>
              <Card className="text-center">
                <Card.Body>
                  <Card.Title>Tenderos impactados</Card.Title>
                  <h3>{summary?.total_impacted_shopkeepers ?? 0}</h3>
                </Card.Body>
              </Card>
            </Col>
            <Col md={4}>
              <Card className="text-center">
                <Card.Body>
                  <Card.Title>Potencial mensual</Card.Title>
                  <h3>{formatCurrency(summary?.estimated_monthly_revenue)}</h3>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* Gráficos */}
          <Row className="mb-4 g-3">
            <Col md={6}>
              <Card>
                <Card.Header>Productos populares faltantes</Card.Header>
                <Card.Body style={{ minHeight: 360 }}>
                  {barChartData ? (
                    <Bar
                      data={barChartData}
                      options={{
                        responsive: true,
                        plugins: { legend: { position: 'top' } }
                      }}
                    />
                  ) : (
                    <p className="text-muted">Sin datos suficientes.</p>
                  )}
                </Card.Body>
              </Card>
            </Col>
            <Col md={6}>
              <Card>
                <Card.Header>Tendencia de demanda</Card.Header>
                <Card.Body style={{ minHeight: 360 }}>
                  {lineChartData ? (
                    <Line
                      data={lineChartData}
                      options={{
                        responsive: true,
                        plugins: { legend: { position: 'top' } }
                      }}
                    />
                  ) : (
                    <p className="text-muted">Sin datos de visitas para mostrar tendencia.</p>
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* Tabla productos faltantes */}
          <Card className="mb-4">
            <Card.Header>Productos con oportunidades</Card.Header>
            <Card.Body className="table-responsive">
              {data.missing_popular_products?.length ? (
                <Table hover responsive>
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th>Popularidad</th>
                      <th>Tenderos sin stock</th>
                      <th>Zonas impactadas</th>
                      <th>Potencial mensual</th>
                      <th>Prioridad</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.missing_popular_products.map((item) => (
                      <tr key={item.product_id}>
                        <td>
                          <div className="fw-semibold">{item.product_name}</div>
                          <small className="text-muted">{item.category || 'Sin categoría'}</small>
                        </td>
                        <td>{(item.global_popularity * 100).toFixed(1)}%</td>
                        <td>{item.missing_shopkeepers}</td>
                        <td>{item.impacted_zones.join(', ')}</td>
                        <td>{formatCurrency(item.potential_monthly_revenue)}</td>
                        <td>
                          <Badge
                            bg={
                              item.priority === 'high'
                                ? 'danger'
                                : item.priority === 'medium'
                                ? 'warning'
                                : 'secondary'
                            }
                          >
                            {item.priority.toUpperCase()}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              ) : (
                <Alert variant="info">No se detectaron productos con brechas significativas.</Alert>
              )}
            </Card.Body>
          </Card>

          {/* Insights por zona */}
          <Row className="mb-4 g-3">
            {data.zone_trends?.map((zone) => (
              <Col md={6} key={`${zone.zone_id}-${zone.zone_name}`}>
                <Card>
                  <Card.Header>
                    {zone.zone_name}{' '}
                    <small className="text-muted">
                      {zone.city_name ? `- ${zone.city_name}` : ''}
                    </small>
                  </Card.Header>
                  <Card.Body>
                    <p className="mb-1">
                      <strong>Tenderos analizados:</strong> {zone.shopkeepers_covered}
                    </p>
                    <p className="mb-1">
                      <strong>Gap promedio:</strong> {zone.avg_stock_gap.toFixed(1)} unidades
                    </p>
                    <p className="mb-3">
                      <strong>Variación de demanda:</strong> {zone.demand_variation.toFixed(1)}%
                    </p>
                    <h6>Top demandas</h6>
                    <ul className="mb-0">
                      {zone.top_demands.map((product) => (
                        <li key={product.product_id}>
                          {product.product_name}:{' '}
                          <strong>{product.stock_gap.toFixed(1)} u.</strong>{' '}
                          <Badge bg="light" text="dark">
                            +{product.growth_percentage.toFixed(1)}%
                          </Badge>
                        </li>
                      ))}
                      {!zone.top_demands.length && (
                        <li className="text-muted">Sin productos destacados.</li>
                      )}
                    </ul>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>

          {/* Recomendaciones */}
          <Card className="mb-5">
            <Card.Header>Recomendaciones Estratégicas</Card.Header>
            <Card.Body>
              {data.recommendations?.length ? (
                data.recommendations.map((rec) => (
                  <Card key={rec.id} className="mb-3 shadow-sm border-light">
                    <Card.Body>
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <div>
                          <Badge bg="primary" className="me-2 text-uppercase">
                            {rec.type}
                          </Badge>
                          <Badge bg="info" text="dark" className="me-2">
                            Impacto: {rec.impact}
                          </Badge>
                          <Badge bg="warning" text="dark">
                            Urgencia: {rec.urgency}
                          </Badge>
                        </div>
                        <small className="text-muted">{rec.id}</small>
                      </div>
                      <h6 className="mb-1">{rec.message}</h6>
                      <p className="text-muted mb-0">{rec.rationale}</p>
                    </Card.Body>
                  </Card>
                ))
              ) : (
                <Alert variant="light">No se generaron recomendaciones para los filtros seleccionados.</Alert>
              )}
            </Card.Body>
          </Card>
        </>
      )}
    </Container>
  );
};

export default MarketOpportunitiesPage;

