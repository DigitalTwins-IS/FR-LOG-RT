/**
 * Página de Gestión de Inventario
 * Gestión de inventario por tendero con productos
 */
import { useState, useEffect } from 'react';
import { Container, Row, Col, Table, Button, Modal, Form, Badge, Alert, Card } from 'react-bootstrap';
import { useSearchParams } from 'react-router-dom';
import { userService, inventoryService } from '../services/api';
import { toast } from 'react-toastify';

const InventoryPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [shopkeepers, setShopkeepers] = useState([]);
  const [selectedShopkeeper, setSelectedShopkeeper] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [currentItem, setCurrentItem] = useState(null);
  const [addForm, setAddForm] = useState({ product_id: '', current_stock: 0, min_stock: 10, max_stock: 100, unit_price: 0 });
  const [adjustForm, setAdjustForm] = useState({ product_id: '', quantity: 0, notes: '' });
  const [filterCategory, setFilterCategory] = useState('');
  const [showLowStock, setShowLowStock] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    // Aplicar filtros desde URL
    const filter = searchParams.get('filter');
    if (filter === 'low-stock') {
      setShowLowStock(true);
    } else if (filter === 'out-of-stock') {
      setShowLowStock(true);
      // Aquí podrías agregar lógica adicional para filtrar solo sin stock
    } else if (filter === 'normal-stock') {
      setShowLowStock(false);
      // Aquí podrías agregar lógica adicional para filtrar solo stock normal
    }
  }, [searchParams]);

  useEffect(() => {
    if (selectedShopkeeper) {
      loadInventory(selectedShopkeeper.id);
      loadSummary(selectedShopkeeper.id);
    }
  }, [selectedShopkeeper, showLowStock, filterCategory]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const shopkeepersData = await userService.getShopkeepers();
      const productsData = await inventoryService.getProducts();
      
      // Extraer categorías únicas
      const categoriesSet = new Set(productsData.map(p => p.category).filter(Boolean));
      const categoriesArray = Array.from(categoriesSet);
      
      setShopkeepers(shopkeepersData);
      setProducts(productsData);
      setCategories(categoriesArray);
      
      if (shopkeepersData.length > 0) {
        setSelectedShopkeeper(shopkeepersData[0]);
      }
    } catch (error) {
      toast.error('Error al cargar datos iniciales');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const loadInventory = async (shopkeeperId) => {
    if (!shopkeeperId) return;
    
    try {
      const inventoryData = await userService.getInventory(shopkeeperId);
      console.log('Datos del inventario recibidos:', inventoryData);
      
      // Aplicar filtro de stock bajo si está activo
      let filtered = inventoryData;
      if (showLowStock) {
        filtered = inventoryData.filter(item => item.stock_status === 'low');
      }
      
      // Aplicar filtro de categoría
      if (filterCategory) {
        filtered = filtered.filter(item => item.category === filterCategory);
      }
      
      console.log('Datos filtrados:', filtered);
      setInventory(filtered);
    } catch (error) {
      toast.error('Error al cargar inventario');
      console.error(error);
    }
  };

  const loadSummary = async (shopkeeperId) => {
    if (!shopkeeperId) return;
    
    try {
      const summaryData = await userService.getInventorySummary(shopkeeperId);
      setSummary(summaryData);
    } catch (error) {
      console.error('Error al cargar resumen:', error);
      toast.error('Error al cargar métricas del inventario');
      setSummary(null);
    }
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    
    try {
      // Encontrar el producto seleccionado para obtener su SKU y precio
      const selectedProduct = products.find(p => p.id === parseInt(addForm.product_id));
      if (!selectedProduct) {
        toast.error('Producto no encontrado');
        return;
      }

      await userService.addInventoryItem({
        shopkeeper_id: selectedShopkeeper.id,
        product_id: selectedProduct.id,
        current_stock: Math.round(addForm.current_stock || 0),
        unit_price: addForm.unit_price || selectedProduct.price || 0,
        min_stock: Math.round(addForm.min_stock || 0),
        max_stock: Math.round(addForm.max_stock || 0)
      });
      toast.success('Producto agregado exitosamente');
      setShowAddModal(false);
      setAddForm({ product_id: '', current_stock: 0, min_stock: 10, max_stock: 100, unit_price: 0 });
      if (selectedShopkeeper) {
        loadInventory(selectedShopkeeper.id);
        loadSummary(selectedShopkeeper.id);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al agregar producto');
      console.error(error);
    }
  };

  const handleUpdateItem = async (e) => {
    e.preventDefault();
    
    try {
      await userService.updateInventoryItem(currentItem.id, {
        current_stock: Math.round(currentItem.stock || 0),
        min_stock: Math.round(currentItem.min_stock || 0),
        max_stock: Math.round(currentItem.max_stock || 0)
      });
      toast.success('Item actualizado exitosamente');
    setShowEditModal(false);
      setCurrentItem(null);
      if (selectedShopkeeper) {
        loadInventory(selectedShopkeeper.id);
        loadSummary(selectedShopkeeper.id);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al actualizar item');
      console.error(error);
    }
  };

  const handleAdjustStock = async (e) => {
    e.preventDefault();
    
    try {
      await userService.adjustStock(selectedShopkeeper.id, {
        product_id: adjustForm.product_id,
        quantity: Math.round(adjustForm.quantity || 0),
        notes: adjustForm.notes
      });
      toast.success(`Stock ajustado: ${adjustForm.quantity > 0 ? '+' : ''}${adjustForm.quantity}`);
      setShowAdjustModal(false);
      setAdjustForm({ product_id: '', quantity: 0, notes: '' });
      setCurrentItem(null);
      if (selectedShopkeeper) {
        loadInventory(selectedShopkeeper.id);
        loadSummary(selectedShopkeeper.id);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al ajustar stock');
      console.error(error);
    }
  };


  const handleDeleteItem = async (itemId) => {
    if (!window.confirm('¿Está seguro de eliminar este producto del inventario?')) return;
    
    try {
      await userService.deleteInventoryItem(itemId);
      toast.success('Producto eliminado del inventario');
      if (selectedShopkeeper) {
        loadInventory(selectedShopkeeper.id);
        loadSummary(selectedShopkeeper.id);
      }
    } catch (error) {
      toast.error('Error al eliminar producto del inventario');
      console.error(error);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);
  };

  const getStockBadgeClass = (status) => {
    if (status === 'low') return 'danger';
    if (status === 'high') return 'warning';
    return 'success';
  };

  const getStockBadgeText = (status) => {
    if (status === 'low') return 'Stock Bajo';
    if (status === 'high') return 'Stock Alto';
    return 'Normal';
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
          <h2>📦 Gestión de Inventario</h2>
          <p className="text-muted">Administrar inventario de tenderos</p>
        </Col>
        <Col md={4} className="text-end">
          <Button 
            variant="success" 
            onClick={() => setShowAddModal(true)} 
            disabled={!selectedShopkeeper}
          >
            ➕ Agregar Producto
          </Button>
        </Col>
      </Row>

      <Row>
        <Col md={3}>
          <Card className="mb-3 shadow-sm border-0">
            <Card.Header className="bg-gradient" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
              <h5 className="mb-0 text-white d-flex align-items-center">
                <span className="me-2">🏪</span>
                Tenderos
                <Badge bg="light" text="dark" className="ms-2">{shopkeepers.length}</Badge>
              </h5>
            </Card.Header>
            <Card.Body style={{ maxHeight: '500px', overflowY: 'auto', padding: '0.5rem' }}>
              {shopkeepers.length === 0 ? (
                <div className="text-center text-muted py-4">
                  <div className="mb-2">📭</div>
                  <small>No hay tenderos disponibles</small>
                </div>
              ) : (
                shopkeepers.map(shopkeeper => (
                  <div
                    key={shopkeeper.id}
                    onClick={() => setSelectedShopkeeper(shopkeeper)}
                    className={`p-3 mb-2 rounded transition-all ${
                      selectedShopkeeper?.id === shopkeeper.id 
                        ? 'bg-primary text-white shadow-sm' 
                        : 'bg-white border border-light hover-shadow'
                    }`}
                    style={{ 
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      border: selectedShopkeeper?.id === shopkeeper.id ? '2px solid #0d6efd' : '1px solid #e9ecef'
                    }}
                    onMouseEnter={(e) => {
                      if (selectedShopkeeper?.id !== shopkeeper.id) {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedShopkeeper?.id !== shopkeeper.id) {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'none';
                      }
                    }}
                  >
                    <div className="d-flex align-items-start">
                      <div className={`rounded-circle d-flex align-items-center justify-content-center me-3 ${
                        selectedShopkeeper?.id === shopkeeper.id ? 'bg-white text-primary' : 'bg-primary text-white'
                      }`}
                      style={{ width: '40px', height: '40px', fontSize: '1.2rem', flexShrink: 0 }}>
                        🏪
                      </div>
                      <div className="flex-grow-1">
                        <div className={`fw-bold mb-1 ${selectedShopkeeper?.id === shopkeeper.id ? 'text-white' : ''}`}>
                          {shopkeeper.name}
                        </div>
                        {shopkeeper.business_name && (
                          <div className={`small ${selectedShopkeeper?.id === shopkeeper.id ? 'text-white-50' : 'text-muted'}`}>
                            <span className="me-1">🏢</span>
                            {shopkeeper.business_name}
                          </div>
                        )}
                        {selectedShopkeeper?.id === shopkeeper.id && inventory.length > 0 && (
                          <div className="mt-2 pt-2 border-top border-white border-opacity-25">
                            <small className="d-flex align-items-center">
                              <span className="me-1">📦</span>
                              {inventory.length} producto{inventory.length !== 1 ? 's' : ''}
                            </small>
                          </div>
                        )}
                      </div>
                      {selectedShopkeeper?.id === shopkeeper.id && (
                        <div className="text-white">
                          <span>✓</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </Card.Body>
          </Card>

          <Card>
            <Card.Header>
              <h5 className="mb-0">Filtros</h5>
            </Card.Header>
            <Card.Body>
              <Form.Group className="mb-3">
                <Form.Label>Categoría</Form.Label>
                <Form.Select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                >
                  <option value="">Todas</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </Form.Select>
              </Form.Group>
              <Form.Check
                type="checkbox"
                label="Solo stock bajo"
                checked={showLowStock}
                onChange={(e) => setShowLowStock(e.target.checked)}
              />
            </Card.Body>
          </Card>
        </Col>

        <Col md={9}>
          {!selectedShopkeeper ? (
            <Alert variant="info">
              Seleccione un tendero para ver su inventario
            </Alert>
          ) : (
            <>
              {summary && (
                <Row className="mb-3">
                  <Col md={4}>
                    <Card className="text-center">
                      <Card.Body>
                        <Card.Title className="small text-muted">Productos</Card.Title>
                        <h2>{summary.total_products || 0}</h2>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col md={4}>
                    <Card className="text-center">
                      <Card.Body>
                        <Card.Title className="small text-muted">Stock Bajo</Card.Title>
                        <h2 className={summary.low_stock_items > 0 ? 'text-danger' : 'text-success'}>
                          {summary.low_stock_items || 0}
                        </h2>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col md={4}>
                    <Card className="text-center">
                      <Card.Body>
                        <Card.Title className="small text-muted">Valor Total</Card.Title>
                        <h4 className="text-success">{formatCurrency(summary.total_value || 0)}</h4>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>
              )}

              <Card className="shadow-sm border-0">
                <Card.Header className="bg-gradient d-flex justify-content-between align-items-center" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                  <h5 className="mb-0 text-white d-flex align-items-center">
                    <span className="me-2">📦</span>
                    Inventario de {selectedShopkeeper.name}
                  </h5>
                  <Badge bg="light" text="dark" className="fs-6">{inventory.length} {inventory.length === 1 ? 'item' : 'items'}</Badge>
                </Card.Header>
                <div className="table-responsive">
                  <Table striped bordered hover responsive className="mb-0">
                    <thead className="table-dark">
                      <tr>
                        <th className="align-middle">
                          <span className="me-2">📦</span>Producto
                        </th>
                        <th className="align-middle">
                          <span className="me-2">🏷️</span>Categoría
                        </th>
                        <th className="align-middle text-end">
                          <span className="me-2">💰</span>Precio
                        </th>
                        <th className="align-middle text-center">
                          <span className="me-2">📊</span>Stock
                        </th>
                        <th className="align-middle text-center">
                          <span className="me-2">⚙️</span>Min/Max
                        </th>
                        <th className="align-middle text-center">
                          <span className="me-2">📈</span>Estado
                        </th>
                        <th className="align-middle text-end">
                          <span className="me-2">💵</span>Valor
                        </th>
                        <th className="align-middle text-center">
                          <span className="me-2">⚡</span>Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {inventory.length === 0 ? (
                        <tr>
                          <td colSpan="8" className="text-center text-muted py-5">
                            <div className="mb-2" style={{ fontSize: '2rem' }}>📭</div>
                            <div>No hay productos en el inventario</div>
                            <Button 
                              variant="primary" 
                              size="sm" 
                              className="mt-3"
                              onClick={() => setShowAddModal(true)}
                            >
                              ➕ Agregar Primer Producto
                            </Button>
                          </td>
                        </tr>
                      ) : (
                        inventory.map(item => (
                          <tr key={item.id} className="align-middle">
                            <td>
                              <div className="d-flex align-items-center">
                                <div className="me-2" style={{ fontSize: '1.2rem' }}>📦</div>
                                <div>
                                  <div className="fw-bold">{item.product_name}</div>
                                  {item.product_description && (
                                    <small className="text-muted d-block">{item.product_description.substring(0, 50)}...</small>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td>
                              <Badge bg="secondary" className="px-2 py-1">{item.category || 'Sin categoría'}</Badge>
                            </td>
                            <td className="text-end">
                              <span className="fw-semibold">{formatCurrency(item.price)}</span>
                            </td>
                            <td className="text-center">
                              <span className={`fw-bold fs-5 ${item.stock < item.min_stock ? 'text-danger' : item.stock > item.max_stock ? 'text-warning' : 'text-success'}`}>
                                {Math.round(item.stock || 0)}
                              </span>
                            </td>
                            <td className="text-center">
                              <div className="d-flex flex-column align-items-center">
                                <small className="text-muted mb-1">
                                  <span className="badge bg-info">Min: {Math.round(item.min_stock || 0)}</span>
                                </small>
                                <small className="text-muted">
                                  <span className="badge bg-secondary">Max: {Math.round(item.max_stock || 0)}</span>
                                </small>
                              </div>
                            </td>
                            <td className="text-center">
                              <Badge bg={getStockBadgeClass(item.stock_status)} className="px-3 py-2">
                                {getStockBadgeText(item.stock_status)}
                              </Badge>
                            </td>
                            <td className="text-end">
                              <span className="fw-bold text-success">{formatCurrency(Math.round(item.stock || 0) * item.price)}</span>
                            </td>
                            <td>
                              <div className="d-flex justify-content-center gap-1">
                                <Button
                                  size="sm"
                                  variant="info"
                                  className="d-flex align-items-center justify-content-center"
                                  style={{ width: '32px', height: '32px' }}
                                  onClick={() => {
                                    setCurrentItem(item);
                                    setAdjustForm({ product_id: item.product_id, quantity: 0, notes: '' });
                                    setShowAdjustModal(true);
                                  }}
                                  title="Ajustar Stock"
                                >
                                  📊
                                </Button>
                                <Button
                                  size="sm"
                                  variant="warning"
                                  className="d-flex align-items-center justify-content-center"
                                  style={{ width: '32px', height: '32px' }}
                                  onClick={() => {
                                    setCurrentItem(item);
                                    setShowEditModal(true);
                                  }}
                                  title="Editar"
                                >
                                  ✏️
                                </Button>
                                <Button
                                  size="sm"
                                  variant="danger"
                                  className="d-flex align-items-center justify-content-center"
                                  style={{ width: '32px', height: '32px' }}
                                  onClick={() => handleDeleteItem(item.id)}
                                  title="Eliminar"
                                >
                                  🗑️
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </Table>
                </div>
              </Card>
            </>
          )}
        </Col>
      </Row>

      {/* Modal para agregar producto */}
      <Modal show={showAddModal} onHide={() => setShowAddModal(false)} size="lg">
        <Modal.Header closeButton className="bg-primary text-white">
          <Modal.Title className="d-flex align-items-center">
            <span className="me-2">➕</span>
            Agregar Producto al Inventario
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleAddProduct}>
            <div className="border rounded p-3 mb-3 bg-light">
              <h6 className="mb-3 text-muted">🛍️ Selección de Producto</h6>
              <Form.Group className="mb-3">
                <Form.Label className="fw-semibold">
                  <span className="me-2">📦</span>Producto
                </Form.Label>
                <Form.Select
                  value={addForm.product_id}
                  onChange={(e) => {
                    const productId = e.target.value;
                    const selectedProduct = products.find(p => p.id === parseInt(productId));
                    setAddForm({
                      ...addForm, 
                      product_id: productId,
                      unit_price: selectedProduct ? selectedProduct.price : 0
                    });
                  }}
                  required
                  className="border-primary"
                >
                  <option value="">Seleccione un producto...</option>
                  {products.filter(p => p.is_active).map(product => (
                    <option key={product.id} value={product.id}>
                      {product.name} - {formatCurrency(product.price)}
                    </option>
                  ))}
                </Form.Select>
                <Form.Text className="text-muted">
                  Seleccione el producto que desea agregar al inventario
                </Form.Text>
              </Form.Group>
            </div>
            <div className="border rounded p-3 mb-3 bg-light">
              <h6 className="mb-3 text-muted">📊 Información del Producto</h6>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-semibold">
                      <span className="me-2">📦</span>Stock Inicial
                    </Form.Label>
                    <Form.Control
                      type="number"
                      step="1"
                      min="0"
                      value={addForm.current_stock}
                      onChange={(e) => setAddForm({...addForm, current_stock: parseInt(e.target.value) || 0})}
                      placeholder="Cantidad inicial en inventario"
                      required
                    />
                    <Form.Text className="text-muted">
                      Cantidad de unidades disponibles
                    </Form.Text>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-semibold">
                      <span className="me-2">💰</span>Precio Unitario
                    </Form.Label>
                    <Form.Control
                      type="number"
                      step="0.01"
                      min="0"
                      value={addForm.unit_price}
                      readOnly
                      className="bg-white border-primary"
                      required
                    />
                    <Form.Text className="text-success fw-semibold">
                      Precio del producto seleccionado
                    </Form.Text>
                  </Form.Group>
                </Col>
              </Row>
            </div>

            <div className="border rounded p-3 bg-light">
              <h6 className="mb-3 text-muted">⚙️ Configuración de Stock</h6>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-semibold">
                      <span className="me-2">⬇️</span>Stock Mínimo
                    </Form.Label>
                    <Form.Control
                      type="number"
                      step="1"
                      min="0"
                      value={addForm.min_stock}
                      onChange={(e) => setAddForm({...addForm, min_stock: parseInt(e.target.value) || 0})}
                      placeholder="Nivel mínimo de stock"
                    />
                    <Form.Text className="text-muted">
                      Alerta cuando el stock esté por debajo de este valor
                    </Form.Text>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-semibold">
                      <span className="me-2">⬆️</span>Stock Máximo
                    </Form.Label>
                    <Form.Control
                      type="number"
                      step="1"
                      min="0"
                      value={addForm.max_stock}
                      onChange={(e) => setAddForm({...addForm, max_stock: parseInt(e.target.value) || 0})}
                      placeholder="Capacidad máxima de almacenamiento"
                    />
                    <Form.Text className="text-muted">
                      Capacidad máxima de almacenamiento
                    </Form.Text>
                  </Form.Group>
                </Col>
              </Row>
            </div>
            <div className="d-flex justify-content-end gap-2 mt-4">
              <Button variant="outline-secondary" onClick={() => setShowAddModal(false)} size="lg">
                <span className="me-2">❌</span>Cancelar
              </Button>
              <Button variant="primary" type="submit" size="lg">
                <span className="me-2">✅</span>Agregar Producto
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>

      {/* Modal para editar item */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)} size="lg">
        <Modal.Header closeButton className="bg-info text-white">
          <Modal.Title className="d-flex align-items-center">
            <span className="me-2">✏️</span>
            Editar Item de Inventario
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleUpdateItem}>
            {currentItem && (
              <Alert variant="info" className="mb-3 border-start border-4 border-info">
                <div className="d-flex align-items-center">
                  <span className="me-2">📦</span>
                  <strong>Producto:</strong> <span className="ms-2">{currentItem.product_name}</span>
                </div>
                {currentItem.category && (
                  <div className="d-flex align-items-center mt-2">
                    <span className="me-2">🏷️</span>
                    <strong>Categoría:</strong> <span className="ms-2 badge bg-secondary">{currentItem.category}</span>
                  </div>
                )}
              </Alert>
            )}
            <div className="border rounded p-3 mb-3 bg-light">
              <h6 className="mb-3 text-muted">⚙️ Configuración de Stock</h6>
              <Row>
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-semibold">
                      <span className="me-2">📦</span>Stock Actual
                    </Form.Label>
                    <Form.Control
                      type="number"
                      step="1"
                      min="0"
                      value={currentItem?.stock || 0}
                      onChange={(e) => setCurrentItem({...currentItem, stock: parseInt(e.target.value) || 0})}
                      placeholder="Cantidad actual"
                    />
                    <Form.Text className="text-muted">
                      Unidades disponibles
                    </Form.Text>
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-semibold">
                      <span className="me-2">⬇️</span>Stock Mínimo
                    </Form.Label>
                    <Form.Control
                      type="number"
                      step="1"
                      min="0"
                      value={currentItem?.min_stock || 0}
                      onChange={(e) => setCurrentItem({...currentItem, min_stock: parseInt(e.target.value) || 0})}
                      placeholder="Nivel mínimo"
                    />
                    <Form.Text className="text-muted">
                      Alerta cuando esté por debajo
                    </Form.Text>
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-semibold">
                      <span className="me-2">⬆️</span>Stock Máximo
                    </Form.Label>
                    <Form.Control
                      type="number"
                      step="1"
                      min="0"
                      value={currentItem?.max_stock || 0}
                      onChange={(e) => setCurrentItem({...currentItem, max_stock: parseInt(e.target.value) || 0})}
                      placeholder="Capacidad máxima"
                    />
                    <Form.Text className="text-muted">
                      Capacidad de almacenamiento
                    </Form.Text>
                  </Form.Group>
                </Col>
              </Row>
            </div>
            <div className="d-flex justify-content-end gap-2 mt-4">
              <Button variant="outline-secondary" onClick={() => setShowEditModal(false)} size="lg">
                <span className="me-2">❌</span>Cancelar
              </Button>
              <Button variant="info" type="submit" size="lg" className="text-white">
                <span className="me-2">💾</span>Actualizar Item
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>

      {/* Modal para ajustar stock */}
      <Modal show={showAdjustModal} onHide={() => setShowAdjustModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>📊 Ajustar Stock</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleAdjustStock}>
            {currentItem && (
              <Alert variant="info" className="mb-3 border-start border-4 border-info">
                <div className="d-flex align-items-center mb-2">
                  <span className="me-2">📦</span>
                  <strong>Producto:</strong> <span className="ms-2">{currentItem.product_name}</span>
                </div>
                <div className="d-flex align-items-center">
                  <span className="me-2">📊</span>
                  <strong>Stock actual:</strong> <span className="ms-2 badge bg-primary fs-6">{Math.round(currentItem.stock || 0)} unidades</span>
                </div>
              </Alert>
            )}
            <div className="border rounded p-3 mb-3 bg-light">
              <h6 className="mb-3 text-muted">⚙️ Ajuste de Cantidad</h6>
              <Form.Group className="mb-3">
                <Form.Label className="fw-semibold">
                  <span className="me-2">🔢</span>Cantidad a Ajustar
                </Form.Label>
                <div className="d-flex align-items-center gap-3">
                  <Button
                    variant="outline-danger"
                    size="lg"
                    onClick={() => setAdjustForm({...adjustForm, quantity: Math.max(0, (adjustForm.quantity || 0) - 1)})}
                    className="px-4"
                  >
                    <strong>-</strong>
                  </Button>
                  <Form.Control
                    type="number"
                    step="1"
                    value={adjustForm.quantity || 0}
                    onChange={(e) => setAdjustForm({...adjustForm, quantity: parseInt(e.target.value) || 0})}
                    className="text-center fs-4 fw-bold"
                    style={{ maxWidth: '150px' }}
                  />
                  <Button
                    variant="outline-success"
                    size="lg"
                    onClick={() => setAdjustForm({...adjustForm, quantity: (adjustForm.quantity || 0) + 1})}
                    className="px-4"
                  >
                    <strong>+</strong>
                  </Button>
                </div>
                <Form.Text className="text-muted mt-2 d-block">
                  <span className="fw-semibold">Nuevo stock:</span> 
                  <span className={`ms-2 badge ${(currentItem ? Math.round(currentItem.stock || 0) + Math.round(adjustForm.quantity || 0) : 0) < 0 ? 'bg-danger' : 'bg-success'} fs-6`}>
                    {currentItem ? Math.round(currentItem.stock || 0) + Math.round(adjustForm.quantity || 0) : 0} unidades
                  </span>
                </Form.Text>
              </Form.Group>
            </div>
            <Form.Group className="mb-3">
              <Form.Label className="fw-semibold">
                <span className="me-2">📝</span>Notas del Ajuste
              </Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                placeholder="Ingrese el motivo del ajuste (opcional)..."
                value={adjustForm.notes}
                onChange={(e) => setAdjustForm({...adjustForm, notes: e.target.value})}
                className="border-secondary"
              />
              <Form.Text className="text-muted">
                Ej: "Ajuste por inventario físico", "Devolución de cliente", etc.
              </Form.Text>
            </Form.Group>
            <div className="d-flex justify-content-end gap-2 mt-4">
              <Button variant="outline-secondary" onClick={() => setShowAdjustModal(false)} size="lg">
                <span className="me-2">❌</span>Cancelar
              </Button>
              <Button variant="success" type="submit" size="lg">
                <span className="me-2">✅</span>Aplicar Ajuste
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>

    </Container>
  );
};

export default InventoryPage;