import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Container, Alert, Spinner } from 'react-bootstrap';

const ProtectedRoute = ({ children, requiredPermission, fallbackPath = '/login' }) => {
  const { user, loading, hasPermission } = useAuth();

  if (loading) {
    return (
      <Container className="mt-4">
        <div className="text-center">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Cargando...</span>
          </Spinner>
        </div>
      </Container>
    );
  }

  if (!user) {
    return <Navigate to={fallbackPath} replace />;
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return (
      <Container className="mt-4">
        <Alert variant="danger">
          <Alert.Heading>Acceso Denegado</Alert.Heading>
          <p>No tienes permisos para acceder a esta sección.</p>
          <p>Contacta al administrador si crees que esto es un error.</p>
        </Alert>
      </Container>
    );
  }

  return children;
};

export default ProtectedRoute;
