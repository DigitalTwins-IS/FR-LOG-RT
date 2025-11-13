/**
 * Página de Gestión de Visitas - HU21
 * Como vendedor, quiero agendar visitas basadas en inventario
 */
import { useState, useEffect } from 'react';
import { Container, Row, Col, Table, Button, Modal, Form, Badge, Alert, Card, Tabs, Tab } from 'react-bootstrap';
import { visitsService } from '../services/api';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';

const VisitsPage = () => {
  const { user, hasPermission } = useAuth();
  const [visits, setVisits] = useState([]);
  const [lowStockShopkeepers, setLowStockShopkeepers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [currentVisit, setCurrentVisit] = useState(null);
  const [selectedShopkeeper, setSelectedShopkeeper] = useState(null);
  const [inventorySummary, setInventorySummary] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [statistics, setStatistics] = useState({
    total: 0,
    pending: 0,
    completed: 0,
    cancelled: 0
  });

  const [createForm, setCreateForm] = useState({
    shopkeeper_id: '',
    scheduled_date: '',
    scheduled_time: '',
    reason: 'reabastecimiento',
    notes: ''
  });

  const [editForm, setEditForm] = useState({
    scheduled_date: '',
    scheduled_time: '',
    reason: 'reabastecimiento',
    notes: ''
  });

  const [cancelReason, setCancelReason] = useState('');

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Cargar visitas con filtro de estado
      const filters = {};
      if (statusFilter !== 'all') {
        filters.status = statusFilter;
      }
      
      try {
        const visitsData = await visitsService.getVisits(filters);
        
        // Si la respuesta tiene la estructura VisitListResponse
        if (visitsData.visits) {
          setVisits(visitsData.visits);
          setStatistics({
            total: visitsData.total || 0,
            pending: visitsData.pending || 0,
            completed: visitsData.completed || 0,
            cancelled: visitsData.cancelled || 0
          });
        } else {
          // Si es un array directo
          setVisits(Array.isArray(visitsData) ? visitsData : []);
        }
      } catch (error) {
        // Si hay error 403, puede ser que no haya vendedor asociado
        if (error.response?.status === 403) {
          // Si el usuario es VENDEDOR y no tiene vendedor asociado, mostrar mensaje informativo
          if (user?.role === 'VENDEDOR') {
            setVisits([]);
            setStatistics({ total: 0, pending: 0, completed: 0, cancelled: 0 });
            // No mostrar error, solo lista vacía
          } else {
            toast.error(error.response?.data?.detail || 'No tienes permisos para ver visitas');
          }
        } else {
          toast.error('Error al cargar visitas');
          console.error(error);
        }
      }
      
      // Cargar tenderos con bajo stock (solo para vendedores)
      if (hasPermission('visits.manage')) {
        try {
          const lowStockData = await visitsService.getShopkeepersWithLowStock();
          setLowStockShopkeepers(lowStockData || []);
        } catch (error) {
          console.error('Error al cargar tenderos con bajo stock:', error);
          // Si es error 403, puede ser que no haya vendedor asociado
          if (error.response?.status === 403) {
            setLowStockShopkeepers([]);
            // No mostrar error, solo lista vacía
          } else {
            toast.error('Error al cargar tenderos con bajo stock');
          }
        }
      }
    } catch (error) {
      console.error('Error general al cargar datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadInventorySummary = async (shopkeeperId) => {
    if (!shopkeeperId) return;
    
    try {
      const summary = await visitsService.getShopkeeperInventorySummary(shopkeeperId);
      setInventorySummary(summary);
    } catch (error) {
      console.error('Error al cargar resumen de inventario:', error);
      setInventorySummary(null);
    }
  };


  const handleOpenCreateModal = async (shopkeeper = null) => {
    if (shopkeeper) {
      setSelectedShopkeeper(shopkeeper);
      setCreateForm({
        shopkeeper_id: shopkeeper.shopkeeper_id || shopkeeper.id,
        scheduled_date: '',
        scheduled_time: '',
        reason: 'reabastecimiento',
        notes: ''
      });
      
      // Cargar resumen de inventario
      await loadInventorySummary(shopkeeper.shopkeeper_id || shopkeeper.id);
    } else {
      setSelectedShopkeeper(null);
      setCreateForm({
        shopkeeper_id: '',
        scheduled_date: '',
        scheduled_time: '',
        reason: 'reabastecimiento',
        notes: ''
      });
    }
    setShowCreateModal(true);
  };

  const handleCloseCreateModal = () => {
    setShowCreateModal(false);
    setSelectedShopkeeper(null);
    setInventorySummary(null);
    setCreateForm({
      shopkeeper_id: '',
      scheduled_date: '',
      scheduled_time: '',
      reason: 'reabastecimiento',
      notes: ''
    });
  };

  const handleCreateVisit = async (e) => {
    e.preventDefault();
    
    try {
      // Validar que la fecha y hora estén presentes
      if (!createForm.scheduled_date || !createForm.scheduled_time) {
        toast.error('Debe seleccionar fecha y hora');
        return;
      }
      
      // Combinar fecha y hora en hora local
      // Crear un string en formato ISO pero sin convertir a UTC
      // Formato: YYYY-MM-DDTHH:mm:ss (sin Z ni offset)
      const [hours, minutes] = createForm.scheduled_time.split(':');
      const scheduledDateTimeLocal = `${createForm.scheduled_date}T${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}:00`;
      
      // Crear Date object para validación (en hora local del navegador)
      const scheduledDateTime = new Date(`${createForm.scheduled_date}T${createForm.scheduled_time}`);
      
      // Validar que la fecha sea futura
      if (scheduledDateTime <= new Date()) {
        toast.error('La fecha y hora deben ser futuras');
        return;
      }
      
      // Validar horario laboral (8:00 AM - 6:00 PM) en hora local
      const hour = scheduledDateTime.getHours();
      if (hour < 8 || hour >= 18) {
        toast.error('La visita debe programarse en horario laboral (8:00 AM - 6:00 PM)');
        return;
      }
      
      // Enviar la fecha/hora en formato ISO pero preservando la hora local
      // Para esto, usamos el formato sin 'Z' y el backend lo interpretará correctamente
      // O mejor: calcular el offset y enviarlo explícitamente
      const timezoneOffset = -scheduledDateTime.getTimezoneOffset(); // en minutos
      const offsetHours = Math.floor(Math.abs(timezoneOffset) / 60).toString().padStart(2, '0');
      const offsetMinutes = (Math.abs(timezoneOffset) % 60).toString().padStart(2, '0');
      const offsetSign = timezoneOffset >= 0 ? '+' : '-';
      const scheduledDateTimeWithOffset = `${scheduledDateTimeLocal}${offsetSign}${offsetHours}:${offsetMinutes}`;
      
      await visitsService.createVisit({
        shopkeeper_id: parseInt(createForm.shopkeeper_id),
        scheduled_date: scheduledDateTimeWithOffset,
        reason: createForm.reason || 'reabastecimiento',
        notes: createForm.notes || ''
      });
      
      toast.success('Visita agendada exitosamente');
      handleCloseCreateModal();
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al agendar visita');
      console.error(error);
    }
  };

  const handleOpenEditModal = (visit) => {
    setCurrentVisit(visit);
    
    // Convertir scheduled_date a formato de formulario
    const scheduledDate = new Date(visit.scheduled_date);
    const dateStr = scheduledDate.toISOString().split('T')[0];
    const timeStr = scheduledDate.toTimeString().slice(0, 5);
    
    setEditForm({
      scheduled_date: dateStr,
      scheduled_time: timeStr,
      reason: visit.reason || 'reabastecimiento',
      notes: visit.notes || ''
    });
    setShowEditModal(true);
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setCurrentVisit(null);
    setEditForm({
      scheduled_date: '',
      scheduled_time: '',
      reason: 'reabastecimiento',
      notes: ''
    });
  };

  const handleUpdateVisit = async (e) => {
    e.preventDefault();
    
    if (!currentVisit) return;
    
    try {
      // Validar que la fecha y hora estén presentes
      if (!editForm.scheduled_date || !editForm.scheduled_time) {
        toast.error('Debe seleccionar fecha y hora');
        return;
      }
      
      // Combinar fecha y hora en hora local
      const [hours, minutes] = editForm.scheduled_time.split(':');
      const scheduledDateTimeLocal = `${editForm.scheduled_date}T${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}:00`;
      
      // Crear Date object para validación (en hora local del navegador)
      const scheduledDateTime = new Date(`${editForm.scheduled_date}T${editForm.scheduled_time}`);
      
      // Validar que la fecha sea futura
      if (scheduledDateTime <= new Date()) {
        toast.error('La fecha y hora deben ser futuras');
        return;
      }
      
      // Validar horario laboral (8:00 AM - 6:00 PM) en hora local
      const hour = scheduledDateTime.getHours();
      if (hour < 8 || hour >= 18) {
        toast.error('La visita debe programarse en horario laboral (8:00 AM - 6:00 PM)');
        return;
      }
      
      // Calcular el offset de zona horaria y enviarlo
      const timezoneOffset = -scheduledDateTime.getTimezoneOffset(); // en minutos
      const offsetHours = Math.floor(Math.abs(timezoneOffset) / 60).toString().padStart(2, '0');
      const offsetMinutes = (Math.abs(timezoneOffset) % 60).toString().padStart(2, '0');
      const offsetSign = timezoneOffset >= 0 ? '+' : '-';
      const scheduledDateTimeWithOffset = `${scheduledDateTimeLocal}${offsetSign}${offsetHours}:${offsetMinutes}`;
      
      await visitsService.updateVisit(currentVisit.id, {
        scheduled_date: scheduledDateTimeWithOffset,
        reason: editForm.reason || 'reabastecimiento',
        notes: editForm.notes || ''
      });
      
      toast.success('Visita actualizada exitosamente');
      handleCloseEditModal();
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al actualizar visita');
      console.error(error);
    }
  };

  const handleOpenCancelModal = (visit) => {
    setCurrentVisit(visit);
    setCancelReason('');
    setShowCancelModal(true);
  };

  const handleCloseCancelModal = () => {
    setShowCancelModal(false);
    setCurrentVisit(null);
    setCancelReason('');
  };

  const handleCancelVisit = async () => {
    if (!currentVisit) return;
    
    try {
      await visitsService.cancelVisit(currentVisit.id, cancelReason || null);
      toast.success('Visita cancelada exitosamente');
      handleCloseCancelModal();
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al cancelar visita');
      console.error(error);
    }
  };

  const handleCompleteVisit = async (visitId) => {
    if (!window.confirm('¿Marcar esta visita como completada?')) return;
    
    try {
      await visitsService.completeVisit(visitId);
      toast.success('Visita marcada como completada');
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al completar visita');
      console.error(error);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: <Badge bg="warning">Pendiente</Badge>,
      completed: <Badge bg="success">Completada</Badge>,
      cancelled: <Badge bg="danger">Cancelada</Badge>
    };
    return badges[status] || <Badge bg="secondary">{status}</Badge>;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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

  // Verificar si el usuario es vendedor y tiene vendedor asociado
  const canManageVisits = hasPermission('visits.manage');
  const isVendedor = user?.role === 'VENDEDOR';

  return (
    <Container className="mt-4">
      <Row>
        <Col>
          <h2>📅 Gestión de Visitas</h2>
          <p className="text-muted">Agendar y gestionar visitas a tenderos basadas en inventario</p>
          {isVendedor && lowStockShopkeepers.length === 0 && !loading && (
            <Alert variant="info" className="mt-2">
              <strong>💡 Información:</strong> No tienes tenderos asignados con productos de bajo stock en este momento.
              {visits.length === 0 && ' Puedes agendar visitas cuando tengas tenderos asignados con bajo stock.'}
            </Alert>
          )}
        </Col>
        {canManageVisits && (
          <Col xs="auto">
            <Button 
              variant="primary" 
              onClick={() => handleOpenCreateModal()}
              disabled={lowStockShopkeepers.length === 0 && !selectedShopkeeper}
            >
              ➕ Agendar Visita
            </Button>
          </Col>
        )}
      </Row>

      {/* Estadísticas */}
      <Row className="mt-3">
        <Col md={3}>
          <Card>
            <Card.Body>
              <Card.Title>Total</Card.Title>
              <Card.Text className="fs-4">{statistics.total}</Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card>
            <Card.Body>
              <Card.Title>Pendientes</Card.Title>
              <Card.Text className="fs-4 text-warning">{statistics.pending}</Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card>
            <Card.Body>
              <Card.Title>Completadas</Card.Title>
              <Card.Text className="fs-4 text-success">{statistics.completed}</Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card>
            <Card.Body>
              <Card.Title>Canceladas</Card.Title>
              <Card.Text className="fs-4 text-danger">{statistics.cancelled}</Card.Text>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Tabs */}
      <Tabs defaultActiveKey="visits" className="mt-4">
        <Tab eventKey="visits" title="Visitas Agendadas">
          <Row className="mt-3">
            <Col>
              <Form.Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="mb-3"
              >
                <option value="all">Todas las visitas</option>
                <option value="pending">Pendientes</option>
                <option value="completed">Completadas</option>
                <option value="cancelled">Canceladas</option>
              </Form.Select>

              {visits.length === 0 ? (
                <Alert variant={isVendedor && canManageVisits ? "warning" : "info"}>
                  {isVendedor && canManageVisits 
                    ? "📭 No tienes visitas agendadas. Puedes agendar visitas desde la pestaña 'Tenderos con Bajo Stock'."
                    : "No hay visitas agendadas"}
                </Alert>
              ) : (
                <Table striped bordered hover>
                  <thead>
                    <tr>
                      <th>Fecha y Hora</th>
                      <th>Tendero</th>
                      <th>Motivo</th>
                      <th>Estado</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visits.map((visit) => (
                      <tr key={visit.id}>
                        <td>{formatDate(visit.scheduled_date)}</td>
                        <td>
                          <div>
                            <strong>{visit.shopkeeper_name}</strong>
                            {visit.shopkeeper_business_name && (
                              <div className="text-muted small">{visit.shopkeeper_business_name}</div>
                            )}
                          </div>
                        </td>
                        <td>{visit.reason || 'reabastecimiento'}</td>
                        <td>{getStatusBadge(visit.status)}</td>
                        <td>
                          {visit.status === 'pending' && hasPermission('visits.manage') && (
                            <>
                              <Button
                                variant="outline-primary"
                                size="sm"
                                className="me-2"
                                onClick={() => handleOpenEditModal(visit)}
                              >
                                ✏️ Editar
                              </Button>
                              <Button
                                variant="outline-success"
                                size="sm"
                                className="me-2"
                                onClick={() => handleCompleteVisit(visit.id)}
                              >
                                ✅ Completar
                              </Button>
                              <Button
                                variant="outline-danger"
                                size="sm"
                                onClick={() => handleOpenCancelModal(visit)}
                              >
                                ❌ Cancelar
                              </Button>
                            </>
                          )}
                          {visit.status === 'completed' && (
                            <span className="text-muted">Completada el {formatDate(visit.completed_at)}</span>
                          )}
                          {visit.status === 'cancelled' && (
                            <span className="text-muted">Cancelada el {formatDate(visit.cancelled_at)}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Col>
          </Row>
        </Tab>

        {hasPermission('visits.manage') && (
          <Tab eventKey="low-stock" title={`Tenderos con Bajo Stock ${lowStockShopkeepers.length > 0 ? `(${lowStockShopkeepers.length})` : ''}`}>
            <Row className="mt-3">
              <Col>
                {lowStockShopkeepers.length === 0 ? (
                  <Alert variant={isVendedor ? "warning" : "success"}>
                    {isVendedor 
                      ? "⚠️ No tienes tenderos asignados con productos de bajo stock en este momento. Contacta al administrador si crees que deberías tener tenderos asignados."
                      : "✅ No hay tenderos con productos de bajo stock"}
                  </Alert>
                ) : (
                  <Table striped bordered hover>
                    <thead>
                      <tr>
                        <th>Tendero</th>
                        <th>Productos con Bajo Stock</th>
                        <th>Total de Productos</th>
                        <th>Última Actualización</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lowStockShopkeepers.map((shopkeeper) => (
                        <tr key={shopkeeper.shopkeeper_id}>
                          <td>
                            <div>
                              <strong>{shopkeeper.shopkeeper_name}</strong>
                              {shopkeeper.shopkeeper_business_name && (
                                <div className="text-muted small">{shopkeeper.shopkeeper_business_name}</div>
                              )}
                              <div className="text-muted small">{shopkeeper.shopkeeper_address}</div>
                            </div>
                          </td>
                          <td>
                            <Badge bg="danger">{shopkeeper.low_stock_count}</Badge>
                          </td>
                          <td>{shopkeeper.total_products}</td>
                          <td>
                            {shopkeeper.last_updated
                              ? formatDate(shopkeeper.last_updated)
                              : 'N/A'}
                          </td>
                          <td>
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => handleOpenCreateModal(shopkeeper)}
                            >
                              📅 Agendar Visita
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                )}
              </Col>
            </Row>
          </Tab>
        )}
      </Tabs>

      {/* Modal para crear visita */}
      <Modal show={showCreateModal} onHide={handleCloseCreateModal} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Agendar Nueva Visita</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleCreateVisit}>
            <Form.Group className="mb-3">
              <Form.Label>Tendero *</Form.Label>
              <Form.Select
                value={createForm.shopkeeper_id}
                onChange={(e) => {
                  setCreateForm({ ...createForm, shopkeeper_id: e.target.value });
                  if (e.target.value) {
                    const shopkeeper = lowStockShopkeepers.find(
                      s => (s.shopkeeper_id || s.id) === parseInt(e.target.value)
                    );
                    if (shopkeeper) {
                      loadInventorySummary(shopkeeper.shopkeeper_id || shopkeeper.id);
                    }
                  }
                }}
                required
                disabled={selectedShopkeeper !== null}
              >
                <option value="">Seleccione un tendero</option>
                {lowStockShopkeepers.map((shopkeeper) => (
                  <option
                    key={shopkeeper.shopkeeper_id || shopkeeper.id}
                    value={shopkeeper.shopkeeper_id || shopkeeper.id}
                  >
                    {shopkeeper.shopkeeper_name} - {shopkeeper.shopkeeper_business_name || ''}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>

            {inventorySummary && (
              <Alert variant="info" className="mb-3">
                <strong>Resumen de Inventario:</strong>
                <ul className="mb-0 mt-2">
                  <li>Total de productos: {inventorySummary.total_products}</li>
                  <li>Productos con bajo stock: {inventorySummary.low_stock_count}</li>
                  {inventorySummary.low_stock_products && inventorySummary.low_stock_products.length > 0 && (
                    <li>
                      Productos con bajo stock:
                      <ul>
                        {inventorySummary.low_stock_products.map((product, idx) => (
                          <li key={idx}>
                            {product.product_name} - Stock actual: {product.current_stock} (Mínimo: {product.min_stock})
                          </li>
                        ))}
                      </ul>
                    </li>
                  )}
                </ul>
              </Alert>
            )}

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Fecha *</Form.Label>
                  <Form.Control
                    type="date"
                    value={createForm.scheduled_date}
                    onChange={(e) => setCreateForm({ ...createForm, scheduled_date: e.target.value })}
                    min={new Date().toISOString().split('T')[0]}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Hora * (8:00 AM - 6:00 PM)</Form.Label>
                  <Form.Control
                    type="time"
                    value={createForm.scheduled_time}
                    onChange={(e) => setCreateForm({ ...createForm, scheduled_time: e.target.value })}
                    min="08:00"
                    max="17:59"
                    required
                  />
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Motivo</Form.Label>
              <Form.Select
                value={createForm.reason}
                onChange={(e) => setCreateForm({ ...createForm, reason: e.target.value })}
              >
                <option value="reabastecimiento">Reabastecimiento</option>
                <option value="seguimiento">Seguimiento</option>
                <option value="nuevos_productos">Nuevos Productos</option>
                <option value="otro">Otro</option>
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Notas</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={createForm.notes}
                onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
                placeholder="Notas adicionales sobre la visita (productos prioritarios a reabastecer, etc.)"
              />
            </Form.Group>

            <div className="d-flex justify-content-end">
              <Button variant="secondary" onClick={handleCloseCreateModal} className="me-2">
                Cancelar
              </Button>
              <Button variant="primary" type="submit">
                Agendar Visita
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>

      {/* Modal para editar visita */}
      <Modal show={showEditModal} onHide={handleCloseEditModal}>
        <Modal.Header closeButton>
          <Modal.Title>Editar Visita</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleUpdateVisit}>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Fecha *</Form.Label>
                  <Form.Control
                    type="date"
                    value={editForm.scheduled_date}
                    onChange={(e) => setEditForm({ ...editForm, scheduled_date: e.target.value })}
                    min={new Date().toISOString().split('T')[0]}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Hora * (8:00 AM - 6:00 PM)</Form.Label>
                  <Form.Control
                    type="time"
                    value={editForm.scheduled_time}
                    onChange={(e) => setEditForm({ ...editForm, scheduled_time: e.target.value })}
                    min="08:00"
                    max="17:59"
                    required
                  />
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Motivo</Form.Label>
              <Form.Select
                value={editForm.reason}
                onChange={(e) => setEditForm({ ...editForm, reason: e.target.value })}
              >
                <option value="reabastecimiento">Reabastecimiento</option>
                <option value="seguimiento">Seguimiento</option>
                <option value="nuevos_productos">Nuevos Productos</option>
                <option value="otro">Otro</option>
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Notas</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                placeholder="Notas adicionales sobre la visita"
              />
            </Form.Group>

            <div className="d-flex justify-content-end">
              <Button variant="secondary" onClick={handleCloseEditModal} className="me-2">
                Cancelar
              </Button>
              <Button variant="primary" type="submit">
                Actualizar Visita
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>

      {/* Modal para cancelar visita */}
      <Modal show={showCancelModal} onHide={handleCloseCancelModal}>
        <Modal.Header closeButton>
          <Modal.Title>Cancelar Visita</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="warning">
            ¿Está seguro de que desea cancelar esta visita?
          </Alert>
          <Form.Group className="mb-3">
            <Form.Label>Razón de Cancelación (Opcional)</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Ingrese la razón de la cancelación"
            />
          </Form.Group>
          <div className="d-flex justify-content-end">
            <Button variant="secondary" onClick={handleCloseCancelModal} className="me-2">
              No Cancelar
            </Button>
            <Button variant="danger" onClick={handleCancelVisit}>
              Cancelar Visita
            </Button>
          </div>
        </Modal.Body>
      </Modal>
    </Container>
  );
};

export default VisitsPage;

