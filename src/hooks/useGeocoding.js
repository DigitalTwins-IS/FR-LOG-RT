/**
 * Hook para servicios de geocodificación
 * HU18: Integración con Nominatim
 */
import { useState } from 'react';
import api from '../services/api';
import { toast } from 'react-toastify';

export const useGeocoding = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Convertir dirección en coordenadas
   */
  const geocode = async (address, city = 'Bogotá') => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.get('/users/geocoding/geocode/simple', {
        params: { address, city }
      });

      console.log('✅ Geocoding exitoso:', response.data);
      return {
        latitude: response.data.coordinates.latitude,
        longitude: response.data.coordinates.longitude,
        fullAddress: response.data.full_address,
        confidence: response.data.confidence,
        fromCache: response.data.from_cache
      };
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Error al geocodificar dirección';
      setError(errorMsg);
      toast.error(errorMsg);
      return null;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Convertir coordenadas en dirección
   */
  const reverseGeocode = async (latitude, longitude) => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.get('/users/geocoding/reverse-geocode', {
        params: { latitude, longitude }
      });

      console.log('✅ Reverse geocoding exitoso:', response.data);
      return {
        address: response.data.address,
        street: response.data.street,
        neighbourhood: response.data.neighbourhood,
        city: response.data.city
      };
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Error al obtener dirección';
      setError(errorMsg);
      toast.error(errorMsg);
      return null;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Buscar lugares
   */
  const searchPlace = async (query, city = 'Bogotá') => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.get('/users/geocoding/search-place', {
        params: { query, city, limit: 5 }
      });

      console.log('✅ Búsqueda de lugar exitosa:', response.data);
      return response.data.places;
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Error al buscar lugar';
      setError(errorMsg);
      toast.error(errorMsg);
      return [];
    } finally {
      setLoading(false);
    }
  };

  return {
    geocode,
    reverseGeocode,
    searchPlace,
    loading,
    error
  };
};