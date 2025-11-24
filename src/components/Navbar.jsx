/**
 * Barra de navegación principal
 */
import { Navbar as BSNavbar, Nav, Container, NavDropdown } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { APP_CONFIG } from '../config';

const Navbar = () => {
  const { user, logout, hasPermission } = useAuth();
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
            {/* Dashboard: ADMIN y TENDERO (según permisos), VENDEDOR puede ver */}
            {hasPermission('dashboard.view') && (
              <Nav.Link as={Link} to="/dashboard">Dashboard</Nav.Link>
            )}
            {/* Mapa: ADMIN, TENDERO, VENDEDOR */}
            {hasPermission('map.view') && (
              <Nav.Link as={Link} to="/map">Mapa</Nav.Link>
            )}
            {/* Vendedores: Solo ADMIN y TENDERO (no VENDEDOR) */}
            {hasPermission('sellers.manage') && (
              <NavDropdown title="Vendedores" id="sellers-dropdown">
                <NavDropdown.Item as={Link} to="/sellers">
                  👥 Lista de Vendedores
                </NavDropdown.Item>
                {hasPermission('seller_incidents.view') && (
                  <NavDropdown.Item as={Link} to="/seller-incidents">
                    ⚠️ Incidencias de Visitas
                  </NavDropdown.Item>
                )}
              </NavDropdown>
            )}
            {/* Tenderos: ADMIN, TENDERO, VENDEDOR (todos pueden ver) */}
            {hasPermission('shopkeepers.view') && (
              <NavDropdown title="Tenderos" id="shopkeepers-dropdown">
                <NavDropdown.Item as={Link} to="/shopkeepers">
                  📋 Lista de Tenderos
                </NavDropdown.Item>
                {hasPermission('visits.view') && (
                  <NavDropdown.Item as={Link} to="/visits">
                    📅 Visitas
                  </NavDropdown.Item>
                )}
              </NavDropdown>
            )}
            {/* Workspace - Visible para todos los roles */}
            <Nav.Link as={Link} to="/routes">Rutas</Nav.Link>

            {/* Inventarios: ADMIN, TENDERO, VENDEDOR */}
            {hasPermission('inventory.view') && (
              <Nav.Link as={Link} to="/inventory">Inventarios</Nav.Link>
            )}
            {/* Catálogo: ADMIN, VENDEDOR */}
            {hasPermission('products.view') && (
              <Nav.Link as={Link} to="/products">Catálogo</Nav.Link>
            )}
            {/* Reportes: ADMIN, TENDERO, VENDEDOR */}
            {hasPermission('reports.view') && (
              <NavDropdown title="Reportes" id="reports-dropdown">
                <NavDropdown.Item as={Link} to="/reports">
                  📊 Reportes Generales
                </NavDropdown.Item>
                <NavDropdown.Item as={Link} to="/sales-comparison">
                  📈 Comparación de Ventas
                </NavDropdown.Item>
                <NavDropdown.Item as={Link} to="/visits-compliance">
                  ✅ Cumplimiento de Visitas
                </NavDropdown.Item>
                <NavDropdown.Item as={Link} to="/top-products">
                  🛒 Top Productos por Zona
                </NavDropdown.Item>
                <NavDropdown.Item as={Link} to="/market-opportunities">
                  🎯 Oportunidades de Mercado
                </NavDropdown.Item>
              </NavDropdown>
            )}
            {/* Usuarios: Solo ADMIN */}
            {hasPermission('users.manage') && (
              <Nav.Link as={Link} to="/users">Usuarios</Nav.Link>
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



