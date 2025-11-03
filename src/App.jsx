/**
 * App Principal - Router y Layout
 */
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastContainer } from 'react-toastify';
import Navbar from './components/Navbar';
import PrivateRoute from './components/PrivateRoute';
import ProtectedRoute from './components/ProtectedRoute';
import { useAuth } from './hooks/useAuth';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import MapPage from './pages/MapPage';
import SellersPage from './pages/SellersPage';
import ShopkeepersPage from './pages/ShopkeepersPage';
import UsersPage from './pages/UsersPage';
import ReportsPage from './pages/ReportsPage';
import SalesHistoryPage from './pages/SalesHistoryPage';
import RouteOptimizerPage from './pages/RouteOptimizerPage';
import ProductsPage from './pages/ProductsPage';
import InventoryPage from './pages/InventoryPage';

// Componente para redirección por defecto basada en rol
const NavigateToDefault = () => {
  const { user } = useAuth();
  
  if (user?.role === 'ADMIN') {
    return <Navigate to="/dashboard" replace />;
  } else {
    return <Navigate to="/map" replace />;
  }
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="App">
          <Routes>
            {/* Ruta pública */}
            <Route path="/login" element={<LoginPage />} />

            {/* Rutas protegidas */}
            <Route
              path="/*"
              element={
                <PrivateRoute>
                  <>
                    <Navbar />
                    <Routes>
                      <Route path="/" element={<NavigateToDefault />} />
                      <Route 
                        path="/dashboard" 
                        element={
                          <ProtectedRoute requiredPermission="dashboard.view">
                            <DashboardPage />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/map" 
                        element={
                          <ProtectedRoute requiredPermission="map.view">
                            <MapPage />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/sellers" 
                        element={
                          <ProtectedRoute requiredPermission="sellers.manage">
                            <SellersPage />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/shopkeepers" 
                        element={
                          <ProtectedRoute requiredPermission="shopkeepers.manage">
                            <ShopkeepersPage />
                          </ProtectedRoute>
                        } 

                      />
                      <Route 
                        path="/routes" 
                        element={
                          <ProtectedRoute requiredPermission="routes.view">
                            <RouteOptimizerPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route 
                        path="/users" 
                        element={
                          <ProtectedRoute requiredPermission="users.manage">
                            <UsersPage />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/reports" 
                        element={
                          <ProtectedRoute requiredPermission="reports.view">
                            <ReportsPage />
                          </ProtectedRoute>
                        } 
                      />

                      <Route 
                        path="/inventory" 
                        element={
                          <ProtectedRoute requiredPermission="inventory.view">
                            <InventoryPage />
                          </ProtectedRoute>    
                        } 
                        />
                      <Route 
                        path="/products" 
                        element={
                          <ProtectedRoute requiredPermission="products.view">
                            <ProductsPage />
                          </ProtectedRoute>
                        } 
                        />
                      
                      <Route path="*" element={<Navigate to="/dashboard" replace />} />
                      <Route path="/route-optimizer" element={<RouteOptimizerPage />} />
                    </Routes>
                  </>
                </PrivateRoute>
              }
            />
          </Routes>

          <ToastContainer
            position="top-right"
            autoClose={3000}
            hideProgressBar={false}
            newestOnTop={false}
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
          />
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;