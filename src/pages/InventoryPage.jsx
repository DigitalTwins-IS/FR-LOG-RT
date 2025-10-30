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
        product_id: selectedProduct.id, // Usar el ID del producto
        stock: addForm.current_stock,
        min_stock: addForm.min_stock,
        max_stock: addForm.max_stock
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
        stock: currentItem.stock,
        min_stock: currentItem.min_stock,
        max_stock: currentItem.max_stock
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
        quantity: adjustForm.quantity,
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
          <Card className="mb-3">
            <Card.Header>
              <h5 className="mb-0">Tenderos</h5>
            </Card.Header>
            <Card.Body style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {shopkeepers.map(shopkeeper => (
                <div
                  key={shopkeeper.id}
                  onClick={() => setSelectedShopkeeper(shopkeeper)}
                  className={`p-2 mb-2 rounded cursor-pointer ${
                    selectedShopkeeper?.id === shopkeeper.id ? 'bg-primary text-white' : 'bg-light'
                  }`}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="fw-bold">{shopkeeper.name}</div>
                  <div className="small">{shopkeeper.business_name}</div>
                </div>
              ))}
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

              <Card>
                <Card.Header className="d-flex justify-content-between align-items-center">
                  <h5 className="mb-0">Inventario de {selectedShopkeeper.name}</h5>
                  <Badge bg="secondary">{inventory.length} items</Badge>
                </Card.Header>
                <Table striped bordered hover responsive>
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th>Categoría</th>
                      <th>Precio</th>
                      <th>Stock</th>
                      <th>Min/Max</th>
                      <th>Estado</th>
                      <th>Valor</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventory.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="text-center text-muted">
                          No hay productos en el inventario
                        </td>
                      </tr>
                    ) : (
                      inventory.map(item => (
                        <tr key={item.id}>
                          <td className="fw-bold">{item.product_name}</td>
                          <td>
                            <Badge bg="secondary">{item.category}</Badge>
                          </td>
                          <td>{formatCurrency(item.price)}</td>
                          <td>
                            <span className={item.stock < item.min_stock ? 'text-danger fw-bold' : 'fw-bold'}>
                              {item.stock || 'N/A'}
                            </span>
                          </td>
                          <td>
                            <small className="text-muted">
                              {item.min_stock} / {item.max_stock}
                            </small>
                          </td>
                          <td>
                            <Badge bg={getStockBadgeClass(item.stock_status)}>
                              {getStockBadgeText(item.stock_status)}
                            </Badge>
                          </td>
                          <td>{formatCurrency(item.stock * item.price)}</td>
                          <td>
                            <Button
                              size="sm"
                              variant="info"
                              className="me-1"
                              onClick={() => {
                                setCurrentItem(item);
                                setAdjustForm({ product_id: item.product_id, quantity: 0, notes: '' });
                                setShowAdjustModal(true);
                              }}
                            >
                              📊
                            </Button>
                            <Button
                              size="sm"
                              variant="warning"
                              className="me-1"
                              onClick={() => {
                                setCurrentItem(item);
                                setShowEditModal(true);
                              }}
                            >
                              ✏
                            </Button>
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={() => handleDeleteItem(item.id)}
                            >
                              🗑
                            </Button>
                          </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                </Table>
              </Card>
            </>
          )}
        </Col>
      </Row>

      {/* Modal para agregar producto */}
      <Modal show={showAddModal} onHide={() => setShowAddModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>➕ Agregar Producto</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleAddProduct}>
            <Form.Group className="mb-3">
              <Form.Label>Producto</Form.Label>
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
              >
                  <option value="">Seleccione</option>
                {products.filter(p => p.is_active).map(product => (
                  <option key={product.id} value={product.id}>
                    {product.name} - {formatCurrency(product.price)}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
            <Row>
              <Col md={3}>
                <Form.Group className="mb-3">
                  <Form.Label>Stock</Form.Label>
                  <Form.Control
                    type="number"
                    step="0.01"
                    min="0"
                    value={addForm.current_stock}
                    onChange={(e) => setAddForm({...addForm, current_stock: parseFloat(e.target.value)})}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group className="mb-3">
                  <Form.Label>Precio Unitario</Form.Label>
                  <Form.Control
                    type="number"
                    step="0.01"
                    min="0"
                    value={addForm.unit_price}
                    onChange={(e) => setAddForm({...addForm, unit_price: parseFloat(e.target.value)})}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group className="mb-3">
                  <Form.Label>Min</Form.Label>
                  <Form.Control
                    type="number"
                    step="0.01"
                    min="0"
                    value={addForm.min_stock}
                    onChange={(e) => setAddForm({...addForm, min_stock: parseFloat(e.target.value)})}
                  />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group className="mb-3">
                  <Form.Label>Max</Form.Label>
                  <Form.Control
                    type="number"
                    step="0.01"
                    min="0"
                    value={addForm.max_stock}
                    onChange={(e) => setAddForm({...addForm, max_stock: parseFloat(e.target.value)})}
                  />
                </Form.Group>
              </Col>
            </Row>
            <div className="d-flex justify-content-end gap-2">
              <Button variant="secondary" onClick={() => setShowAddModal(false)}>
                Cancelar
              </Button>
              <Button variant="primary" type="submit">
                Agregar
              </Button>
              </div>
          </Form>
        </Modal.Body>
      </Modal>

      {/* Modal para editar item */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>✏ Editar Item</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleUpdateItem}>
            {currentItem && (
              <Alert variant="info" className="mb-3">
                <strong>Producto:</strong> {currentItem.product_name}
              </Alert>
            )}
            <Row>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Stock</Form.Label>
                  <Form.Control
                    type="number"
                    step="0.01"
                    min="0"
                    value={currentItem?.stock || 0}
                    onChange={(e) => setCurrentItem({...currentItem, stock: parseFloat(e.target.value)})}
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Min</Form.Label>
                  <Form.Control
                    type="number"
                    step="0.01"
                    min="0"
                    value={currentItem?.min_stock || 0}
                    onChange={(e) => setCurrentItem({...currentItem, min_stock: parseFloat(e.target.value)})}
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Max</Form.Label>
                  <Form.Control
                    type="number"
                    step="0.01"
                    min="0"
                    value={currentItem?.max_stock || 0}
                    onChange={(e) => setCurrentItem({...currentItem, max_stock: parseFloat(e.target.value)})}
                  />
                </Form.Group>
              </Col>
            </Row>
            <div className="d-flex justify-content-end gap-2">
              <Button variant="secondary" onClick={() => setShowEditModal(false)}>
                Cancelar
              </Button>
              <Button variant="primary" type="submit">
                Actualizar
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
              <Alert variant="info" className="mb-3">
                <div><strong>Producto:</strong> {currentItem.product_name}</div>
                <div><strong>Stock actual:</strong> {currentItem.stock}</div>
              </Alert>
            )}
            <Form.Group className="mb-3">
              <Form.Label>Cantidad</Form.Label>
              <div className="d-flex align-items-center gap-2">
                <Button
                  variant="danger"
                  onClick={() => setAdjustForm({...adjustForm, quantity: adjustForm.quantity - 1})}
                >
                  -
                </Button>
                <Form.Control
                  type="number"
                  step="0.01"
                  value={adjustForm.quantity}
                  onChange={(e) => setAdjustForm({...adjustForm, quantity: parseFloat(e.target.value)})}
                  className="text-center"
                />
                <Button
                  variant="success"
                  onClick={() => setAdjustForm({...adjustForm, quantity: adjustForm.quantity + 1})}
                >
                  +
                </Button>
              </div>
              <Form.Text className="text-muted">
                Nuevo stock: {currentItem ? currentItem.stock + adjustForm.quantity : 0}
              </Form.Text>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Notas</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                placeholder="Motivo del ajuste..."
                value={adjustForm.notes}
                onChange={(e) => setAdjustForm({...adjustForm, notes: e.target.value})}
              />
            </Form.Group>
            <div className="d-flex justify-content-end gap-2">
              <Button variant="secondary" onClick={() => setShowAdjustModal(false)}>
                Cancelar
              </Button>
              <Button variant="primary" type="submit">
                Ajustar
              </Button>
              </div>
          </Form>
        </Modal.Body>
      </Modal>

    </Container>
  );
};

export default InventoryPage;