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
import SalesComparisonPage from './pages/SalesComparisonPage';
import SalesHistoryPage from './pages/SalesHistoryPage';
import SellerSalesReportPage from './pages/SellerSalesReportPage';
import RouteOptimizerPage from './pages/RouteOptimizerPage';
import ProductsPage from './pages/ProductsPage';
import InventoryPage from './pages/InventoryPage';
import VisitsPage from './pages/VisitsPage';

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
                          <ProtectedRoute requiredPermission="shopkeepers.view">
                            <ShopkeepersPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/shopkeepers/:id/sales"
                        element={
                          <ProtectedRoute requiredPermission="shopkeepers.view">
                            <SalesHistoryPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/sellers/:id/sales-report"
                        element={
                          <ProtectedRoute requiredPermission="reports.view">
                            <SellerSalesReportPage />
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
                        path="/sales-comparison"
                        element={
                          <ProtectedRoute requiredPermission="reports.view">
                            <SalesComparisonPage />
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
                        path="/inventory/manage"
                        element={
                          <ProtectedRoute requiredPermission="inventory.manage">
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
                      
                      <Route
                        path="/products/manage"
                        element={
                          <ProtectedRoute requiredPermission="products.manage">
                            <ProductsPage />
                          </ProtectedRoute>
                        }
                      />

                      <Route
                        path="/visits"
                        element={
                          <ProtectedRoute requiredPermission="visits.view">
                            <VisitsPage />
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