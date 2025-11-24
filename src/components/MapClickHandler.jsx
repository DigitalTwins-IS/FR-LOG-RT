/**
 * Componente para capturar clicks en el mapa
 * HU18: Facilita selección de ubicaciones
 */
import { useMapEvents } from 'react-leaflet';

const MapClickHandler = ({ onLocationSelect }) => {
  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      console.log('📍 Click en mapa:', lat, lng);
      
      if (onLocationSelect) {
        onLocationSelect({
          latitude: lat,
          longitude: lng
        });
      }
    }
  });

  return null;
};

export default MapClickHandler;