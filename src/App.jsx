/**
 * App Principal - Router y Layout (versión unificada)
 */
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastContainer } from 'react-toastify';
import Navbar from './components/Navbar';
import PrivateRoute from './components/PrivateRoute';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import MapPage from './pages/MapPage';
import SellersPage from './pages/SellersPage';
import ShopkeepersPage from './pages/ShopkeepersPage';
import InventoryPage from './pages/InventoryPage';
import ReportsPage from './pages/ReportsPage';
import ProductsPage from './pages/ProductsPage';

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
                      <Route path="/" element={<Navigate to="/dashboard" replace />} />
                      <Route path="/dashboard" element={<DashboardPage />} />
                      <Route path="/map" element={<MapPage />} />
                      <Route path="/sellers" element={<SellersPage />} />
                      <Route path="/shopkeepers" element={<ShopkeepersPage />} />
                      <Route path="/inventory" element={<InventoryPage />} />
                      <Route path="/products" element={<ProductsPage />} />
                      <Route path="/reports" element={<ReportsPage />} />
                      <Route path="*" element={<Navigate to="/dashboard" replace />} />
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
