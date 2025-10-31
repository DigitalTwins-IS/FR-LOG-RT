import { useAuth as useAuthContext } from '../context/AuthContext';

export const useAuth = () => {
  // Wrapper para mantener compatibilidad y usar una sola fuente de verdad
  return useAuthContext();
};
