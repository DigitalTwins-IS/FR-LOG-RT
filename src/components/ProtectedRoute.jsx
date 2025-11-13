import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
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
    // Si no tiene permisos, redirigir al dashboard en lugar de mostrar error
    // La funcionalidad simplemente no aparece en el menú si no tiene permisos
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default ProtectedRoute;
