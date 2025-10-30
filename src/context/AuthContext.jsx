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
      'users.manage': ['ADMIN'],
      'dashboard.view': ['ADMIN', 'TENDERO'],
      'map.view': ['ADMIN', 'TENDERO', 'VENDEDOR'],
      'sellers.manage': ['ADMIN', 'TENDERO'],
      'shopkeepers.manage': ['ADMIN', 'TENDERO'],
      'reports.view': ['ADMIN', 'TENDERO', 'VENDEDOR']
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

