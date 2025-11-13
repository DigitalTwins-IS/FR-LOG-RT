/**
 * Página de Gestión de Vendedores - HU2, HU4
 * Como administrador, quiero registrar y gestionar vendedores
 */
import { useState, useEffect } from 'react';
import { Container, Row, Col, Table, Button, Modal, Form, Badge, Alert } from 'react-bootstrap';
import { userService, geoService } from '../services/api';
import { toast } from 'react-toastify';
import { APP_CONFIG } from '../config';

const SellersPage = () => {
  const [sellers, setSellers] = useState([]);
  const [zones, setZones] = useState([]);
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [currentSeller, setCurrentSeller] = useState(null);
  const [filterZone, setFilterZone] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    zone_id: '',
    user_id: null
  });
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    loadData();
  }, [filterZone]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [sellersData, zonesData, citiesData] = await Promise.all([
        userService.getSellers(filterZone || null),
        geoService.getZones(),
        geoService.getCities()
      ]);
      setSellers(sellersData);
      setZones(zonesData);
      setCities(citiesData);
    } catch (error) {
      toast.error('Error al cargar datos');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (seller = null) => {
    if (seller) {
      setCurrentSeller(seller);
      setFormData({
        name: seller.name,
        email: seller.email,
        phone: seller.phone || '',
        address: seller.address || '',
        zone_id: seller.zone_id,
        user_id: seller.user_id
      });
    } else {
      setCurrentSeller(null);
      setFormData({
        name: '',
        email: '',
        phone: '',
        address: '',
        zone_id: zones.length > 0 ? zones[0].id : '',
        user_id: null
      });
    }
    setFormErrors({});
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setCurrentSeller(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      address: '',
      zone_id: '',
      user_id: null
    });
    setFormErrors({});
  };

  const validateForm = () => {
    const errors = {};
    
    if (!formData.name || formData.name.length < 3) {
      errors.name = 'El nombre debe tener al menos 3 caracteres';
    }
    
    if (!formData.email || !/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Email inválido';
    }
    
    if (!formData.zone_id) {
      errors.zone_id = 'Debe seleccionar una zona';
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
      if (currentSeller) {
        // Actualizar vendedor (HU4)
        await userService.updateSeller(currentSeller.id, formData);
        toast.success('Vendedor actualizado exitosamente');
      } else {
        // Crear vendedor (HU2)
        await userService.createSeller(formData);
        toast.success('Vendedor creado exitosamente');
      }
      
      handleCloseModal();
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al guardar vendedor');
      console.error(error);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Está seguro de eliminar este vendedor?')) {
      return;
    }

    try {
      await userService.deleteSeller(id);
      toast.success('Vendedor eliminado exitosamente');
      loadData();
    } catch (error) {
      toast.error('Error al eliminar vendedor');
      console.error(error);
    }
  };

  const getZoneName = (zoneId) => {
    const zone = zones.find(z => z.id === zoneId);
    return zone ? `${zone.name} (${zone.city_name})` : 'N/A';
  };

  const getZoneColor = (zoneId) => {
    const zone = zones.find(z => z.id === zoneId);
    return zone?.color || '#6c757d';
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
          <h2>Gestión de Vendedores</h2>
          <p className="text-muted">Registrar y asignar vendedores a zonas (HU2, HU4)</p>
        </Col>
        <Col md={4} className="text-end">
          <Button variant="primary" onClick={() => handleOpenModal()}>
            ➕ Crear Vendedor
          </Button>
        </Col>
      </Row>

      {/* Filtros */}
      <Row className="mb-3">
        <Col md={4}>
          <Form.Group>
            <Form.Label>Filtrar por Zona</Form.Label>
            <Form.Select
              value={filterZone}
              onChange={(e) => setFilterZone(e.target.value)}
            >
              <option value="">Todas las zonas</option>
              {cities.map(city => (
                <optgroup key={city.id} label={city.name}>
                  {zones.filter(z => z.city_id === city.id).map(zone => (
                    <option key={zone.id} value={zone.id}>
                      {zone.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </Form.Select>
          </Form.Group>
        </Col>
        <Col md={8}>
          <Alert variant="info" className="mb-0">
            <strong>Total de vendedores:</strong> {sellers.length} | 
            <strong> Recomendado:</strong> Máximo {APP_CONFIG.maxSellersPerZone} vendedores por zona
          </Alert>
        </Col>
      </Row>

      {/* Tabla de vendedores */}
      <Row>
        <Col>
          <Table striped bordered hover responsive>
            <thead>
              <tr>
                <th>ID</th>
                <th>Nombre</th>
                <th>Email</th>
                <th>Teléfono</th>
                <th>Zona</th>
                <th>Tenderos</th>
                <th>Usuario</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {sellers.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center text-muted">
                    No hay vendedores registrados
                  </td>
                </tr>
              ) : (
                sellers.map(seller => (
                  <tr key={seller.id}>
                    <td>{seller.id}</td>
                    <td>{seller.name}</td>
                    <td>{seller.email}</td>
                    <td>{seller.phone || '-'}</td>
                    <td>
                      <Badge 
                        bg="secondary" 
                        style={{ backgroundColor: getZoneColor(seller.zone_id) }}
                      >
                        {getZoneName(seller.zone_id)}
                      </Badge>
                    </td>
                    <td>
                      <Badge bg={seller.total_shopkeepers > APP_CONFIG.maxShopkeepersPerSeller ? 'danger' : 'primary'}>
                        {seller.total_shopkeepers || 0} tenderos
                      </Badge>
                    </td>
                    <td>
                      {seller.user_id ? (
                        <Badge bg="success">✅ Usuario activo</Badge>
                      ) : (
                        <Badge bg="warning" text="dark">⚠️ Sin usuario</Badge>
                      )}
                    </td>
                    <td>
                      <Badge bg={seller.is_active ? 'success' : 'secondary'}>
                        {seller.is_active ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </td>
                    <td>
                      <Button 
                        size="sm" 
                        variant="info" 
                        className="me-2"
                        onClick={() => handleOpenModal(seller)}
                      >
                        ✏️ Editar
                      </Button>
                      <Button 
                        size="sm" 
                        variant="danger"
                        onClick={() => handleDelete(seller.id)}
                      >
                        🗑️ Eliminar
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </Col>
      </Row>

      {/* Modal para crear/editar */}
      <Modal show={showModal} onHide={handleCloseModal} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            {currentSeller ? '✏️ Editar Vendedor' : '➕ Crear Vendedor'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleSubmit}>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Nombre *</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Nombre completo del vendedor"
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
                  <Form.Label>Email *</Form.Label>
                  <Form.Control
                    type="email"
                    placeholder="correo@ejemplo.com"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    isInvalid={!!formErrors.email}
                    required
                  />
                  <Form.Control.Feedback type="invalid">
                    {formErrors.email}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Teléfono</Form.Label>
                  <Form.Control
                    type="tel"
                    placeholder="3001234567"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  />
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Zona *</Form.Label>
                  <Form.Select
                    value={formData.zone_id}
                    onChange={(e) => setFormData({...formData, zone_id: parseInt(e.target.value)})}
                    isInvalid={!!formErrors.zone_id}
                    required
                  >
                    <option value="">Seleccione una zona</option>
                    {cities.map(city => (
                      <optgroup key={city.id} label={city.name}>
                        {zones.filter(z => z.city_id === city.id).map(zone => (
                          <option key={zone.id} value={zone.id}>
                            {zone.name}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </Form.Select>
                  <Form.Control.Feedback type="invalid">
                    {formErrors.zone_id}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Dirección</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                placeholder="Dirección del vendedor"
                value={formData.address}
                onChange={(e) => setFormData({...formData, address: e.target.value})}
              />
            </Form.Group>

            {/* Información sobre creación automática de usuario */}
            {!currentSeller && (
              <Alert variant="info" className="mb-3">
                <strong>ℹ️ Nota:</strong> Al crear el vendedor, se creará automáticamente un usuario 
                con rol VENDEDOR para que pueda acceder al sistema. 
                Credenciales: Email del vendedor / Contraseña: <strong>Vendedor123!</strong>
              </Alert>
            )}

            <div className="d-flex justify-content-end gap-2">
              <Button variant="secondary" onClick={handleCloseModal}>
                Cancelar
              </Button>
              <Button variant="primary" type="submit">
                {currentSeller ? 'Actualizar' : 'Crear'} Vendedor
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>
    </Container>
  );
};

export default SellersPage;

