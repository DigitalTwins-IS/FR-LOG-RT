// src/pages/SellerSalesReportPage.jsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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

const SellerSalesReportPage = () => {
  const { id: sellerId } = useParams();
  const navigate = useNavigate();

  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState(() => createDefaultRange());
  const [formFilters, setFormFilters] = useState(() => createDefaultRange());

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
    if (!sellerId) {
      setError('No se recibió el identificador del vendedor.');
      return;
    }

    const fetchReport = async () => {
      setLoading(true);
      try {
        const response = await reportService.getSellerAggregatedSales(sellerId, {
          startDate: filters.startDate,
          endDate: filters.endDate
        });

        setReportData(response);
        setError(null);
      } catch (fetchError) {
        console.error('Error al cargar reporte agregado de ventas:', fetchError);
        setReportData(null);
        setError(
          fetchError.response?.data?.detail ||
          'No se pudo cargar el reporte agregado de ventas. Intenta nuevamente más tarde.'
        );
        toast.error('No se pudo cargar el reporte agregado de ventas.');
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [sellerId, filters.startDate, filters.endDate]);

  const emptyState = !loading && reportData && reportData.shopkeepers_summary?.length === 0;

  return (
    <Container className="mt-4">
      <Row className="mb-3 align-items-center">
        <Col md={8}>
          <h2>📊 Reporte Agregado de Ventas</h2>
          <p className="text-muted mb-0">
            Consulta el rendimiento agregado de todos los tenderos asignados al vendedor.
          </p>
        </Col>
        <Col md={4} className="text-md-end mt-2 mt-md-0">
          <Button variant="outline-secondary" onClick={() => navigate(-1)}>
            ← Volver
          </Button>
        </Col>
      </Row>

      {reportData && (
        <Row className="mb-4">
          <Col>
            <Card>
              <Card.Body>
                <Row>
                  <Col md={4}>
                    <p className="mb-1 text-muted">Vendedor</p>
                    <h5>{reportData.seller_name || '-'}</h5>
                  </Col>
                  <Col md={4}>
                    <p className="mb-1 text-muted">Email</p>
                    <h5>{reportData.seller_email || '-'}</h5>
                  </Col>
                  <Col md={4}>
                    <p className="mb-1 text-muted">Zona</p>
                    <h5>{reportData.zone_name || '-'}</h5>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      <Row className="mb-4">
        <Col>
          <Card>
            <Card.Header>Filtrar reporte</Card.Header>
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

      {loading ? (
        <Row className="mb-4">
          <Col>
            <Card>
              <Card.Body className="text-center py-5">
                <Spinner animation="border" role="status">
                  <span className="visually-hidden">Cargando...</span>
                </Spinner>
                <p className="mt-3 text-muted">Cargando reporte...</p>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      ) : reportData ? (
        <>
          {/* Métricas Agregadas Totales */}
          <Row className="mb-4">
            <Col md={3} className="mb-3 mb-md-0">
              <Card className="h-100 border-success">
                <Card.Body>
                  <p className="text-muted mb-2">Total vendido</p>
                  <h4 className="text-success">
                    {formatCurrency(reportData.summary?.total_amount || 0)}
                  </h4>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3} className="mb-3 mb-md-0">
              <Card className="h-100 border-primary">
                <Card.Body>
                  <p className="text-muted mb-2">Transacciones</p>
                  <h4 className="text-primary">
                    {reportData.summary?.total_records || 0}
                  </h4>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3} className="mb-3 mb-md-0">
              <Card className="h-100 border-info">
                <Card.Body>
                  <p className="text-muted mb-2">Unidades vendidas</p>
                  <h4 className="text-info">
                    {reportData.summary?.total_units || 0}
                  </h4>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="h-100 border-warning">
                <Card.Body>
                  <p className="text-muted mb-2">Ticket promedio</p>
                  <h4 className="text-warning">
                    {formatCurrency(reportData.summary?.average_ticket || 0)}
                  </h4>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* Información del rango y tenderos */}
          <Row className="mb-4">
            <Col md={6}>
              <Card>
                <Card.Body>
                  <p className="text-muted mb-1">Rango de fechas</p>
                  <p className="mb-0">
                    <strong>
                      {reportData.range_start &&
                        new Date(reportData.range_start).toLocaleDateString('es-CO')}
                    </strong>{' '}
                    -{' '}
                    <strong>
                      {reportData.range_end &&
                        new Date(reportData.range_end).toLocaleDateString('es-CO')}
                    </strong>
                  </p>
                </Card.Body>
              </Card>
            </Col>
            <Col md={6}>
              <Card>
                <Card.Body>
                  <p className="text-muted mb-1">Tenderos asignados</p>
                  <p className="mb-0">
                    <strong>{reportData.total_shopkeepers || 0}</strong> tenderos activos
                  </p>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* Tabla de resumen por tendero */}
          <Row>
            <Col>
              <Card>
                <Card.Header>
                  <strong>Resumen por Tendero</strong>
                </Card.Header>
                <Card.Body className="p-0">
                  {emptyState ? (
                    <div className="py-5 text-center text-muted">
                      No se registran ventas en el rango seleccionado para los tenderos asignados.
                    </div>
                  ) : (
                    <Table striped bordered hover responsive className="mb-0">
                      <thead>
                        <tr>
                          <th>Tendero</th>
                          <th>Negocio</th>
                          <th>Transacciones</th>
                          <th>Unidades</th>
                          <th>Total vendido</th>
                          <th>Ticket promedio</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.shopkeepers_summary?.map((shopkeeper) => (
                          <tr key={shopkeeper.shopkeeper_id}>
                            <td>{shopkeeper.shopkeeper_name || '-'}</td>
                            <td>{shopkeeper.shopkeeper_business_name || '-'}</td>
                            <td className="text-end">
                              {shopkeeper.total_records || 0}
                            </td>
                            <td className="text-end">
                              {shopkeeper.total_units || 0}
                            </td>
                            <td className="text-end">
                              {formatCurrency(shopkeeper.total_amount || 0)}
                            </td>
                            <td className="text-end">
                              {formatCurrency(shopkeeper.average_ticket || 0)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      {reportData.shopkeepers_summary?.length > 0 && (
                        <tfoot>
                          <tr className="table-info">
                            <td colSpan="2" className="fw-bold">
                              TOTAL
                            </td>
                            <td className="text-end fw-bold">
                              {reportData.summary?.total_records || 0}
                            </td>
                            <td className="text-end fw-bold">
                              {reportData.summary?.total_units || 0}
                            </td>
                            <td className="text-end fw-bold">
                              {formatCurrency(reportData.summary?.total_amount || 0)}
                            </td>
                            <td className="text-end fw-bold">
                              {formatCurrency(reportData.summary?.average_ticket || 0)}
                            </td>
                          </tr>
                        </tfoot>
                      )}
                    </Table>
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* Información adicional */}
          {reportData.report_generated_at && (
            <Row className="mt-3">
              <Col>
                <Alert variant="info" className="mb-0">
                  <small>
                    Reporte generado el:{' '}
                    {new Date(reportData.report_generated_at).toLocaleString('es-CO')}
                  </small>
                </Alert>
              </Col>
            </Row>
          )}
        </>
      ) : null}
    </Container>
  );
};

export default SellerSalesReportPage;

