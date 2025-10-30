/**
 * Barra de navegación principal
 */
import { Navbar as BSNavbar, Nav, Container, NavDropdown } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAuth as useAuthHook } from '../hooks/useAuth';
import { APP_CONFIG } from '../config';

const Navbar = () => {
  const { user, logout } = useAuth();
  const { hasPermission } = useAuthHook();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <BSNavbar bg="dark" variant="dark" expand="lg">
      <Container>
       <BSNavbar.Brand as={Link} to="/dashboard">
          {APP_CONFIG.name}
        </BSNavbar.Brand>
        <BSNavbar.Toggle aria-controls="basic-navbar-nav" />
        <BSNavbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            {hasPermission('dashboard.view') && (
              <Nav.Link as={Link} to="/dashboard">Dashboard</Nav.Link>
            )}
            {hasPermission('map.view') && (
              <Nav.Link as={Link} to="/map">Mapa</Nav.Link>
            )}
            {hasPermission('sellers.manage') && (
              <Nav.Link as={Link} to="/sellers">Vendedores</Nav.Link>
            )}
            {hasPermission('shopkeepers.manage') && (
              <Nav.Link as={Link} to="/shopkeepers">Tenderos</Nav.Link>
            )}
            {hasPermission('users.manage') && (
              <Nav.Link as={Link} to="/users">Usuarios</Nav.Link>
            )}
            {hasPermission('reports.view') && (
              <Nav.Link as={Link} to="/reports">Reportes</Nav.Link>
            )}
          </Nav>
          <Nav>
            <NavDropdown title={user?.email || 'Usuario'} id="user-dropdown" align="end">
              <NavDropdown.Item disabled>
                {user?.role || 'admin'}
              </NavDropdown.Item>
              <NavDropdown.Divider />
              <NavDropdown.Item onClick={handleLogout}>
                Cerrar Sesión
              </NavDropdown.Item>
            </NavDropdown>
          </Nav>
        </BSNavbar.Collapse>
      </Container>
    </BSNavbar>
  );
};

export default Navbar;



