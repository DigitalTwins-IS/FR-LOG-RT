/**
 * Context de Autenticación
 * Maneja el estado de autenticación del usuario
 */
import { createContext, useState, useContext, useEffect } from 'react';
import { authService } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Cargar usuario desde localStorage al iniciar
  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');

    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Error parsing user data:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      const data = await authService.login(email, password);
      
      // Guardar token y usuario
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      setUser(data.user);
      setIsAuthenticated(true);
      
      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        error: error.response?.data?.detail || 'Error al iniciar sesión'
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setIsAuthenticated(false);
  };

  // Helpers de roles y permisos centralizados
  const hasRole = (allowedRoles) => {
    if (!user || !user.role) return false;
    return allowedRoles.includes(user.role);
  };

  const hasPermission = (permission) => {
    const permissions = {
      'users.manage': ['ADMIN'], // Solo ADMIN
      'dashboard.view': ['ADMIN', 'TENDERO', 'VENDEDOR'], // Todos pueden ver dashboard
      'map.view': ['ADMIN', 'TENDERO', 'VENDEDOR'], // Todos pueden ver mapa
      'sellers.manage': ['ADMIN', 'TENDERO'], // ADMIN y TENDERO gestionan vendedores
      'sellers.view': ['ADMIN', 'TENDERO'], // ADMIN y TENDERO pueden ver vendedores
      'shopkeepers.manage': ['ADMIN', 'TENDERO'], // ADMIN y TENDERO gestionan tenderos
      'shopkeepers.view': ['ADMIN', 'TENDERO', 'VENDEDOR'], // Todos pueden ver tenderos
      'routes.view': ['ADMIN', 'TENDERO', 'VENDEDOR'], // Todos pueden ver rutas
      'reports.view': ['ADMIN', 'TENDERO', 'VENDEDOR'], // Todos pueden ver reportes
      'products.manage': ['ADMIN'], // Solo ADMIN gestiona productos
      'products.view': ['ADMIN', 'VENDEDOR'], // ADMIN y VENDEDOR ven catálogo
      'inventory.manage': ['ADMIN', 'VENDEDOR'], // ADMIN y VENDEDOR gestionan inventario
      'inventory.view': ['ADMIN', 'TENDERO', 'VENDEDOR'], // Todos pueden ver inventario
      'visits.manage': ['VENDEDOR'], // HU21: Solo vendedores pueden agendar visitas
      'visits.view': ['ADMIN', 'VENDEDOR'], // Solo ADMIN y VENDEDOR pueden ver visitas (TENDERO no)
      'seller_incidents.manage': ['ADMIN', 'TENDERO'], // ADMIN y TENDERO gestionan incidencias
      'seller_incidents.view': ['ADMIN', 'TENDERO'] // ADMIN y TENDERO ven incidencias
    };

    const allowedRoles = permissions[permission] || [];
    return hasRole(allowedRoles);
  };

  const isAdmin = () => hasRole(['ADMIN']);
  const isTendero = () => hasRole(['TENDERO']);
  const isVendedor = () => hasRole(['VENDEDOR']);

  const value = {
    user,
    loading,
    isAuthenticated,
    hasRole,
    hasPermission,
    isAdmin,
    isTendero,
    isVendedor,
    login,
    logout
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;

