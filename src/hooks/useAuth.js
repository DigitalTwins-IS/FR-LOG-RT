import { useState, useEffect } from 'react';

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = () => {
      try {
        const userData = localStorage.getItem('user');
        if (userData) {
          setUser(JSON.parse(userData));
        }
      } catch (error) {
        console.error('Error loading user data:', error);
        localStorage.removeItem('user');
        localStorage.removeItem('token');
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  const hasRole = (allowedRoles) => {
    if (!user || !user.role) return false;
    return allowedRoles.includes(user.role);
  };

  const hasPermission = (permission) => {
    const permissions = {
      'users.manage': ['ADMIN'],
      'dashboard.view': ['ADMIN', 'TENDERO'],
      'map.view': ['ADMIN', 'TENDERO', 'VENDEDOR'],
      'sellers.manage': ['ADMIN', 'TENDERO'], // VENDEDOR no gestiona vendedores
      'shopkeepers.manage': ['ADMIN', 'TENDERO'], // VENDEDOR no gestiona tenderos
      'reports.view': ['ADMIN', 'TENDERO', 'VENDEDOR']
    };

    const allowedRoles = permissions[permission] || [];
    return hasRole(allowedRoles);
  };

  const isAdmin = () => hasRole(['ADMIN']);
  const isTendero = () => hasRole(['TENDERO']);
  const isVendedor = () => hasRole(['VENDEDOR']);

  return {
    user,
    loading,
    hasRole,
    hasPermission,
    isAdmin,
    isTendero,
    isVendedor
  };
};
