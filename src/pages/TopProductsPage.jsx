/**
 * Página HU10 - Top de productos por zona
 * Permite a los vendedores identificar los productos de mayor rotación
 * en su zona para priorizar el surtido.
 */
import { useEffect, useState, useMemo } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Badge, Table, Spinner } from 'react-bootstrap';
import { Bar } from 'react-chartjs-2';
import { reportService, userService, geoService } from '../services/api';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ChartDataLabels);

const colorPalette = {
  primary: 'rgba(13, 110, 253, 0.85)',
  primaryBorder: 'rgba(13, 110, 253, 1)',
  info: 'rgba(13, 202, 240, 0.85)',
  infoBorder: 'rgba(13, 202, 240, 1)',
  warning: 'rgba(255, 193, 7, 0.85)',
  warningBorder: 'rgba(255, 193, 7, 1)',
  danger: 'rgba(220, 76, 100, 0.85)',
  dangerBorder: 'rgba(220, 76, 100, 1)',
  success: 'rgba(25, 135, 84, 0.85)',
  successBorder: 'rgba(25, 135, 84, 1)',
};

const TopProductsPage = () => {
  const { user, isVendedor } = useAuth();
  const [loading, setLoading] = useState(false);
  const [filtersLoading, setFiltersLoading] = useState(true);
  const [zones, setZones] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [selectedZone, setSelectedZone] = useState('');
  const [selectedSeller, setSelectedSeller] = useState('');
  const [limit, setLimit] = useState(3);
  const [data, setData] = useState(null);

  useEffect(() => {
    const loadFilters = async () => {
      try {
        setFiltersLoading(true);
        const [zonesData, sellersData] = await Promise.all([
          geoService.getZones(),
          userService.getSellers(null, true)
        ]);
        setZones(zonesData);
        setSellers(sellersData);
      } catch (error) {
        toast.error('No fue posible cargar las zonas y vendedores');
        console.error(error);
      } finally {
        setFiltersLoading(false);
      }
    };

    loadFilters();
  }, []);

  useEffect(() => {
    if (!selectedSeller || !sellers.length) return;
    const seller = sellers.find((s) => String(s.id) === String(selectedSeller));
    if (seller?.zone_id) {
      setSelectedZone(String(seller.zone_id));
    }
  }, [selectedSeller, sellers]);

  useEffect(() => {
    if (!isVendedor() || !user?.id || !sellers.length) return;
    const sellerMatch = sellers.find((s) => s.user_id === user.id);
    if (sellerMatch) {
      setSelectedSeller(String(sellerMatch.id));
      if (sellerMatch.zone_id) {
        setSelectedZone(String(sellerMatch.zone_id));
      }
    }
  }, [isVendedor, user, sellers]);

  const handleFetch = async () => {
    if (!selectedZone && !selectedSeller) {
      toast.warning('Selecciona al menos una zona o un vendedor');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        limit: Number(limit) || 3,
      };
      if (selectedZone) {
        payload.zoneId = Number(selectedZone);
      }
      if (selectedSeller) {
        payload.sellerId = Number(selectedSeller);
      }
      const response = await reportService.getTopProducts(payload);
      setData(response);
      if (!response.items?.length) {
        toast.info('No se encontraron productos para los filtros seleccionados');
      } else {
        toast.success('Ranking generado correctamente');
      }
    } catch (error) {
      console.error(error);
      toast.error('No se pudo obtener el ranking de productos');
    } finally {
      setLoading(false);
    }
  };

  const productsChart = useMemo(() => {
    if (!data?.items?.length) return null;
    return {
      labels: data.items.map((item) => item.product_name),
      datasets: [
        {
          label: 'Unidades a reponer',
          data: data.items.map((item) => item.total_units_needed),
          backgroundColor: colorPalette.primary,
          borderColor: colorPalette.primaryBorder,
          borderWidth: 2,
          borderRadius: 6,
        },
        {
          label: 'Stock actual',
          data: data.items.map((item) => item.total_current_stock),
          backgroundColor: colorPalette.info,
          borderColor: colorPalette.infoBorder,
          borderWidth: 2,
          borderRadius: 6,
        }
      ]
    };
  }, [data]);

  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          font: { size: 12, weight: 'bold' },
          padding: 15,
        }
      },
      title: {
        display: true,
        text: 'Productos con mayor movimiento',
        font: { size: 16, weight: 'bold' },
        padding: { bottom: 20 },
      },
      datalabels: {
        anchor: 'end',
        align: 'top',
        color: '#343a40',
        font: {
          weight: 'bold',
          size: 11,
        },
        formatter: (value) => `${Number(value).toFixed(1)}`,
      },
    },
    scales: {
      x: {
        ticks: {
          font: { size: 11 },
        }
      },
      y: {
        beginAtZero: true,
        ticks: {
          font: { size: 11 },
        },
        title: {
          display: true,
          text: 'Unidades',
          font: { size: 12, weight: 'bold' },
        }
      }
    }
  }), [data]);

  const getSeverityColor = (value) => {
    if (value >= 80) return 'warning';  // Cambiado de 'danger' a 'warning' para rojo menos intenso
    if (value >= 40) return 'info';     // Cambiado de 'warning' a 'info' para mejor gradación
    return 'success';
  };
  
  const getSeverityBadgeStyle = (value) => {
    if (value >= 80) {
      return { backgroundColor: '#f8a5a5', color: '#721c24', border: '1px solid #e57373' }; // Rojo suave
    }
    if (value >= 40) {
      return { backgroundColor: '#ffe69c', color: '#856404', border: '1px solid #ffc107' }; // Amarillo suave
    }
    return { backgroundColor: '#a3e4d7', color: '#155724', border: '1px solid #28a745' }; // Verde suave
  };

  return (
    <Container className="mt-4">
      <Row className="mb-4">
        <Col md={8}>
          <h2>🛒 Top de Productos por Zona (HU10)</h2>
          <p className="text-muted mb-0">
            Identifica los productos con mayor rotación en tu zona para priorizar el surtido.
          </p>
        </Col>
      </Row>

      <Card className="mb-4 shadow-sm">
        <Card.Body>
          <Row className="g-3 align-items-end">
            <Col md={4}>
              <Form.Group controlId="sellerSelect">
                <Form.Label>Vendedor</Form.Label>
                <Form.Select
                  value={selectedSeller}
                  onChange={(e) => setSelectedSeller(e.target.value)}
                  disabled={filtersLoading}
                >
                  <option value="">Todos los vendedores de la zona</option>
                  {sellers.map((seller) => (
                    <option key={seller.id} value={seller.id}>
                      {seller.name} {seller.zone_name ? `· ${seller.zone_name}` : ''}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>

            <Col md={4}>
              <Form.Group controlId="zoneSelect">
                <Form.Label>Zona</Form.Label>
                <Form.Select
                  value={selectedZone}
                  onChange={(e) => setSelectedZone(e.target.value)}
                  disabled={filtersLoading}
                >
                  <option value="">Selecciona una zona</option>
                  {zones.map((zone) => (
                    <option key={zone.id} value={zone.id}>
                      {zone.name} · {zone.city_name || 'Sin ciudad'}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>

            <Col md={2}>
              <Form.Group controlId="limitSelect">
                <Form.Label>Top</Form.Label>
                <Form.Select value={limit} onChange={(e) => setLimit(e.target.value)}>
                  {[3, 5, 7, 10].map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>

            <Col md={2} className="text-end">
              <Button
                variant="primary"
                className="w-100"
                onClick={handleFetch}
                disabled={loading || filtersLoading}
              >
                {loading ? <Spinner animation="border" size="sm" /> : 'Ver ranking'}
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {data && (
        <>
          <Row className="mb-4">
            <Col md={4} className="mb-3 mb-md-0">
              <Card className="text-center shadow-sm" style={{ borderTop: '4px solid #0d6efd' }}>
                <Card.Body>
                  <h6 className="text-muted">Zona analizada</h6>
                  <h3 className="text-primary fw-bold mb-1">{data.zone_name || `Zona ${data.zone_id}`}</h3>
                  <p className="mb-0 text-muted small">
                    Total tenderos analizados:{' '}
                    <strong className="text-dark">{data.total_shopkeepers}</strong>
                  </p>
                </Card.Body>
              </Card>
            </Col>
            <Col md={4} className="mb-3 mb-md-0">
              <Card className="text-center shadow-sm" style={{ borderTop: '4px solid #198754' }}>
                <Card.Body>
                  <h6 className="text-muted">Productos evaluados</h6>
                  <h3 className="text-success fw-bold mb-1">{data.total_products}</h3>
                  <p className="mb-0 text-muted small">
                    Generado el{' '}
                    <strong>{new Date(data.generated_at).toLocaleDateString('es-CO')}</strong>
                  </p>
                </Card.Body>
              </Card>
            </Col>
            <Col md={4}>
              <Card className="text-center shadow-sm" style={{ borderTop: '4px solid #ffc107' }}>
                <Card.Body>
                  <h6 className="text-muted">Vendedor seleccionado</h6>
                  <h5 className="fw-bold mb-1">
                    {data.seller_name || 'Todos los vendedores de la zona'}
                  </h5>
                  <p className="mb-0 text-muted small">
                    ID vendedor: {data.seller_id || 'N/A'}
                  </p>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {data.items?.length > 0 && (
            <Row className="mb-4">
              <Col>
                <Alert variant="success" className="shadow-sm">
                  <Alert.Heading>🎯 Productos destacados</Alert.Heading>
                  <div className="d-flex flex-wrap gap-2">
                    {data.items.map((item) => (
                      <Badge
                        key={item.product_id}
                        className="p-2"
                        style={{ 
                          fontSize: '0.95rem',
                          ...getSeverityBadgeStyle(item.total_units_needed)
                        }}
                      >
                        #{item.rank} · {item.product_name} · {item.total_units_needed.toFixed(1)} u
                      </Badge>
                    ))}
                  </div>
                </Alert>
              </Col>
            </Row>
          )}

          {productsChart && (
            <Row className="mb-4">
              <Col>
                <Card className="shadow-sm">
                  <Card.Body>
                    <Bar data={productsChart} options={chartOptions} />
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          )}

          <Row className="mb-4">
            <Col>
              <Card className="shadow-sm">
                <Card.Header>
                  <strong>📋 Detalle del ranking</strong>
                </Card.Header>
                <Card.Body className="p-0">
                  <Table responsive hover className="mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>#</th>
                        <th>Producto</th>
                        <th>Categoría</th>
                        <th>Tenderos</th>
                        <th>Stock actual</th>
                        <th>Unidades a reponer</th>
                        <th>Precio prom.</th>
                        <th>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.items?.length ? (
                        data.items.map((item) => (
                          <tr key={item.product_id}>
                            <td className="fw-bold">#{item.rank}</td>
                            <td>
                              <div className="fw-semibold">{item.product_name}</div>
                              <small className="text-muted">ID: {item.product_id}</small>
                            </td>
                            <td>{item.category || 'Sin categoría'}</td>
                            <td>
                              <Badge bg="secondary">{item.shopkeepers_count}</Badge>
                            </td>
                            <td>{item.total_current_stock.toFixed(1)} u</td>
                            <td>
                              <Badge 
                                style={getSeverityBadgeStyle(item.total_units_needed)}
                              >
                                {item.total_units_needed.toFixed(1)} u
                              </Badge>
                            </td>
                            <td>${item.avg_unit_price.toLocaleString('es-CO')}</td>
                            <td>
                              <Badge
                                bg={item.low_stock_shopkeepers > 0 ? 'warning' : 'success'}
                                text={item.low_stock_shopkeepers > 0 ? 'dark' : undefined}
                              >
                                {item.low_stock_shopkeepers > 0
                                  ? `${item.low_stock_shopkeepers} con bajo stock`
                                  : 'Stock saludable'}
                              </Badge>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={8} className="text-center text-muted py-4">
                            Aún no hay datos para mostrar. Selecciona filtros y consulta el ranking.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </Table>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </>
      )}
    </Container>
  );
};

export default TopProductsPage;


