// src/pages/SalesHistoryPage.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import {
  Container,
  Row,
  Col,
  Card,
  Table,
  Button,
  Form,
  Alert,
  Spinner,
  Badge
} from 'react-bootstrap';
import { reportService } from '../services/api';
import { toast } from 'react-toastify';

const formatDateForInput = (date) => date.toISOString().slice(0, 10);

const createDefaultRange = () => {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 30);
  return {
    startDate: formatDateForInput(start),
    endDate: formatDateForInput(end)
  };
};

const formatCurrency = (value) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0
  }).format(value || 0);

const calculateSummary = (sales = []) => {
  return sales.reduce(
    (acc, sale) => {
      const quantity = Number(sale.quantity ?? sale.units ?? 0);
      const total = Number(
        sale.total_amount ??
          sale.total ??
          quantity * Number(sale.unit_price ?? sale.price ?? 0)
      );

      return {
        totalRecords: acc.totalRecords + 1,
        totalUnits: acc.totalUnits + quantity,
        totalAmount: acc.totalAmount + total
      };
    },
    {
      totalRecords: 0,
      totalUnits: 0,
      totalAmount: 0
    }
  );
};

const SalesHistoryPage = () => {
  const { id: shopkeeperId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const shopkeeperFromState = location.state?.shopkeeper;

  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [summaryFromApi, setSummaryFromApi] = useState(null);
  const [filters, setFilters] = useState(() => createDefaultRange());
  const [formFilters, setFormFilters] = useState(() => createDefaultRange());
  const [shopkeeperMeta, setShopkeeperMeta] = useState(() => ({
    name:
      shopkeeperFromState?.name ??
      shopkeeperFromState?.business_name ??
      '-',
    business:
      shopkeeperFromState?.business_name ?? shopkeeperFromState?.business ?? '-',
    seller:
      shopkeeperFromState?.seller_name ??
      shopkeeperFromState?.seller ??
      shopkeeperFromState?.sellerName ??
      '-'
  }));

  const effectiveSummary = useMemo(() => {
    if (summaryFromApi) {
      return {
        totalAmount:
          summaryFromApi.total_amount ??
          summaryFromApi.total_sales_amount ??
          summaryFromApi.total ?? 0,
        totalUnits:
          summaryFromApi.total_units ??
          summaryFromApi.total_products ??
          summaryFromApi.total_quantity ??
          0,
        totalRecords:
          summaryFromApi.total_records ??
          summaryFromApi.total_sales ??
          summaryFromApi.count ??
          sales.length,
        averageTicket:
          summaryFromApi.average_ticket ??
          summaryFromApi.average_amount ??
          (summaryFromApi.total_amount && summaryFromApi.total_sales
            ? summaryFromApi.total_amount / summaryFromApi.total_sales
            : null)
      };
    }

    const localSummary = calculateSummary(sales);
    return {
      ...localSummary,
      averageTicket:
        localSummary.totalRecords > 0
          ? localSummary.totalAmount / localSummary.totalRecords
          : 0
    };
  }, [summaryFromApi, sales]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormFilters((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleResetFilters = () => {
    const defaultRange = createDefaultRange();
    setFormFilters(defaultRange);
    setFilters(defaultRange);
  };

  const handleSubmitFilters = (event) => {
    event.preventDefault();

    const start = new Date(formFilters.startDate);
    const end = new Date(formFilters.endDate);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      setError('Debes seleccionar un rango de fechas válido.');
      toast.error('Debes seleccionar un rango de fechas válido.');
      return;
    }

    if (start > end) {
      setError('La fecha inicial no puede ser posterior a la fecha final.');
      toast.error('La fecha inicial no puede ser posterior a la fecha final.');
      return;
    }

    setError(null);
    setFilters(formFilters);
  };

  useEffect(() => {
    if (!shopkeeperId) {
      setError('No se recibió el identificador del tendero.');
      return;
    }

    const fetchSales = async () => {
      setLoading(true);
      try {
        const response = await reportService.getShopkeeperSalesHistory(
          shopkeeperId,
          {
            startDate: filters.startDate,
            endDate: filters.endDate
          }
        );

        const salesData = Array.isArray(response?.sales)
          ? response.sales
          : Array.isArray(response)
          ? response
          : Array.isArray(response?.data)
          ? response.data
          : [];

        setSales(salesData);
        setSummaryFromApi(response?.summary ?? null);

        setShopkeeperMeta((prev) => ({
          name:
            response?.shopkeeper_name ??
            response?.shopkeeper?.name ??
            prev.name,
          business:
            response?.shopkeeper_business_name ??
            response?.shopkeeper?.business_name ??
            prev.business,
          seller:
            response?.seller_name ??
            response?.seller?.name ??
            prev.seller
        }));

        setError(null);
      } catch (fetchError) {
        console.error('Error al cargar historial de ventas:', fetchError);
        setSales([]);
        setSummaryFromApi(null);
        setError(
          'No se pudo cargar el historial de ventas. Intenta nuevamente más tarde.'
        );
        toast.error('No se pudo cargar el historial de ventas.');
      } finally {
        setLoading(false);
      }
    };

    fetchSales();
  }, [shopkeeperId, filters.startDate, filters.endDate]);

  const emptyState = !loading && sales.length === 0 && !error;

  return (
    <Container className="mt-4">
      <Row className="mb-3 align-items-center">
        <Col md={8}>
          <h2>Historial de Ventas</h2>
          <p className="text-muted mb-0">
            Consulta los movimientos registrados para el tendero seleccionado.
          </p>
        </Col>
        <Col md={4} className="text-md-end mt-2 mt-md-0">
          <Button variant="outline-secondary" onClick={() => navigate(-1)}>
            ← Volver
          </Button>
        </Col>
      </Row>

      <Row className="mb-4">
        <Col>
          <Card>
            <Card.Body>
              <Row>
                <Col md={4}>
                  <p className="mb-1 text-muted">Tendero</p>
                  <h5>{shopkeeperMeta.name || '-'}</h5>
                </Col>
                <Col md={4}>
                  <p className="mb-1 text-muted">Negocio</p>
                  <h5>{shopkeeperMeta.business || '-'}</h5>
                </Col>
                <Col md={4}>
                  <p className="mb-1 text-muted">Vendedor asignado</p>
                  <h5>{shopkeeperMeta.seller || '-'}</h5>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="mb-4">
        <Col>
          <Card>
            <Card.Header>Filtrar historial</Card.Header>
            <Card.Body>
              <Form onSubmit={handleSubmitFilters} className="row g-3">
                <Col md={4}>
                  <Form.Group controlId="startDate">
                    <Form.Label>Fecha inicial</Form.Label>
                    <Form.Control
                      type="date"
                      name="startDate"
                      value={formFilters.startDate}
                      onChange={handleChange}
                      max={formFilters.endDate}
                      required
                    />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group controlId="endDate">
                    <Form.Label>Fecha final</Form.Label>
                    <Form.Control
                      type="date"
                      name="endDate"
                      value={formFilters.endDate}
                      onChange={handleChange}
                      min={formFilters.startDate}
                      required
                    />
                  </Form.Group>
                </Col>
                <Col
                  md={4}
                  className="d-flex align-items-end gap-2 justify-content-md-end"
                >
                  <Button variant="primary" type="submit">
                    Aplicar filtros
                  </Button>
                  <Button variant="outline-secondary" onClick={handleResetFilters}>
                    Restablecer
                  </Button>
                </Col>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {error && (
        <Row className="mb-4">
          <Col>
            <Alert variant="danger" onClose={() => setError(null)} dismissible>
              {error}
            </Alert>
          </Col>
        </Row>
      )}

      <Row className="mb-4">
        <Col md={4} className="mb-3 mb-md-0">
          <Card className="h-100 border-success">
            <Card.Body>
              <p className="text-muted mb-2">Total vendido</p>
              <h4 className="text-success">{formatCurrency(effectiveSummary.totalAmount)}</h4>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4} className="mb-3 mb-md-0">
          <Card className="h-100 border-primary">
            <Card.Body>
              <p className="text-muted mb-2">Transacciones</p>
              <h4 className="text-primary">{effectiveSummary.totalRecords}</h4>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="h-100 border-warning">
            <Card.Body>
              <p className="text-muted mb-2">Ticket promedio</p>
              <h4 className="text-warning">
                {formatCurrency(effectiveSummary.averageTicket || 0)}
              </h4>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row>
        <Col>
          <Card>
            <Card.Header>Detalle de ventas</Card.Header>
            <Card.Body className="p-0">
              {loading ? (
                <div className="d-flex justify-content-center py-5">
                  <Spinner animation="border" role="status">
                    <span className="visually-hidden">Cargando...</span>
                  </Spinner>
                </div>
              ) : emptyState ? (
                <div className="py-5 text-center text-muted">
                  No se registran ventas en el rango seleccionado.
                </div>
              ) : (
                <Table striped bordered hover responsive className="mb-0">
                  <thead>
                    <tr>
                      <th>Factura</th>
                      <th>Producto</th>
                      <th>Categoría</th>
                      <th>Cantidad</th>
                      <th>Precio unitario</th>
                      <th>Total</th>
                      <th>Fecha</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sales.map((sale) => {
                      const total =
                        sale.total_amount ??
                        sale.total ??
                        (sale.quantity ?? sale.units ?? 0) *
                          (sale.unit_price ?? sale.price ?? 0);

                      const status = sale.status ?? sale.payment_status ?? 'Completada';

                      return (
                        <tr key={sale.id ?? sale.sale_id ?? sale.invoice_number}>
                          <td>{sale.invoice_number ?? sale.reference ?? sale.id ?? '-'}</td>
                          <td>{sale.product_name ?? sale.product ?? sale.description ?? '-'}</td>
                          <td>{sale.category ?? sale.product_category ?? '-'}</td>
                          <td className="text-end">
                            {Number(sale.quantity ?? sale.units ?? 0)}
                          </td>
                          <td className="text-end">
                            {formatCurrency(sale.unit_price ?? sale.price ?? 0)}
                          </td>
                          <td className="text-end">{formatCurrency(total)}</td>
                          <td>
                            {sale.sold_at
                              ? new Date(sale.sold_at).toLocaleString('es-CO')
                              : sale.created_at
                              ? new Date(sale.created_at).toLocaleString('es-CO')
                              : '-'}
                          </td>
                          <td>
                            <Badge bg={status === 'Completada' ? 'success' : 'secondary'}>
                              {status}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default SalesHistoryPage;