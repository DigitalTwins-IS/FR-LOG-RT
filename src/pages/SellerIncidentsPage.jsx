/**
 * Página de Gestión de Incidencias de Vendedores - HU16
 * Como Tendero, quiero registrar incidencias relacionadas con los vendedores
 * para mejorar el control y seguimiento de las visitas.
 */

import { useState, useEffect } from 'react';
import { Container, Row, Col, Table, Button, Modal, Form, Badge, Alert } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { sellerIncidentsService, userService } from '../services/api';

const SellerIncidentsPage = () => {
    const [incidents, setIncidents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [currentIncident, setCurrentIncident] = useState(null);
    const [usingMockData, setUsingMockData] = useState(false);
    // Datos auxiliares
    const [sellers, setSellers] = useState([]);
    const [shopkeepers, setShopkeepers] = useState([]);
    // Filtros
    const [filterSeller, setFilterSeller] = useState('');
    const [filterType, setFilterType] = useState('');
    const [formErrors, setFormErrors] = useState({});
    const [formData, setFormData] = useState({
        seller_id: '',
        shopkeeper_id: '',
        type: '',
        description: '',
        incident_date: '',
    });

    useEffect(() => {
        loadData();
    }, [filterSeller, filterType]);

    useEffect(() => {
        loadAuxData();
    }, []);

    const loadAuxData = async () => {
        try {
            const sellersList = await userService.getSellers()
            setSellers(sellersList);

            const shopkeepersList = await userService.getShopkeepers()
            setShopkeepers(shopkeepersList);
        } catch (error) {
            console.error("❌ Error cargando vendedores/tenderos:", error);
        }
    };

    const loadData = async () => {
        try {
            setLoading(true);
            setUsingMockData(false);

            console.log("🔄 Cargando incidencias...");
            const sellerIncidentsData = await sellerIncidentsService.getAll(filterSeller, filterType);
            console.log('✅ Incidencias cargadas del microservicio:', sellerIncidentsData);
            setIncidents(sellerIncidentsData);
        } catch (error) {
            console.error("❌ Error cargando incidencias:", error);
            console.warn('🔄 Usando datos de ejemplo como fallback...');
            setUsingMockData(true);
            // Usar datos de ejemplo cuando el microservicio no esté disponible
            const mockSellerIncidents = [
                {
                    id: 1,
                    seller_id: 1,
                    seller_name: "Juan Pérez",
                    shopkeeper_id: 2,
                    shopkeeper_name: "Tienda La Esperanza",
                    type: "delay",
                    description: "Llegó 25 minutos tarde",
                    incident_date: "2025-02-05",
                    created_at: "2025-02-05T10:00:00Z"
                },
                {
                    id: 2,
                    seller_id: 2,
                    seller_name: "María García",
                    shopkeeper_id: 3,
                    shopkeeper_name: "Droguería La Salud",
                    type: "absence",
                    description: "No asistió a la visita programada",
                    incident_date: "2025-02-04",
                    created_at: "2025-02-04T10:00:00Z"
                }
            ];

            // Aplicar filtro a los datos de ejemplo
            let filteredSellerIncidents = mockSellerIncidents;
            if (filterSeller) {
                filteredSellerIncidents = mockSellerIncidents.filter(p =>
                    p.seller.toLowerCase().includes(filterSeller.toLowerCase())
                );
            }
            if (filterType) {
                filteredSellerIncidents = mockSellerIncidents.filter(p =>
                    p.type.toLowerCase().includes(filterType.toLowerCase())
                );
            }

            setIncidents(mockSellerIncidents);
            toast.info('Mostrando datos de ejemplo - El microservicio de users no está disponible');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (incident = null) => {
        if (incident) {
            setCurrentIncident(incident);
            setFormData({
                seller_id: incident.seller_id,
                shopkeeper_id: incident.shopkeeper_id || '',
                type: incident.type,
                description: incident.description || '',
                incident_date: incident.incident_date,
            });
        } else {
            setCurrentIncident(null);
            setFormData({
                seller_id: '',
                shopkeeper_id: '',
                type: '',
                description: '',
                incident_date: '',
            });
        }
        setFormErrors({});
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setCurrentIncident(null);
        setFormData({
            seller_id: '',
            shopkeeper_id: '',
            type: '',
            description: '',
            incident_date: '',
        });
        setFormErrors({});
    };

    const validateForm = () => {
        const errors = {};

        if (!formData.seller_id) errors.seller_id = "Debe seleccionar un vendedor";
        if (!formData.type) errors.type = "Debe seleccionar un tipo de incidencia";
        if (!formData.incident_date) errors.incident_date = "Debe seleccionar la fecha";
        if (!formData.description || !formData.description.trim()) errors.description = "La descripción es obligatoria";
        if (!formData.shopkeeper_id) errors.shopkeeper_id = "Debe seleccionar una tienda";

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        try {
            if (currentIncident) {
                // Actualizar
                await sellerIncidentsService.updateIncident(currentIncident.id, formData);
                toast.success("Incidencia actualizada correctamente");
            } else {
                // Crear
                await sellerIncidentsService.createIncident(formData);
                toast.success("Incidencia registrada correctamente");
            }

            handleCloseModal();
            loadData();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Error al guardar incidencia');
            console.error(error);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('¿Está seguro de eliminar esta incidencia?')) return;

        try {
            await sellerIncidentsService.deleteIncident(id);
            toast.success('Incidencia eliminada correctamente');
            loadData();
        } catch (error) {
            console.error(error);
            toast.error('Error al eliminar incidencia');
        }
    };

    if (loading) {
        return (
            <Container className="mt-4">
                <div className='text-center'>
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
                    <div className="d-flex align-items-center">
                        <div>
                            <h2>⚠️ Incidencias de Vendedores</h2>
                            <p className="text-muted">
                                Registrar, ver y gestionar incidencias relacionadas con los vendedores
                            </p>
                        </div>
                        {usingMockData && (
                            <div className="ms-3">
                                <Alert variant="warning" className="mb-0" style={{ fontSize: '0.875rem' }}>
                                    <i className="bi bi-exclamation-triangle me-1"></i>
                                    Datos de ejemplo
                                </Alert>
                            </div>
                        )}
                    </div>
                </Col>
                <Col md={4} className="text-end">
                    <Button
                        variant="primary"
                        onClick={() => handleOpenModal()}
                        disabled={usingMockData}
                        title={usingMockData ? "No disponible con datos de ejemplo" : ""}
                    >
                        ➕ Registrar Incidencia
                    </Button>
                </Col>
            </Row>

            {/* Filtros */}
            <Row className="mb-4">
                <Col md={4}>
                    <Form.Group>
                        <Form.Label>Filtrar por Vendedor</Form.Label>
                        <Form.Select
                            value={filterSeller}
                            onChange={(e) => setFilterSeller(e.target.value)}
                        >
                            <option value="">Todos los vendedores</option>
                            {sellers.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </Form.Select>
                    </Form.Group>
                </Col>

                <Col md={4}>
                    <Form.Group>
                        <Form.Label>Filtrar por Tipo</Form.Label>
                        <Form.Select
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                        >
                            <option value="">Todos los tipos de incidencias</option>
                            <option value="delay">Retardo</option>
                            <option value="absence">Ausencia</option>
                            <option value="non_compliance">Incumplimiento</option>
                        </Form.Select>
                    </Form.Group>
                </Col>

                <Col md={4}>
                    <Alert variant="info" className='mb-0'>
                        <strong>Total de Incidencias:</strong> {incidents.length}
                    </Alert>
                </Col>
            </Row>

            {/* Tabla */}
            <Row>
                <Col>
                    <Table striped bordered hover responsive>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Vendedor</th>
                                <th>Tienda</th>
                                <th>Tipo</th>
                                <th>Descripción</th>
                                <th>Fecha</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {incidents.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="text-center text-muted">
                                        No hay incidencias registradas
                                    </td>
                                </tr>
                            ) : (
                                incidents.map(incident => (
                                    <tr key={incident.id}>
                                        <td>{incident.id}</td>
                                        <td>{incident.seller_name || incident.seller_id}</td>
                                        <td>{incident.shopkeeper_name || incident.shopkeeper_id}</td>
                                        <td>
                                            <Badge bg="warning">
                                                {{
                                                    delay: "Retardo",
                                                    absence: "Ausencia",
                                                    non_compliance: "Incumplimiento"
                                                }[incident.type] || "Desconocido"}
                                            </Badge>
                                        </td>
                                        <td>{incident.description || '-'}</td>
                                        <td>{incident.incident_date}</td>
                                        <td>
                                            <Button
                                                size="sm"
                                                variant="info"
                                                className="me-2"
                                                onClick={() => handleOpenModal(incident)}
                                                disabled={usingMockData}
                                                title={usingMockData ? "No disponible con datos de ejemplo" : ""}
                                            >
                                                ✏️ Editar
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="danger"
                                                onClick={() => handleDelete(incident.id)}
                                                disabled={usingMockData}
                                                title={usingMockData ? "No disponible con datos de ejemplo" : ""}
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

            {/* Modal */}
            <Modal show={showModal} onHide={handleCloseModal} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>
                        {currentIncident ? "✏️ Editar Incidencia" : "➕ Registrar Incidencia"}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form onSubmit={handleSubmit}>
                        {/* Vendedor*/}
                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Vendedor *</Form.Label>
                                    <Form.Select
                                        value={formData.seller_id}
                                        onChange={(e) =>
                                            setFormData({ ...formData, seller_id: Number(e.target.value) })
                                        }
                                        isInvalid={!!formErrors.seller_id}
                                    >
                                        <option value="">Seleccione...</option>
                                        {sellers.map(s => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                        ))}
                                    </Form.Select>
                                    <Form.Control.Feedback type="invalid">
                                        {formErrors.seller_id}
                                    </Form.Control.Feedback>
                                </Form.Group>
                            </Col>
                            {/* Tienda */}
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Tienda *</Form.Label>
                                    <Form.Select
                                        value={formData.shopkeeper_id}
                                        onChange={(e) =>
                                            setFormData({ ...formData, shopkeeper_id: e.target.value })
                                        }
                                        isInvalid={!!formErrors.shopkeeper_id}
                                    >
                                        <option value="">Seleccione una tienda...</option>
                                        {shopkeepers.map(sk => (
                                            <option key={sk.id} value={sk.id}>{sk.name}</option>
                                        ))}
                                    </Form.Select>
                                    <Form.Control.Feedback type="invalid">
                                        {formErrors.shopkeeper_id}
                                    </Form.Control.Feedback>
                                </Form.Group>
                            </Col>
                        </Row>
                        {/* Tipo de incidencia */}
                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Tipo *</Form.Label>
                                    <Form.Select
                                        value={formData.type}
                                        onChange={(e) =>
                                            setFormData({ ...formData, type: e.target.value })
                                        }
                                        isInvalid={!!formErrors.type}
                                    >
                                        <option value="">Seleccione...</option>
                                        <option value="delay">Retardo</option>
                                        <option value="absence">Ausencia</option>
                                        <option value="non_compliance">Incumplimiento</option>
                                    </Form.Select>
                                    <Form.Control.Feedback type="invalid">
                                        {formErrors.type}
                                    </Form.Control.Feedback>
                                </Form.Group>
                            </Col>
                            {/* Tipo de incidencia */}
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Fecha *</Form.Label>
                                    <Form.Control
                                        type="date"
                                        value={formData.incident_date}
                                        onChange={(e) =>
                                            setFormData({ ...formData, incident_date: e.target.value })
                                        }
                                        isInvalid={!!formErrors.incident_date}
                                    />
                                    <Form.Control.Feedback type="invalid">
                                        {formErrors.incident_date}
                                    </Form.Control.Feedback>
                                </Form.Group>
                            </Col>
                        </Row>
                        {/* Descripcion */}
                        <Form.Group className="mb-3">
                            <Form.Label>Descripción *</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={3}
                                placeholder="Detalles de la incidencia"
                                value={formData.description}
                                onChange={(e) =>
                                    setFormData({ ...formData, description: e.target.value })
                                }
                                isInvalid={!!formErrors.description}
                            />
                            <Form.Control.Feedback type="invalid">
                                {formErrors.description}
                            </Form.Control.Feedback>
                        </Form.Group>
                        {/* Botones */}
                        <div className="d-flex justify-content-end gap-2">
                            <Button variant="secondary" onClick={handleCloseModal}>
                                Cancelar
                            </Button>
                            <Button variant="primary" type="submit">
                                {currentIncident ? "Actualizar" : "Registrar"} Incidencia
                            </Button>
                        </div>
                    </Form>
                </Modal.Body>
            </Modal>
        </Container >
    );
};

export default SellerIncidentsPage;