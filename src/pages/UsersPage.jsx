import { useState, useEffect } from 'react';
import { Container, Row, Col, Table, Button, Modal, Form, Badge, Alert, Tabs, Tab } from 'react-bootstrap';
import { authService } from '../services/api';
import { toast } from 'react-toastify';

const UsersPage = () => {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all'); // all, active, inactive
  const [filterRole, setFilterRole] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: '',
    password: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [tempPassword, setTempPassword] = useState('');
  const [useManualPassword, setUseManualPassword] = useState(true);
  const [resetPassword, setResetPassword] = useState('');
  const [resetPasswordError, setResetPasswordError] = useState('');

  useEffect(() => {
    loadData();
  }, [filterStatus, filterRole]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Cargar usuarios con filtros
      const params = {};
      if (filterStatus !== 'all') {
        params.is_active = filterStatus === 'active';
      }
      if (filterRole) {
        params.role = filterRole;
      }
      
      const [usersData, rolesData] = await Promise.all([
        authService.getUsers(params),
        authService.getRoles()
      ]);
      
      setUsers(usersData);
      setRoles(rolesData.roles);
    } catch (error) {
      toast.error('Error al cargar datos');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (user = null) => {
    if (user) {
      setCurrentUser(user);
      setFormData({
        name: user.name,
        email: user.email,
        role: user.role,
        password: ''
      });
    } else {
      setCurrentUser(null);
      setFormData({
        name: '',
        email: '',
        role: roles.length > 0 ? roles[0].value : '',
        password: ''
      });
    }
    setFormErrors({});
    setUseManualPassword(true);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setCurrentUser(null);
    setFormData({
      name: '',
      email: '',
      role: '',
      password: ''
    });
    setFormErrors({});
    setUseManualPassword(true);
  };

  const handleOpenPasswordModal = (user) => {
    setCurrentUser(user);
    setResetPassword('');
    setResetPasswordError('');
    setTempPassword('');
    setShowPasswordModal(true);
  };

  const handleClosePasswordModal = () => {
    setShowPasswordModal(false);
    setCurrentUser(null);
    setTempPassword('');
    setResetPassword('');
    setResetPasswordError('');
  };

  const validateForm = () => {
    const errors = {};
    
    if (!formData.name || formData.name.length < 3) {
      errors.name = 'El nombre debe tener al menos 3 caracteres';
    }
    
    if (formData.name && formData.name.length > 50) {
      errors.name = 'El nombre no puede tener más de 50 caracteres';
    }
    
    if (!formData.email || !/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Email inválido';
    }
    
    if (!formData.role) {
      errors.role = 'Debe seleccionar un rol';
    }
    
    // Validar contraseña manual (siempre obligatoria para crear usuario)
    if (!currentUser) {
      if (!formData.password || formData.password.length < 8) {
        errors.password = 'La contraseña debe tener al menos 8 caracteres';
      } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
        errors.password = 'La contraseña debe contener al menos una mayúscula, una minúscula y un número';
      }
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
      if (currentUser) {
        // Actualizar usuario (sin contraseña)
        const { password, ...updateData } = formData;
        await authService.updateUser(currentUser.id, updateData);
        toast.success('Usuario actualizado correctamente');
      } else {
        // Crear usuario - siempre con contraseña manual
        const userData = { 
          name: formData.name,
          email: formData.email,
          role: formData.role,
          password: formData.password
        };
        
        console.log('Enviando datos:', userData); // Debug
        const response = await authService.createUser(userData);
        toast.success('Usuario creado correctamente');
        
        // No mostrar modal de contraseña temporal (siempre es manual)
        // if (response.temporary_password) {
        //   setTempPassword(response.temporary_password);
        //   setShowPasswordModal(true);
        // }
      }
      
      handleCloseModal();
      loadData();
    } catch (error) {
      const errorMessage = error.response?.data?.detail || 'Error al guardar usuario';
      toast.error(errorMessage);
      console.error(error);
    }
  };

  const handleToggleStatus = async (user) => {
    const action = user.is_active ? 'desactivar' : 'activar';
    if (!window.confirm(`¿Está seguro de ${action} este usuario?`)) {
      return;
    }

    try {
      await authService.toggleUserStatus(user.id);
      toast.success(`Usuario ${user.is_active ? 'desactivado' : 'activado'} correctamente`);
      loadData();
    } catch (error) {
      toast.error('Error al cambiar estado del usuario');
      console.error(error);
    }
  };

  const validateResetPassword = () => {
    const errors = {};
    
    if (!resetPassword || resetPassword.length < 8) {
      errors.password = 'La contraseña debe tener al menos 8 caracteres';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(resetPassword)) {
      errors.password = 'La contraseña debe contener al menos una mayúscula, una minúscula y un número';
    }
    
    setResetPasswordError(errors.password || '');
    return Object.keys(errors).length === 0;
  };

  const handleResetPassword = async () => {
    if (!validateResetPassword()) {
      return;
    }

    try {
      // Actualizar solo la contraseña del usuario
      await authService.updateUserPassword(currentUser.id, resetPassword);
      toast.success('Contraseña actualizada exitosamente');
      handleClosePasswordModal();
      loadData();
    } catch (error) {
      const errorMessage = error.response?.data?.detail || 'Error al actualizar contraseña';
      toast.error(errorMessage);
      console.error(error);
    }
  };

  const getRoleBadge = (role) => {
    const roleConfig = {
      ADMIN: { bg: 'danger', label: 'Administrador' },
      TENDERO: { bg: 'warning', label: 'Tendero' },
      VENDEDOR: { bg: 'info', label: 'Vendedor' }
    };
    
    const config = roleConfig[role] || { bg: 'secondary', label: role };
    return <Badge bg={config.bg}>{config.label}</Badge>;
  };

  const getStatusBadge = (isActive) => {
    return (
      <Badge bg={isActive ? 'success' : 'secondary'}>
        {isActive ? 'Activo' : 'Inactivo'}
      </Badge>
    );
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
          <h2>👥 Gestión de Usuarios</h2>
          <p className="text-muted">Administrar usuarios y roles del sistema</p>
        </Col>
        <Col md={4} className="text-end">
          <Button variant="primary" onClick={() => handleOpenModal()}>
            ➕ Crear Usuario
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
              <option value="all">Todos los usuarios</option>
              <option value="active">Solo activos</option>
              <option value="inactive">Solo inactivos</option>
            </Form.Select>
          </Form.Group>
        </Col>
        <Col md={4}>
          <Form.Group>
            <Form.Label>Filtrar por Rol</Form.Label>
            <Form.Select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
            >
              <option value="">Todos los roles</option>
              {roles.map(role => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
        </Col>
        <Col md={4}>
          <Alert variant="info" className="mb-0">
            <strong>Total de usuarios:</strong> {users.length} | 
            <strong> Activos:</strong> {users.filter(u => u.is_active).length}
          </Alert>
        </Col>
      </Row>

      {/* Tabla de usuarios */}
      <Row>
        <Col>
          <Table striped bordered hover responsive>
            <thead>
              <tr>
                <th>ID</th>
                <th>Nombre</th>
                <th>Email</th>
                <th>Rol</th>
                <th>Estado</th>
                <th>Fecha Creación</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center text-muted">
                    No hay usuarios registrados
                  </td>
                </tr>
              ) : (
                users.map(user => (
                  <tr key={user.id}>
                    <td>{user.id}</td>
                    <td>{user.name}</td>
                    <td>{user.email}</td>
                    <td>{getRoleBadge(user.role)}</td>
                    <td>{getStatusBadge(user.is_active)}</td>
                    <td>
                      <small>
                        {new Date(user.created_at).toLocaleDateString('es-CO')}
                      </small>
                    </td>
                    <td>
                      <Button 
                        size="sm" 
                        variant="info" 
                        className="me-1 mb-1"
                        onClick={() => handleOpenModal(user)}
                      >
                        ✏️ Editar
                      </Button>
                      <Button 
                        size="sm" 
                        variant={user.is_active ? 'warning' : 'success'}
                        className="me-1 mb-1"
                        onClick={() => handleToggleStatus(user)}
                      >
                        {user.is_active ? '⏸️ Desactivar' : '▶️ Activar'}
                      </Button>
                      <Button 
                        size="sm" 
                        variant="secondary"
                        className="mb-1"
                        onClick={() => handleOpenPasswordModal(user)}
                      >
                        🔑 Restablecer
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </Col>
      </Row>

      {/* Modal para crear/editar usuario */}
      <Modal show={showModal} onHide={handleCloseModal} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            {currentUser ? '✏️ Editar Usuario' : '➕ Crear Usuario'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleSubmit}>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Nombre Completo *</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Nombre completo del usuario"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    isInvalid={!!formErrors.name}
                    required
                  />
                  <Form.Control.Feedback type="invalid">
                    {formErrors.name}
                  </Form.Control.Feedback>
                  <Form.Text className="text-muted">
                    Mínimo 3 caracteres, máximo 50 caracteres
                  </Form.Text>
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

            <Form.Group className="mb-3">
              <Form.Label>Rol *</Form.Label>
              <Form.Select
                value={formData.role}
                onChange={(e) => setFormData({...formData, role: e.target.value})}
                isInvalid={!!formErrors.role}
                required
              >
                <option value="">Seleccione un rol</option>
                {roles.map(role => (
                  <option key={role.value} value={role.value}>
                    {role.label} - {role.description}
                  </option>
                ))}
              </Form.Select>
              <Form.Control.Feedback type="invalid">
                {formErrors.role}
              </Form.Control.Feedback>
            </Form.Group>

            {!currentUser && (
              <Form.Group className="mb-3">
                <Form.Label>Contraseña *</Form.Label>
                <Form.Control
                  type="password"
                  placeholder="Ingrese una contraseña segura"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  isInvalid={!!formErrors.password}
                  required
                />
                <Form.Control.Feedback type="invalid">
                  {formErrors.password}
                </Form.Control.Feedback>
                <Form.Text className="text-muted">
                  Mínimo 8 caracteres, debe incluir mayúsculas, minúsculas y números
                </Form.Text>
              </Form.Group>
            )}

            <div className="d-flex justify-content-end gap-2">
              <Button variant="secondary" onClick={handleCloseModal}>
                Cancelar
              </Button>
              <Button variant="primary" type="submit">
                {currentUser ? 'Actualizar' : 'Crear'} Usuario
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>

      {/* Modal para restablecer contraseña */}
      <Modal show={showPasswordModal} onHide={handleClosePasswordModal}>
        <Modal.Header closeButton>
          <Modal.Title>🔑 Restablecer Contraseña</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div>
            <p>Ingrese una nueva contraseña para <strong>{currentUser?.name}</strong>:</p>
            <Alert variant="warning">
              Esta acción cambiará la contraseña actual del usuario.
            </Alert>
            
            <Form.Group className="mb-3">
              <Form.Label>Nueva Contraseña *</Form.Label>
              <Form.Control
                type="password"
                placeholder="Ingrese una contraseña segura"
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
                isInvalid={!!resetPasswordError}
                required
              />
              <Form.Control.Feedback type="invalid">
                {resetPasswordError}
              </Form.Control.Feedback>
              <Form.Text className="text-muted">
                Mínimo 8 caracteres, debe incluir mayúsculas, minúsculas y números
              </Form.Text>
            </Form.Group>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleClosePasswordModal}>
            Cancelar
          </Button>
          <Button variant="warning" onClick={handleResetPassword}>
            🔑 Actualizar Contraseña
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default UsersPage;
