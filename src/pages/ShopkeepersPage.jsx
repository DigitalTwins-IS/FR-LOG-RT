/**
 * Página de Gestión de Tenderos - HU3, HU4
 * Como administrador, quiero registrar tenderos con coordenadas geográficas
 */
import { useState, useEffect } from 'react';
import { Container, Row, Col, Table, Button, Modal, Form, Badge, Alert, Tabs, Tab } from 'react-bootstrap';
import { userService } from '../services/api';
import { toast } from 'react-toastify';

const ShopkeepersPage = () => {
  const [shopkeepers, setShopkeepers] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [currentShopkeeper, setCurrentShopkeeper] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all'); // all, assigned, unassigned
  const [formData, setFormData] = useState({
    name: '',
    business_name: '',
    address: '',
    phone: '',
    email: '',
    latitude: '',
    longitude: ''
  });
  const [assignData, setAssignData] = useState({
    seller_id: '',
    notes: ''
  });
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    loadData();
  }, [filterStatus]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      let shopkeepersData;
      if (filterStatus === 'unassigned') {
        shopkeepersData = await userService.getUnassignedShopkeepers();
      } else {
        const filters = filterStatus === 'assigned' ? { seller_id: 'not_null' } : {};
        shopkeepersData = await userService.getShopkeepers(filters);
      }
      
      const sellersData = await userService.getSellers();
      
      setShopkeepers(shopkeepersData);
      setSellers(sellersData);
    } catch (error) {
      toast.error('Error al cargar datos');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (shopkeeper = null) => {
    if (shopkeeper) {
      setCurrentShopkeeper(shopkeeper);
      setFormData({
        name: shopkeeper.name,
        business_name: shopkeeper.business_name || '',
        address: shopkeeper.address,
        phone: shopkeeper.phone || '',
        email: shopkeeper.email || '',
        latitude: shopkeeper.latitude,
        longitude: shopkeeper.longitude
      });
    } else {
      setCurrentShopkeeper(null);
      setFormData({
        name: '',
        business_name: '',
        address: '',
        phone: '',
        email: '',
        latitude: '',
        longitude: ''
      });
    }
    setFormErrors({});
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setCurrentShopkeeper(null);
    setFormData({
      name: '',
      business_name: '',
      address: '',
      phone: '',
      email: '',
      latitude: '',
      longitude: ''
    });
    setFormErrors({});
  };

  const handleOpenAssignModal = (shopkeeper) => {
    setCurrentShopkeeper(shopkeeper);
    setAssignData({
      seller_id: shopkeeper.seller_id || '',
      notes: ''
    });
    setShowAssignModal(true);
  };

  const handleCloseAssignModal = () => {
    setShowAssignModal(false);
    setCurrentShopkeeper(null);
    setAssignData({ seller_id: '', notes: '' });
  };

  const validateForm = () => {
    const errors = {};
    
    if (!formData.name || formData.name.length < 3) {
      errors.name = 'El nombre debe tener al menos 3 caracteres';
    }
    
    if (!formData.address || formData.address.length < 5) {
      errors.address = 'La dirección debe tener al menos 5 caracteres';
    }
    
    const lat = parseFloat(formData.latitude);
    const lng = parseFloat(formData.longitude);
    
    if (isNaN(lat) || lat < -5 || lat > 13) {
      errors.latitude = 'Latitud inválida (debe estar entre -5 y 13 para Colombia)';
    }
    
    if (isNaN(lng) || lng < -80 || lng > -66) {
      errors.longitude = 'Longitud inválida (debe estar entre -80 y -66 para Colombia)';
    }
    
    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Email inválido';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      const submitData = {
        ...formData,
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude)
      };

      if (currentShopkeeper) {
        // Actualizar tendero (HU4)
        await userService.updateShopkeeper(currentShopkeeper.id, submitData);
        toast.success('Tendero actualizado exitosamente');
      } else {
        // Crear tendero (HU3)
        await userService.createShopkeeper(submitData);
        toast.success('Tendero creado exitosamente con coordenadas');
      }
      
      handleCloseModal();
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al guardar tendero');
      console.error(error);
    }
  };

  const handleAssign = async (e) => {
    e.preventDefault();

    if (!assignData.seller_id) {
      toast.error('Debe seleccionar un vendedor');
      return;
    }

    try {
      if (currentShopkeeper.seller_id) {
        // Reasignar
        await userService.reassignShopkeeper({
          shopkeeper_id: currentShopkeeper.id,
          new_seller_id: parseInt(assignData.seller_id),
          notes: assignData.notes
        });
        toast.success('Tendero reasignado exitosamente');
      } else {
        // Asignar por primera vez
        await userService.assignShopkeeper({
          seller_id: parseInt(assignData.seller_id),
          shopkeeper_id: currentShopkeeper.id,
          notes: assignData.notes
        });
        toast.success('Tendero asignado exitosamente');
      }
      
      handleCloseAssignModal();
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al asignar tendero');
      console.error(error);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Está seguro de eliminar este tendero?')) {
      return;
    }

    try {
      await userService.deleteShopkeeper(id);
      toast.success('Tendero eliminado exitosamente');
      loadData();
    } catch (error) {
      toast.error('Error al eliminar tendero');
      console.error(error);
    }
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData({
            ...formData,
            latitude: position.coords.latitude.toFixed(7),
            longitude: position.coords.longitude.toFixed(7)
          });
          toast.success('Ubicación capturada exitosamente');
        },
        (error) => {
          toast.error('Error al obtener ubicación: ' + error.message);
        }
      );
    } else {
      toast.error('Geolocalización no disponible en este navegador');
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
      <Row className="mb-4">
        <Col md={8}>
          <h2>Gestión de Tenderos</h2>
          <p className="text-muted">Registrar tenderos con geolocalización (HU3, HU4)</p>
        </Col>
        <Col md={4} className="text-end">
          <Button variant="primary" onClick={() => handleOpenModal()}>
            ➕ Crear Tendero
          </Button>
        </Col>
      </Row>

      {/* Filtros */}
      <Row className="mb-3">
        <Col md={4}>
          <Form.Group>
            <Form.Label>Filtrar por Estado</Form.Label>
            <Form.Select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">Todos los tenderos</option>
              <option value="assigned">Con vendedor asignado</option>
              <option value="unassigned">Sin vendedor</option>
            </Form.Select>
          </Form.Group>
        </Col>
        <Col md={8}>
          <Alert variant="info" className="mb-0">
            <strong>Total de tenderos:</strong> {shopkeepers.length} | 
            <strong> Sin asignar:</strong> {shopkeepers.filter(s => !s.seller_id).length}
          </Alert>
        </Col>
      </Row>

      {/* Tabla de tenderos */}
      <Row>
        <Col>
          <Table striped bordered hover responsive>
            <thead>
              <tr>
                <th>ID</th>
                <th>Nombre</th>
                <th>Negocio</th>
                <th>Dirección</th>
                <th>Teléfono</th>
                <th>Coordenadas</th>
                <th>Vendedor</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {shopkeepers.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center text-muted">
                    No hay tenderos registrados
                  </td>
                </tr>
              ) : (
                shopkeepers.map(shopkeeper => (
                  <tr key={shopkeeper.id}>
                    <td>{shopkeeper.id}</td>
                    <td>{shopkeeper.name}</td>
                    <td>{shopkeeper.business_name || '-'}</td>
                    <td>{shopkeeper.address}</td>
                    <td>{shopkeeper.phone || '-'}</td>
                    <td>
                      <small>
                        {Number(shopkeeper.latitude).toFixed(4)}, 
                        {Number(shopkeeper.longitude).toFixed(4)}
                      </small>
                    </td>
                    <td>
                      {shopkeeper.seller_name ? (
                        <Badge bg="success">{shopkeeper.seller_name}</Badge>
                      ) : (
                        <Badge bg="warning" text="dark">Sin asignar</Badge>
                      )}
                    </td>
                    <td>
                      <Button 
                        size="sm" 
                        variant="info" 
                        className="me-1 mb-1"
                        onClick={() => handleOpenModal(shopkeeper)}
                      >
                        ✏️
                      </Button>
                      <Button 
                        size="sm" 
                        variant="success" 
                        className="me-1 mb-1"
                        onClick={() => handleOpenAssignModal(shopkeeper)}
                      >
                        👤
                      </Button>
                      <Button 
                        size="sm" 
                        variant="danger"
                        className="mb-1"
                        onClick={() => handleDelete(shopkeeper.id)}
                      >
                        🗑️
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </Col>
      </Row>

      {/* Modal para crear/editar tendero */}
      <Modal show={showModal} onHide={handleCloseModal} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            {currentShopkeeper ? '✏️ Editar Tendero' : '➕ Crear Tendero'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleSubmit}>
            <Tabs defaultActiveKey="basic" className="mb-3">
              <Tab eventKey="basic" title="Datos Básicos">
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Nombre *</Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="Nombre del tendero"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        isInvalid={!!formErrors.name}
                        required
                      />
                      <Form.Control.Feedback type="invalid">
                        {formErrors.name}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>

                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Nombre del Negocio</Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="Tienda, Supermercado, etc."
                        value={formData.business_name}
                        onChange={(e) => setFormData({...formData, business_name: e.target.value})}
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Form.Group className="mb-3">
                  <Form.Label>Dirección *</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Dirección completa del establecimiento"
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    isInvalid={!!formErrors.address}
                    required
                  />
                  <Form.Control.Feedback type="invalid">
                    {formErrors.address}
                  </Form.Control.Feedback>
                </Form.Group>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Teléfono</Form.Label>
                      <Form.Control
                        type="tel"
                        placeholder="6012345678"
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      />
                    </Form.Group>
                  </Col>

                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Email</Form.Label>
                      <Form.Control
                        type="email"
                        placeholder="correo@tienda.com"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        isInvalid={!!formErrors.email}
                      />
                      <Form.Control.Feedback type="invalid">
                        {formErrors.email}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                </Row>
              </Tab>

              <Tab eventKey="location" title="📍 Geolocalización">
                <Alert variant="warning">
                  <strong>HU3:</strong> Las coordenadas deben estar dentro de Colombia
                </Alert>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Latitud * (-5 a 13)</Form.Label>
                      <Form.Control
                        type="number"
                        step="0.0000001"
                        placeholder="4.6097100"
                        value={formData.latitude}
                        onChange={(e) => setFormData({...formData, latitude: e.target.value})}
                        isInvalid={!!formErrors.latitude}
                        required
                      />
                      <Form.Control.Feedback type="invalid">
                        {formErrors.latitude}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>

                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Longitud * (-80 a -66)</Form.Label>
                      <Form.Control
                        type="number"
                        step="0.0000001"
                        placeholder="-74.0817500"
                        value={formData.longitude}
                        onChange={(e) => setFormData({...formData, longitude: e.target.value})}
                        isInvalid={!!formErrors.longitude}
                        required
                      />
                      <Form.Control.Feedback type="invalid">
                        {formErrors.longitude}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                </Row>

                <div className="d-grid gap-2">
                  <Button 
                    variant="secondary" 
                    onClick={getCurrentLocation}
                    type="button"
                  >
                    📍 Obtener mi ubicación actual
                  </Button>
                </div>

                <Alert variant="info" className="mt-3">
                  <small>
                    <strong>Ejemplos de coordenadas en Colombia:</strong><br/>
                    • Bogotá: 4.7110, -74.0721<br/>
                    • Medellín: 6.2442, -75.5812<br/>
                    • Cali: 3.4516, -76.5320
                  </small>
                </Alert>
              </Tab>
            </Tabs>

            <div className="d-flex justify-content-end gap-2">
              <Button variant="secondary" onClick={handleCloseModal}>
                Cancelar
              </Button>
              <Button variant="primary" type="submit">
                {currentShopkeeper ? 'Actualizar' : 'Crear'} Tendero
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>

      {/* Modal para asignar/reasignar vendedor */}
      <Modal show={showAssignModal} onHide={handleCloseAssignModal}>
        <Modal.Header closeButton>
          <Modal.Title>
            {currentShopkeeper?.seller_id ? '🔄 Reasignar' : '👤 Asignar'} Vendedor
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleAssign}>
            {currentShopkeeper?.seller_id && (
              <Alert variant="info">
                <strong>Vendedor actual:</strong> {currentShopkeeper.seller_name}
              </Alert>
            )}

            <Form.Group className="mb-3">
              <Form.Label>Seleccionar Vendedor *</Form.Label>
              <Form.Select
                value={assignData.seller_id}
                onChange={(e) => setAssignData({...assignData, seller_id: e.target.value})}
                required
              >
                <option value="">Seleccione un vendedor</option>
                {sellers.map(seller => (
                  <option key={seller.id} value={seller.id}>
                    {seller.name} - {seller.zone_name} ({seller.total_shopkeepers || 0} tenderos)
                  </option>
                ))}
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Notas</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                placeholder="Motivo de la asignación..."
                value={assignData.notes}
                onChange={(e) => setAssignData({...assignData, notes: e.target.value})}
              />
            </Form.Group>

            <div className="d-flex justify-content-end gap-2">
              <Button variant="secondary" onClick={handleCloseAssignModal}>
                Cancelar
              </Button>
              <Button variant="primary" type="submit">
                {currentShopkeeper?.seller_id ? 'Reasignar' : 'Asignar'}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>
    </Container>
  );
};

export default ShopkeepersPage;

