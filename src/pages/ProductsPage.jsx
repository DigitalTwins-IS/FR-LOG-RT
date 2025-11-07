/**
 * Página de Gestión de Productos - HU23
 * Como administrador, quiero registrar y gestionar productos en el sistema para mantener un catálogo actualizado.
 */
import { useState, useEffect } from 'react';
import { Container, Row, Col, Table, Button, Modal, Form, Badge, Alert } from 'react-bootstrap';
import { productService } from '../services/api';
import { toast } from 'react-toastify';
import { APP_CONFIG } from '../config';

const ProductsPage = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [currentProduct, setCurrentProduct] = useState(null);
    const [usingMockData, setUsingMockData] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        price: '',
        category: '',
        is_active: true
    });
    const [formErrors, setFormErrors] = useState({});

    const [filterCategory, setFilterCategory] = useState('');

    useEffect(() => {
        loadData();
    }, [filterCategory]);

    const loadData = async () => {
        try {
            setLoading(true);
            setUsingMockData(false);
            console.log('🔄 Intentando cargar productos del microservicio...');
            const productsData = await productService.getAll(filterCategory);
            console.log('✅ Productos cargados del microservicio:', productsData);
            setProducts(productsData);
        } catch (error) {
            console.error('❌ Error cargando productos del microservicio:', error);
            console.warn('🔄 Usando datos de ejemplo como fallback...');
            setUsingMockData(true);
            // Usar datos de ejemplo cuando el microservicio no esté disponible
            const mockProducts = [
                {
                    id: 1,
                    name: "Coca Cola 350ml",
                    description: "Bebida gaseosa sabor cola",
                    price: 2500.00,
                    category: "Bebidas",
                    is_active: true,
                    created_at: "2025-01-15T10:00:00Z",
                    updated_at: "2025-01-15T10:00:00Z"
                },
                {
                    id: 2,
                    name: "Arroz Integral 500g",
                    description: "Arroz integral de grano largo",
                    price: 3200.50,
                    category: "Granos",
                    is_active: true,
                    created_at: "2025-01-15T10:00:00Z",
                    updated_at: "2025-01-15T10:00:00Z"
                },
                {
                    id: 3,
                    name: "Leche Alquería 1L",
                    description: "Leche entera pasteurizada",
                    price: 3200.00,
                    category: "Lácteos",
                    is_active: true,
                    created_at: "2025-01-15T10:00:00Z",
                    updated_at: "2025-01-15T10:00:00Z"
                },
                {
                    id: 4,
                    name: "Pan Bimbo Integral",
                    description: "Pan de molde integral",
                    price: 4500.00,
                    category: "Panadería",
                    is_active: true,
                    created_at: "2025-01-15T10:00:00Z",
                    updated_at: "2025-01-15T10:00:00Z"
                },
                {
                    id: 5,
                    name: "Manzana Roja",
                    description: "Manzana roja fresca por unidad",
                    price: 800.00,
                    category: "Frutas y Verduras",
                    is_active: true,
                    created_at: "2025-01-15T10:00:00Z",
                    updated_at: "2025-01-15T10:00:00Z"
                }
            ];
            
            // Aplicar filtro de categoría a los datos de ejemplo
            let filteredProducts = mockProducts;
            if (filterCategory) {
                filteredProducts = mockProducts.filter(p => 
                    p.category.toLowerCase().includes(filterCategory.toLowerCase())
                );
            }
            
            setProducts(filteredProducts);
            toast.info('Mostrando datos de ejemplo - El microservicio de productos no está disponible');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (product = null) => {
        if (product) {
            setCurrentProduct(product);
            setFormData({
                name: product.name,
                description: product.description || '',
                price: product.price || '',
                category: product.category || '',
                is_active: product.is_active ?? true
            });
        } else {
            setCurrentProduct(null);
            setFormData({
                name: '',
                description: '',
                price: '',
                category: '',
                is_active: true
            });
        }
        setFormErrors({});
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setCurrentProduct(null);
        setFormData({
            name: '',
            description: '',
            price: '',
            category: '',
            is_active: true
        });
        setFormErrors({});
    };

    const validateForm = () => {
        const errors = {};

        if (!formData.name || formData.name.length < 3) {
            errors.name = 'El nombre debe tener al menos 3 caracteres';
        }

        if (!formData.price || isNaN(formData.price) || Number(formData.price) <= 0) {
            errors.price = 'El precio debe ser un número mayor que 0';
        }

        if (!formData.category || formData.category.length < 3) {
            errors.category = 'Debe ingresar una categoría válida';
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
            if (currentProduct) {
                // Actualizar producto (HU23)
                await productService.updateProduct(currentProduct.id, formData);
                toast.success('Producto actualizado exitosamente');
            } else {
                // Crear nuevo producto (HU23)
                await productService.createProduct(formData);
                toast.success('Producto creado exitosamente');
            }

            handleCloseModal();
            loadData();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Error al guardar producto');
            console.error(error);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('¿Está seguro de desactivar este producto?')) return;

        try {
            await productService.deactivateProduct(id);
            toast.success('Producto desactivado correctamente');
            loadData();
        } catch (error) {
            console.error(error);
            toast.error('Error al desactivar producto');
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
                    <div className="d-flex align-items-center">
                        <div>
                            <h2>📋 Gestión de Catálogo</h2>
                            <p className="text-muted">Crear, actualizar y desactivar productos</p>
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
                        ➕ Crear Producto
                    </Button>
                </Col>
            </Row>

            {/* Filtros */}
            <Row className="mb-3">
                <Col md={4}>
                    <Form.Group>
                        <Form.Label>Filtrar por Categoria</Form.Label>
                        <Form.Select
                            value={filterCategory}
                            onChange={(e) => setFilterCategory(e.target.value)}
                        >
                            <option value="">Todas las categorias</option>
                            {[...new Set(products.map(p => p.category))] // elimina duplicados
                                .filter(Boolean) // evita valores nulos o vacíos
                                .map((cat, index) => (
                                    <option key={index} value={cat}>
                                        {cat}
                                    </option>
                                ))}
                        </Form.Select>
                    </Form.Group>
                </Col>
                <Col md={8}>
                    <Alert variant="info" className="mb-0">
                        <strong>Total de Productos:</strong> {products.length}
                    </Alert>
                </Col>
            </Row>

            {/* Tabla de productos */}
            <Row>
                <Col>
                    <Table striped bordered hover responsive>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Nombre</th>
                                <th>Descripción</th>
                                <th>Precio</th>
                                <th>Categoría</th>
                                <th>Estado</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {products.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="text-center text-muted">
                                        No hay productos registrados
                                    </td>
                                </tr>
                            ) : (
                                products.map(product => (
                                    <tr key={product.id}>
                                        <td>{product.id}</td>
                                        <td>{product.name}</td>
                                        <td>{product.description || '-'}</td>
                                        <td>${Number(product.price).toFixed(2)}</td>
                                        <td>{product.category || '-'}</td>
                                        <td>
                                            <Badge bg={product.is_active ? "success" : "secondary"}>
                                                {product.is_active ? "Activo" : "Inactivo"}
                                            </Badge>
                                        </td>
                                        <td>
                                            <Button
                                                size="sm"
                                                variant="info"
                                                className="me-2"
                                                onClick={() => handleOpenModal(product)}
                                                disabled={usingMockData}
                                                title={usingMockData ? "No disponible con datos de ejemplo" : ""}
                                            >
                                                ✏️ Editar
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="danger"
                                                onClick={() => handleDelete(product.id)}
                                                disabled={usingMockData}
                                                title={usingMockData ? "No disponible con datos de ejemplo" : ""}
                                            >
                                                🗑️ Desactivar
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
                        {currentProduct ? '✏️ Editar Producto' : '➕ Crear Producto'}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form onSubmit={handleSubmit}>
                        {/* Nombre */}
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>Nombre *</Form.Label>
                                <Form.Control
                                    type="text"
                                    placeholder="Nombre del producto"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    isInvalid={!!formErrors.name}
                                    required
                                />
                                <Form.Control.Feedback type="invalid">
                                    {formErrors.name}
                                </Form.Control.Feedback>
                            </Form.Group>
                        </Col>

                        {/* Descripción */}
                        <Form.Group className="mb-3">
                            <Form.Label>Descripción</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={3}
                                placeholder="Descripción del producto"
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

                        <Row>
                            {/* Precio */}
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Precio *</Form.Label>
                                    <Form.Control
                                        type="number"
                                        placeholder="0.00"
                                        value={formData.price}
                                        onChange={(e) =>
                                            setFormData({ ...formData, price: e.target.value })
                                        }
                                        isInvalid={!!formErrors.price}
                                        required
                                    />
                                    <Form.Control.Feedback type="invalid">
                                        {formErrors.price}
                                    </Form.Control.Feedback>
                                </Form.Group>
                            </Col>

                            {/* Categoría */}
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Categoría *</Form.Label>
                                    <Form.Control
                                        type="text"
                                        placeholder="Ejemplo: Lácteos, Dulcería..."
                                        value={formData.category}
                                        onChange={(e) =>
                                            setFormData({ ...formData, category: e.target.value })
                                        }
                                        isInvalid={!!formErrors.category}
                                        required
                                    />
                                    <Form.Control.Feedback type="invalid">
                                        {formErrors.category}
                                    </Form.Control.Feedback>
                                </Form.Group>
                            </Col>
                        </Row>

                        {/* Estado */}
                        {currentProduct && (
                            <Form.Group className="mb-4">
                                <Form.Label>Estado</Form.Label>
                                <Form.Select
                                    value={formData.is_active ? "true" : "false"}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            is_active: e.target.value === "true",
                                        })
                                    }
                                >
                                    <option value="true">Activo</option>
                                    <option value="false">Inactivo</option>
                                </Form.Select>
                            </Form.Group>
                        )}
                        {/* Botones */}
                        <div className="d-flex justify-content-end gap-2">
                            <Button variant="secondary" onClick={handleCloseModal}>
                                Cancelar
                            </Button>
                            <Button variant="primary" type="submit">
                                {currentProduct ? 'Actualizar' : 'Crear'} Producto
                            </Button>
                        </div>
                    </Form>
                </Modal.Body>
            </Modal>
        </Container>
    );
};

export default ProductsPage;

