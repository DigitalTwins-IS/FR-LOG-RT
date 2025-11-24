/**
 * Workspace Page - Optimizador de Rutas con Tracking en Tiempo Real
 * HU13: Ruta optimizada para vendedores
 * HU18: Tracking GPS en tiempo real
 * 
 * PERMISOS:
 * - ADMIN: Selector de vendedores + punto de inicio + tracking de todos
 * - VENDEDOR: Solo su ruta + punto de inicio + enviar su ubicación GPS
 * - TENDERO: Solo ver ruta de su vendedor + tracking del vendedor
 */
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Container, Row, Col, Card, Form, Button, Spinner,
  Badge, ListGroup, Alert
} from 'react-bootstrap';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { toast } from 'react-toastify';
import api, { userService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { MS_USER_URL, WS_USER_URL } from '../config';

// ============================================================================
// CONSTANTS
// ============================================================================

const API_ROUTES = {
  USERS_OPTIMIZE: `${MS_USER_URL}/routes/optimize`
};

const WS_BASE_URL = WS_USER_URL;

const ICON_COLORS = {
  START: '#22c55e',
  WAYPOINT: '#3b82f6',
  END: '#ef4444',
  SELLER_ACTIVE: '#22c55e',
  SELLER_INACTIVE: '#f59e0b'
};

const MAP_DEFAULTS = {
  CENTER: [4.6642, -74.0523],
  ZOOM: 13,
  HEIGHT: '750px'
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const createMapIcon = (color, size = 35) => L.divIcon({
  className: '',
  html: `<div style="background:${color};border-radius:50%;width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);"></div>`,
  iconSize: [size, size],
  iconAnchor: [size / 2, size / 2]
});

const createAnimatedIcon = (color, emoji) => L.divIcon({
  className: '',
  html: `
    <div style="
      background: ${color};
      border-radius: 50%;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      animation: pulse 2s infinite;
    ">
      <span style="font-size: 20px;">${emoji}</span>
    </div>
    <style>
      @keyframes pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.1); }
      }
    </style>
  `,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
  popupAnchor: [0, -20]
});

const decodePolyline = (encoded) => {
  if (!encoded) {
    console.log('⚠️ decodePolyline: Recibido string vacío o nulo');
    return [];
  }
  console.log('🔍 DEBUG DECODE: Iniciando decodificación, longitud:', encoded.length);
  const coordinates = [];
  let index = 0, lat = 0, lng = 0;

  while (index < encoded.length) {
    let shift = 0, result = 0, byte;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lat += ((result & 1) ? ~(result >> 1) : (result >> 1));

    shift = 0; result = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lng += ((result & 1) ? ~(result >> 1) : (result >> 1));

    // IMPORTANT: Leaflet expects [lat, lng], but polyline encoding gives us [lat, lng] in that order
    // However, we need to divide by 1e5 to get actual coordinates
    const decodedLat = lat / 1e5;
    const decodedLng = lng / 1e5;

    // Push in Leaflet's expected order: [latitude, longitude]
    coordinates.push([decodedLat, decodedLng]);
  }
  console.log('✅ DEBUG DECODE: Decodificados', coordinates.length, 'puntos');
  if (coordinates.length > 0) {
    console.log('   📍 Primer punto:', coordinates[0]);
    console.log('   📍 Último punto:', coordinates[coordinates.length - 1]);
  }
  return coordinates;
};

const parseSellersResponse = (data) => {
  if (Array.isArray(data)) return data;
  if (data?.sellers) return data.sellers;
  if (data?.data) return data.data;
  return [];
};

const formatCoordinate = (value) => parseFloat(value).toFixed(7);

const calculateMapCenter = (routePoints) => {
  if (!routePoints?.length) return MAP_DEFAULTS.CENTER;
  
  // Calcular el centro promedio de todos los puntos
  let sumLat = 0;
  let sumLng = 0;
  let validPoints = 0;
  
  routePoints.forEach(point => {
    const lat = parseFloat(point.latitude);
    const lng = parseFloat(point.longitude);
    if (!isNaN(lat) && !isNaN(lng)) {
      sumLat += lat;
      sumLng += lng;
      validPoints++;
    }
  });
  
  if (validPoints > 0) {
    return [sumLat / validPoints, sumLng / validPoints];
  }
  
  // Fallback al primer punto si hay problemas
  const firstPoint = routePoints[0];
  const lat = parseFloat(firstPoint.latitude);
  const lng = parseFloat(firstPoint.longitude);
  if (!isNaN(lat) && !isNaN(lng)) {
    return [lat, lng];
  }
  
  return MAP_DEFAULTS.CENTER;
};

const generateRouteLines = (routePoints) => {
  if (!routePoints || !Array.isArray(routePoints) || routePoints.length < 2) {
    return [];
  }

  // Líneas simples punto a punto
  return routePoints.slice(0, -1).map((point, index) => [
    [parseFloat(point.latitude), parseFloat(point.longitude)],
    [parseFloat(routePoints[index + 1].latitude), parseFloat(routePoints[index + 1].longitude)]
  ]);
};

const MapIcons = {
  start: createMapIcon(ICON_COLORS.START),
  waypoint: createMapIcon(ICON_COLORS.WAYPOINT),
  end: createMapIcon(ICON_COLORS.END)
};

// ============================================================================
// CUSTOM HOOKS
// ============================================================================

const useGeolocation = () => {
  const getCurrentPosition = useCallback((onSuccess, onError) => {
    if (!navigator.geolocation) {
      onError(new Error('Geolocalización no disponible'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = formatCoordinate(position.coords.latitude);
        const lon = formatCoordinate(position.coords.longitude);
        onSuccess({ latitude: lat, longitude: lon });
      },
      (error) => {
        let errorMsg = 'Error obteniendo ubicación';
        switch (error.code) {
          case error.PERMISSION_DENIED: errorMsg = 'Permiso denegado'; break;
          case error.POSITION_UNAVAILABLE: errorMsg = 'Ubicación no disponible'; break;
          case error.TIMEOUT: errorMsg = 'Tiempo agotado'; break;
        }
        onError(new Error(errorMsg));
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, []);

  return { getCurrentPosition };
};

const useSellers = () => {
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadSellers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await userService.getSellers(null, true);
      const sellersList = parseSellersResponse(data);
      setSellers(sellersList);
      if (sellersList.length === 0) toast.warning('No hay vendedores activos');
    } catch (error) {
      console.error('❌ Error cargando vendedores:', error);
      toast.error('Error cargando vendedores');
      setSellers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadSellers(); }, [loadSellers]);

  return { sellers, loading, reload: loadSellers };
};

const useRouteGeneration = () => {
  const [route, setRoute] = useState(null);
  const [loading, setLoading] = useState(false);

  const generateRoute = useCallback(async (params) => {
    setLoading(true);
    setRoute(null);

    try {
      // Usar el servicio api configurado que ya tiene interceptores y manejo de errores
      const response = await api.get(API_ROUTES.USERS_OPTIMIZE, {
        params
      });

      console.log('📦 Respuesta del backend:', response.data);
      console.log('📊 API Data en respuesta:', response.data.api_data);
      console.log('🗺️ Geometry:', response.data.api_data?.geometry?.length, 'caracteres');

      setRoute(response.data);

      const message = response.data.from_cache
        ? '🌐 Ruta optimizada (desde caché)'
        : '🌐 Ruta optimizada con OpenRouteService';
      toast.success(message);

      if (!response.data?.route_points?.length) {
        toast.warning('⚠️ No hay puntos en la ruta');
      }

      return response.data;
    } catch (error) {
      console.error('❌ Error generando ruta:', error);
      // El interceptor de api.js ya muestra errores de red genéricos
      // Solo mostrar errores específicos del backend que no sean de red
      if (error.response?.data?.detail) {
        const errorMessage = error.response.data.detail;
        // Solo mostrar si no es un error de red (el interceptor ya lo maneja)
        if (error.response.status !== 502 && error.response.status !== 504 && error.response.status !== 0) {
          toast.error(errorMessage);
        }
      } else if (error.response) {
        // Error HTTP con respuesta pero sin detail
        const status = error.response.status;
        if (status === 404) {
          toast.error('No se encontraron datos para generar la ruta');
        } else if (status === 403) {
          toast.error('No tienes permisos para generar esta ruta');
        } else if (status >= 500) {
          // Errores del servidor ya son manejados por el interceptor
          console.error('Error del servidor:', status);
        }
      }
      // Si no hay response, es un error de red que ya fue manejado por el interceptor
      setRoute(null);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  return { route, loading, generateRoute, clearRoute: () => setRoute(null) };
};

const useSellerTracking = (sellerId) => {
  const [location, setLocation] = useState(null);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef(null);

  useEffect(() => {
    // Convertir sellerId a número si es string
    const sellerIdNum = typeof sellerId === 'string' ? parseInt(sellerId, 10) : sellerId;
    
    if (!sellerIdNum || isNaN(sellerIdNum)) {
      console.log(`⚠️ useSellerTracking: sellerId inválido: ${sellerId}`);
      setLocation(null);
      setConnected(false);
      return;
    }
    
    console.log(`🔄 useSellerTracking iniciando para vendedor ${sellerIdNum}`);

    // PASO 1: Obtener última ubicación conocida vía REST API
    const fetchLastLocation = async () => {
      try {
        console.log(`🔍 Buscando última ubicación para vendedor ${sellerIdNum} en: ${MS_USER_URL}/tracking/location/${sellerIdNum}`);
        const response = await api.get(`${MS_USER_URL}/tracking/location/${sellerIdNum}`);
        console.log(`✅ Respuesta del endpoint:`, response.data);
        if (response.data && response.data.latitude && response.data.longitude) {
          console.log(`📍 Última ubicación conocida obtenida para vendedor ${sellerIdNum}:`, {
            lat: response.data.latitude,
            lng: response.data.longitude,
            timestamp: response.data.timestamp
          });
          setLocation(response.data);
        } else {
          console.log(`⚠️ Respuesta sin coordenadas válidas:`, response.data);
        }
      } catch (error) {
        // Si no hay ubicación (404), no es error crítico - el WebSocket la traerá cuando esté disponible
        if (error.response?.status === 404) {
          console.log(`ℹ️ No hay última ubicación conocida para vendedor ${sellerIdNum} (404)`);
        } else {
          console.error(`❌ Error obteniendo última ubicación para vendedor ${sellerIdNum}:`, error.response?.data || error.message);
        }
      }
    };

    fetchLastLocation();

    // PASO 2: Conectar WebSocket para actualizaciones en tiempo real
    const wsUrl = `${WS_BASE_URL}/tracking/ws/watch/${sellerIdNum}`;
    console.log(`🔌 Conectando WebSocket a: ${wsUrl}`);
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log(`✅ Tracking WebSocket conectado: vendedor ${sellerIdNum}`);
      setConnected(true);
      // El servidor enviará automáticamente la ubicación actual si existe
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log(`📩 Mensaje WebSocket recibido para vendedor ${sellerIdNum}:`, message.type, message);
        
        if (message.type === 'location_update' && message.data) {
          console.log(`🔄 Actualización de ubicación recibida para vendedor ${sellerIdNum}:`, {
            lat: message.data.latitude,
            lng: message.data.longitude,
            speed: message.data.speed,
            timestamp: message.data.timestamp,
            seller_name: message.data.seller_name
          });
          setLocation(message.data);
        } else if (message.type === 'connected') {
          console.log(`✅ WebSocket conectado correctamente para vendedor ${sellerIdNum}`);
          // El servidor debería enviar la ubicación actual si existe
          // Si no se recibe location_update, significa que no hay ubicación guardada
        } else {
          console.log(`ℹ️ Mensaje WebSocket de tipo: ${message.type}`, message);
        }
      } catch (err) {
        console.error('❌ Error parseando mensaje WebSocket:', err, event.data);
      }
    };

    ws.onerror = (error) => {
      console.error(`❌ Error en WebSocket de tracking para vendedor ${sellerIdNum}:`, error);
      setConnected(false);
    };

    ws.onclose = (event) => {
      console.log(`🔌 WebSocket cerrado: vendedor ${sellerIdNum}`, event.code, event.reason);
      setConnected(false);
    };

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [sellerId]);

  return { location, connected };
};

// ============================================================================
// COMPONENTS
// ============================================================================

const SellerSelector = ({ sellers, loading, value, onChange }) => (
  <Card className="mb-3">
    <Card.Header className="d-flex justify-content-between align-items-center">
      <strong>👤 Seleccionar Vendedor</strong>
      {loading && <Spinner animation="border" size="sm" />}
    </Card.Header>
    <Card.Body>
      <Form.Select value={value} onChange={(e) => onChange(e.target.value)} disabled={loading}>
        <option value="">{loading ? 'Cargando...' : 'Seleccionar vendedor...'}</option>
        {sellers.map(seller => (
          <option key={seller.id} value={seller.id}>
            {seller.name} {seller.zone_name ? `- ${seller.zone_name}` : ''}
          </option>
        ))}
      </Form.Select>
    </Card.Body>
  </Card>
);

const StartLocationConfig = ({ location, onChange, onGetCurrentLocation }) => (
  <Card className="mb-3">
    <Card.Header><strong>📍 Punto de Inicio (Opcional)</strong></Card.Header>
    <Card.Body>
      <Form.Group className="mb-2">
        <Form.Label>Latitud</Form.Label>
        <Form.Control type="number" step="0.000001" placeholder="4.6642" value={location.latitude}
          onChange={(e) => onChange({ ...location, latitude: e.target.value })} size="sm" />
      </Form.Group>
      <Form.Group className="mb-3">
        <Form.Label>Longitud</Form.Label>
        <Form.Control type="number" step="0.000001" placeholder="-74.0523" value={location.longitude}
          onChange={(e) => onChange({ ...location, longitude: e.target.value })} size="sm" />
      </Form.Group>
      <Button variant="outline-primary" size="sm" className="w-100" onClick={onGetCurrentLocation}>
        📍 Usar mi ubicación actual
      </Button>
    </Card.Body>
  </Card>
);

const LocationSender = ({ sellerId }) => {
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState('Desconectado');
  const wsRef = useRef(null);
  const watchIdRef = useRef(null);

  const startSending = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocalización no disponible');
      return;
    }

    setSending(true);
    setStatus('Conectando...');

    const ws = new WebSocket(`${WS_BASE_URL}/tracking/ws/send/${sellerId}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus('✅ Enviando ubicación');
      toast.success('Compartiendo ubicación en tiempo real');

      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          const data = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            speed: position.coords.speed ? position.coords.speed * 3.6 : 0,
            battery: 100
          };

          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(data));
          }
        },
        (error) => {
          console.error('Error GPS:', error);
          setStatus('❌ Error GPS');
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
      );
    };

    ws.onerror = (error) => {
      console.error('❌ Error en WebSocket de envío:', error);
      setStatus('❌ Error');
      toast.error('Error al conectar para compartir ubicación');
    };

    ws.onclose = (event) => {
      console.log('🔌 WebSocket de envío cerrado', event.code, event.reason);
      setStatus('Desconectado');
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  };

  const stopSending = () => {
    if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
    if (wsRef.current) wsRef.current.close();
    setSending(false);
    setStatus('Detenido');
    toast.info('Dejaste de compartir ubicación');
  };

  return (
    <Card className="mb-3">
      <Card.Header><strong>📡 Compartir Mi Ubicación</strong></Card.Header>
      <Card.Body>
        <p className="text-muted small">
          {sending ? 'Tus clientes pueden ver tu ubicación en tiempo real' : 'Inicia para compartir tu ubicación GPS'}
        </p>
        <Badge bg={sending ? 'success' : 'secondary'} className="mb-3">{status}</Badge>
        <div>
          {!sending ? (
            <Button variant="primary" className="w-100" onClick={startSending}>
              📍 Iniciar Compartir Ubicación
            </Button>
          ) : (
            <Button variant="danger" className="w-100" onClick={stopSending}>
              ⏹️ Detener
            </Button>
          )}
        </div>
      </Card.Body>
    </Card>
  );
};

const RouteOptions = ({ onGenerate, loading, disabled }) => (
  <Card className="mb-3">
    <Card.Header><strong>⚙️ Generar Ruta</strong></Card.Header>
    <Card.Body>
      <Button variant="primary" className="w-100" onClick={onGenerate} disabled={loading || disabled}>
        {loading ? <><Spinner animation="border" size="sm" className="me-2" />Calculando...</> : '🗺️ Generar Ruta Optimizada'}
      </Button>
    </Card.Body>
  </Card>
);

const RouteStatistics = ({ route }) => {
  if (!route?.statistics) return null;
  const estimatedMinutes = route.statistics.estimated_total_time_hours
    ? (route.statistics.estimated_total_time_hours * 60).toFixed(0) : '0';

  return (
    <Card className="mb-3">
      <Card.Header><strong>📊 Estadísticas</strong></Card.Header>
      <Card.Body>
        <div className="mb-2"><strong>Vendedor:</strong> {route.seller_name || 'N/A'}</div>
        <div className="mb-2"><strong>Paradas:</strong> {route.statistics.total_shopkeepers || 0}</div>
        <div className="mb-2"><strong>Distancia:</strong> {route.statistics.total_distance_km || 0} km</div>
        <div className="mb-2"><strong>Tiempo:</strong> {estimatedMinutes} min</div>
        <Badge bg="success">🌐 OpenRouteService</Badge>
        {route.from_cache && <Badge bg="secondary" className="ms-2">📦 Caché</Badge>}
      </Card.Body>
    </Card>
  );
};

const StopListItem = ({ stop, index, isFirst, isLast }) => (
  <ListGroup.Item className="px-2 py-2">
    <div className="d-flex align-items-start">
      <Badge bg={isFirst ? 'success' : isLast ? 'danger' : 'primary'} className="me-2 mt-1" style={{ minWidth: '30px' }}>
        {stop.order || index + 1}
      </Badge>
      <div className="flex-grow-1">
        <strong>{stop.shopkeeper_name || 'Sin nombre'}</strong>
        {stop.business_name && <small className="text-primary d-block">{stop.business_name}</small>}
        <small className="text-muted d-block">📍 {stop.address || 'Sin dirección'}</small>
        {stop.distance_from_previous_km > 0 && (
          <small className="text-info d-block mt-1">
            ➡️ +{stop.distance_from_previous_km} km | 📏 Total: {stop.cumulative_distance_km} km
          </small>
        )}
      </div>
    </div>
  </ListGroup.Item>
);

const StopsList = ({ routePoints }) => {
  if (!routePoints?.length) return null;
  return (
    <Card>
      <Card.Header><strong>📋 Orden de Visitas ({routePoints.length})</strong></Card.Header>
      <Card.Body style={{ maxHeight: '450px', overflowY: 'auto' }}>
        <ListGroup variant="flush">
          {routePoints.map((stop, index) => (
            <StopListItem key={stop.shopkeeper_id || index} stop={stop} index={index}
              isFirst={index === 0} isLast={index === routePoints.length - 1} />
          ))}
        </ListGroup>
      </Card.Body>
    </Card>
  );
};

const RouteMarker = ({ stop, index, isFirst, isLast, hasStartLocation }) => {
  // REGLA CRÍTICA: Si hay punto de inicio, la primera parada (index 0) SIEMPRE es AZUL
  // Si NO hay punto de inicio, la primera parada es VERDE
  
  let icon;
  let badgeColor;
  
  // Verificar explícitamente si hay punto de inicio (forzar boolean)
  const hasStart = Boolean(hasStartLocation);
  
  console.log(`🎯 RouteMarker [${index}]:`, {
    hasStartLocation,
    hasStart,
    isFirst,
    isLast,
    willUseBlue: hasStart && index === 0
  });
  
  // DECISIÓN: Primero verificar si hay inicio Y es la primera parada
  if (hasStart && index === 0) {
    // FORZAR AZUL para primera parada cuando hay inicio
    icon = MapIcons.waypoint; // Azul #3b82f6
    badgeColor = 'info'; // Azul
    console.log(`✅ FORZADO AZUL - Parada ${index} (hay inicio)`);
  } else if (isLast) {
    // Última parada: ROJO (sin importar si hay inicio)
    icon = MapIcons.end; // Rojo #ef4444
    badgeColor = 'danger';
    console.log(`🔴 Parada ${index}: ROJO (última)`);
  } else if (!hasStart && isFirst) {
    // Primera parada SIN inicio: VERDE
    icon = MapIcons.start; // Verde #22c55e
    badgeColor = 'success';
    console.log(`🟢 Parada ${index}: VERDE (primera, sin inicio)`);
  } else {
    // Paradas intermedias o cualquier otra: AZUL
    icon = MapIcons.waypoint; // Azul #3b82f6
    badgeColor = 'primary';
    console.log(`🔵 Parada ${index}: AZUL (intermedia o default)`);
  }
  
  const lat = parseFloat(stop.latitude), lng = parseFloat(stop.longitude);

  console.log(`🎯 RouteMarker ${index}:`, {
    stop,
    lat,
    lng,
    isValid: !isNaN(lat) && !isNaN(lng),
    hasStartLocation,
    isFirst,
    isLast,
    iconType: hasStartLocation && index === 0 ? 'first-blue' : isFirst ? 'first-green' : isLast ? 'last' : 'waypoint',
    finalIcon: icon === MapIcons.start ? 'start-green' : icon === MapIcons.waypoint ? 'waypoint-blue' : 'end-red'
  });

  if (isNaN(lat) || isNaN(lng)) {
    console.warn(`⚠️ RouteMarker ${index}: Invalid coordinates`, stop);
    return null;
  }

  return (
    <Marker position={[lat, lng]} icon={icon}>
      <Popup maxWidth={250}>
        <div style={{ minWidth: '200px' }}>
          <h6 className="mb-1">
            <Badge bg={badgeColor}>#{stop.order || index + 1}</Badge>{' '}
            {stop.shopkeeper_name}
          </h6>
          {stop.business_name && <p className="mb-1"><strong>{stop.business_name}</strong></p>}
          <p className="mb-1"><small>📍 {stop.address || 'Sin dirección'}</small></p>
          {stop.distance_from_previous_km > 0 && (
            <><hr style={{ margin: '8px 0' }} /><small>
              <strong>Desde anterior:</strong> {stop.distance_from_previous_km} km<br />
              <strong>Total:</strong> {stop.cumulative_distance_km} km
            </small></>
          )}
        </div>
      </Popup>
    </Marker>
  );
};

const SellerTrackingMarker = ({ sellerId }) => {
  const { location, connected } = useSellerTracking(sellerId);

  console.log(`🎯 SellerTrackingMarker para vendedor ${sellerId}:`, {
    hasLocation: !!location,
    location,
    connected,
    hasValidCoords: !!(location?.latitude && location?.longitude)
  });

  // Mostrar marcador solo si hay ubicación válida
  if (!location?.latitude || !location?.longitude) {
    // No mostrar nada si no hay ubicación - el vendedor debe compartir su ubicación primero
    return null;
  }

  const emoji = location.speed > 10 ? '🚚' : location.speed > 0 ? '🚶' : '🛑';
  // Si está conectado: verde animado, si no: naranja (última ubicación conocida)
  const color = connected ? ICON_COLORS.SELLER_ACTIVE : ICON_COLORS.SELLER_INACTIVE;
  const icon = createAnimatedIcon(color, emoji);

  const lat = parseFloat(location.latitude);
  const lng = parseFloat(location.longitude);
  if (isNaN(lat) || isNaN(lng)) return null;

  // Calcular tiempo desde última actualización
  const lastUpdate = location.timestamp ? new Date(location.timestamp) : null;
  const timeAgo = lastUpdate 
    ? Math.floor((Date.now() - lastUpdate.getTime()) / 1000 / 60) 
    : null;

  return (
    <Marker position={[lat, lng]} icon={icon}>
      <Popup>
        <div>
          <h6><Badge bg="success">🚚 {location.seller_name || 'Vendedor'}</Badge></h6>
          <div>⚡ Velocidad: {location.speed?.toFixed(1) || 0} km/h</div>
          <div>🔋 Batería: {location.battery || '?'}%</div>
          {timeAgo !== null && (
            <div><small>🕐 Última actualización: {timeAgo === 0 ? 'Ahora' : `Hace ${timeAgo} min`}</small></div>
          )}
          <div className="mt-2">
            <Badge bg={connected ? 'success' : 'warning'}>
              {connected ? '🟢 En línea (tiempo real)' : '🟠 Última ubicación conocida'}
            </Badge>
          </div>
        </div>
      </Popup>
    </Marker>
  );
};

const RecenterMap = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => { map.setView(center, zoom); }, [center, zoom, map]);
  return null;
};

const RouteMap = ({ routePoints, startLocation, apiData, sellerId, showTracking }) => {
  // DEBUG: Ver qué datos llegan
  const hasStart = !!(startLocation?.latitude && startLocation?.longitude);
  console.log('🔍 RouteMap recibió:', {
    hasRoutePoints: !!routePoints,
    routePointsCount: routePoints?.length,
    hasApiData: !!apiData,
    apiDataKeys: apiData ? Object.keys(apiData) : [],
    hasGeometry: !!apiData?.geometry,
    geometryLength: apiData?.geometry?.length,
    geometrySample: apiData?.geometry?.substring(0, 50),
    hasStartLocation: hasStart,
    startLocation: startLocation,
    sellerId: sellerId,
    sellerIdType: typeof sellerId,
    showTracking: showTracking,
    willShowTracking: showTracking && sellerId,
    willRenderTrackingMarker: showTracking && sellerId && !!(sellerId > 0)
  });

  const center = useMemo(() => {
    // Calcular el centro considerando tanto el punto de inicio como los puntos de la ruta
    const allPoints = [];
    
    // Agregar punto de inicio si existe
    if (startLocation?.latitude && startLocation?.longitude) {
      const lat = parseFloat(startLocation.latitude);
      const lng = parseFloat(startLocation.longitude);
      if (!isNaN(lat) && !isNaN(lng)) {
        allPoints.push({ latitude: lat, longitude: lng });
      }
    }
    
    // Agregar puntos de la ruta
    if (routePoints && routePoints.length > 0) {
      routePoints.forEach(point => {
        const lat = parseFloat(point.latitude);
        const lng = parseFloat(point.longitude);
        if (!isNaN(lat) && !isNaN(lng)) {
          allPoints.push({ latitude: lat, longitude: lng });
        }
      });
    }
    
    // Calcular centro promedio de todos los puntos
    if (allPoints.length > 0) {
      return calculateMapCenter(allPoints);
    }
    
    // Por defecto, usar el centro de Bogotá
    return MAP_DEFAULTS.CENTER;
  }, [routePoints, startLocation]);

  const lines = useMemo(() => {
    const geometry = apiData?.geometry;
    console.log('🔍 LINES MEMO: apiData=', apiData);
    console.log('🔍 LINES MEMO: geometry length=', geometry?.length);
    console.log('🔍 LINES MEMO: startLocation=', startLocation);

    // Primero intentar usar la geometry de la API si está disponible
    if (geometry && geometry.length > 0) {
      try {
        const decoded = decodePolyline(geometry);
        console.log('✅ Decoded geometry:', {
          totalPoints: decoded.length,
          firstPoint: decoded[0],
          lastPoint: decoded[decoded.length - 1],
          sample: decoded.slice(0, 3)
        });

        if (decoded.length > 0) {
          console.log('✅ Using OpenRouteService geometry:', decoded.length, 'points');
          // La geometry de la API ya incluye el punto de inicio si se proporcionó
          return [decoded];
        }
      } catch (error) {
        console.error('❌ Error decoding geometry:', error);
      }
    }
    
    // Si no hay geometry de la API, generar líneas simples entre los puntos
    // Incluir el punto de inicio si está disponible
    if (routePoints && routePoints.length >= 2) {
      console.log('⚠️ No valid geometry found. Using simple point-to-point lines.');
      let pointsToConnect = [...routePoints];
      
      // Si hay punto de inicio, agregarlo al inicio de la lista para conectar desde ahí
      if (startLocation?.latitude && startLocation?.longitude) {
        const startLat = parseFloat(startLocation.latitude);
        const startLng = parseFloat(startLocation.longitude);
        if (!isNaN(startLat) && !isNaN(startLng)) {
          // Crear un punto de inicio virtual para conectar
          const startPoint = {
            latitude: startLat,
            longitude: startLng,
            shopkeeper_name: 'Punto de Inicio'
          };
          pointsToConnect = [startPoint, ...routePoints];
          console.log('📍 Including start location in route lines');
        }
      }
      
      const simpleLines = generateRouteLines(pointsToConnect);
      if (simpleLines.length > 0) {
        return simpleLines;
      }
    }
    
    console.log('⚠️ No valid geometry or route points found. No route lines will be displayed.');
    return [];
  }, [apiData, routePoints, startLocation]);

  return (
    <Card>
      <Card.Header className="d-flex justify-content-between align-items-center">
        <strong>🗺️ Visualización de Ruta</strong>
        {routePoints?.length > 0 && <Badge bg="info">{routePoints.length} paradas</Badge>}
      </Card.Header>
      <Card.Body className="p-0">
        <MapContainer center={center} zoom={MAP_DEFAULTS.ZOOM} style={{ height: MAP_DEFAULTS.HEIGHT, width: '100%' }} scrollWheelZoom={true}>
          <RecenterMap center={center} zoom={MAP_DEFAULTS.ZOOM} />
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' />

          {/* Punto de inicio - SIEMPRE VERDE cuando existe */}
          {startLocation?.latitude && startLocation?.longitude && (
            <Marker 
              key="start-location-marker"
              position={[parseFloat(startLocation.latitude), parseFloat(startLocation.longitude)]} 
              icon={MapIcons.start}
            >
              <Popup>
                <div>
                  <h6><Badge bg="success">🏁 Punto de Inicio</Badge></h6>
                  <small>📍 {startLocation.latitude}, {startLocation.longitude}</small>
                </div>
              </Popup>
            </Marker>
          )}

          {/* Tracking en tiempo real */}
          {showTracking && sellerId && (
            (() => {
              console.log(`🎯 RouteMap: Intentando renderizar SellerTrackingMarker`, {
                showTracking,
                sellerId,
                sellerIdType: typeof sellerId,
                sellerIdValue: sellerId
              });
              return <SellerTrackingMarker sellerId={sellerId} />;
            })()
          )}

          {/* Marcadores de ruta */}
          {routePoints?.map((stop, index) => {
            // Verificar explícitamente si hay punto de inicio
            const hasStart = Boolean(
              startLocation && 
              startLocation.latitude && 
              startLocation.longitude &&
              !isNaN(parseFloat(startLocation.latitude)) &&
              !isNaN(parseFloat(startLocation.longitude))
            );
            
            console.log(`📍 Renderizando parada ${index}:`, {
              hasStartLocation: hasStart,
              startLocationExists: !!startLocation,
              startLocation,
              willBeBlue: hasStart && index === 0,
              stopName: stop.shopkeeper_name
            });
            
            return (
              <RouteMarker 
                key={`route-stop-${stop.shopkeeper_id || index}`} 
                stop={stop} 
                index={index}
                isFirst={index === 0} 
                isLast={index === routePoints.length - 1}
                hasStartLocation={hasStart} 
              />
            );
          })}

          {/* Líneas de ruta */}
          {lines.map((line, index) => {
            console.log(`🎨 Renderizando línea ${index}:`, line.length, 'puntos');
            return (
              <Polyline key={index} positions={line} pathOptions={{ color: '#3b82f6', weight: 4, opacity: 0.8 }} />
            );
          })}
        </MapContainer>
      </Card.Body>
    </Card>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const WorkspacePage = () => {
  const { user: currentUser, loading: userLoading } = useAuth();
  const { sellers, loading: sellersLoading } = useSellers();
  const { route, loading: routeLoading, generateRoute, clearRoute } = useRouteGeneration();
  const { getCurrentPosition } = useGeolocation();

  const [selectedSeller, setSelectedSeller] = useState('');
  const [startLocation, setStartLocation] = useState({ latitude: '', longitude: '' });

  const userRole = currentUser?.role;
  const isAdmin = userRole === 'ADMIN';
  const isVendedor = userRole === 'VENDEDOR';
  const isTendero = userRole === 'TENDERO';

  const canSelectSeller = isAdmin;
  const canSetStartLocation = isAdmin || isVendedor;
  const canSendLocation = isVendedor;
  const showTracking = true; // Siempre mostrar tracking si hay sellerId

  // Obtener seller_id para tracking
  // Prioridad: seller_id de la ruta generada > vendedor seleccionado > seller_id del usuario
  const trackingSellerId = route?.seller_id  // Si hay ruta generada, usar su seller_id
    || (isAdmin ? selectedSeller : null)  // Admin: usar vendedor seleccionado
    || currentUser?.seller_id;  // Vendedor: usar su propio seller_id
  
  console.log('🔍 Tracking Seller ID calculado:', {
    routeSellerId: route?.seller_id,
    selectedSeller,
    currentUserSellerId: currentUser?.seller_id,
    finalTrackingSellerId: trackingSellerId,
    userRole: userRole,
    willShowTracking: showTracking && trackingSellerId
  });

  const handleSellerChange = useCallback((sellerId) => {
    setSelectedSeller(sellerId);
    clearRoute();
  }, [clearRoute]);

  const handleGetCurrentLocation = useCallback(() => {
    if (!canSetStartLocation) {
      toast.error('No tienes permisos para establecer punto de inicio');
      return;
    }

    toast.info('📍 Obteniendo ubicación...');
    getCurrentPosition(
      (location) => {
        setStartLocation(location);
        toast.success('✅ Ubicación obtenida');
      },
      (error) => toast.error(error.message)
    );
  }, [getCurrentPosition, canSetStartLocation]);

  const handleGenerateRoute = useCallback(async () => {
    const params = { use_api: true };

    if (isAdmin) {
      if (!selectedSeller) {
        toast.error('Selecciona un vendedor');
        return;
      }
      params.seller_id = selectedSeller;
    }

    if (canSetStartLocation && startLocation.latitude && startLocation.longitude) {
      params.start_latitude = parseFloat(startLocation.latitude);
      params.start_longitude = parseFloat(startLocation.longitude);
    }

    await generateRoute(params);
  }, [isAdmin, selectedSeller, canSetStartLocation, startLocation, generateRoute]);

  if (userLoading) {
    return (
      <Container className="mt-5 text-center">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3">Cargando...</p>
      </Container>
    );
  }

  return (
    <Container fluid className="mt-3">
      <Row className="mb-3">
        <Col>
          <Card>
            <Card.Body>
              <h4 className="mb-0">🗺️ Optimizador de Rutas</h4>
              <p className="text-muted mb-0">
                {isAdmin && 'Genera rutas optimizadas para cualquier vendedor'}
                {isVendedor && 'Genera tu ruta optimizada y comparte tu ubicación'}
                {isTendero && 'Visualiza la ruta y ubicación de tu vendedor'}
              </p>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row>
        <Col lg={4} className="mb-3">
          {canSelectSeller && (
            <SellerSelector 
              sellers={sellers} 
              loading={sellersLoading} 
              value={selectedSeller} 
              onChange={handleSellerChange}
            />
          )}

          {canSetStartLocation && (
            <StartLocationConfig location={startLocation} onChange={setStartLocation} onGetCurrentLocation={handleGetCurrentLocation} />
          )}

          {canSendLocation && currentUser?.seller_id && (
            <LocationSender sellerId={currentUser.seller_id} />
          )}

          <RouteOptions onGenerate={handleGenerateRoute} loading={routeLoading} disabled={isAdmin && !selectedSeller} />

          <RouteStatistics route={route} />
          <StopsList routePoints={route?.route_points} />
        </Col>

        <Col lg={8}>
          {console.log('🔍 Renderizando RouteMap con:', {
            trackingSellerId,
            trackingSellerIdType: typeof trackingSellerId,
            showTracking,
            hasRoute: !!route
          })}
          <RouteMap
            routePoints={route?.route_points}
            startLocation={canSetStartLocation ? startLocation : null}
            apiData={route?.api_data}
            sellerId={trackingSellerId ? String(trackingSellerId) : null}
            showTracking={showTracking}
          />
        </Col>
      </Row>
    </Container>
  );
};

export default WorkspacePage;
