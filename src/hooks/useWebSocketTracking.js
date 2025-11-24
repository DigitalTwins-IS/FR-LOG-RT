/**
 * Hook personalizado para tracking en tiempo real con WebSocket
 * HU18: Rastreo de Pedido en Mapa
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import config from '../config';

export const useWebSocketTracking = (sellerId, shopkeeperId) => {
  const [sellerLocation, setSellerLocation] = useState(null);
  const [trackingInfo, setTrackingInfo] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const MAX_RECONNECT_ATTEMPTS = 5;

  const connect = useCallback(() => {
    if (!sellerId || !shopkeeperId) {
      console.warn('⚠️ sellerId y shopkeeperId son requeridos');
      return;
    }

    // Limpiar conexión existente
    if (wsRef.current) {
      wsRef.current.close();
    }

    // Construir URL del WebSocket (a través del API Gateway)
    const wsUrl = `${config.WS_USER_URL}/api/v1/users/tracking/ws/track/${sellerId}/${shopkeeperId}`;
    console.log('🔌 Conectando a WebSocket:', wsUrl);

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('✅ WebSocket conectado');
      setIsConnected(true);
      setError(null);
      reconnectAttemptsRef.current = 0;

      // Heartbeat para mantener conexión viva
      ws._heartbeat = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping' }));
        }
      }, 45000); // Cada 45 segundos
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('📩 Mensaje recibido:', data.type);

        if (data.type === 'location_update' && data.location) {
          setSellerLocation({
            latitude: data.location.latitude,
            longitude: data.location.longitude,
            speed: data.location.speed,
            heading: data.location.heading,
            status: data.location.status,
            battery: data.location.battery_level,
            timestamp: data.location.timestamp
          });

          if (data.tracking) {
            setTrackingInfo({
              distance: data.tracking.distance_to_shopkeeper_km,
              eta: data.tracking.estimated_arrival_minutes,
              isMoving: data.tracking.is_moving,
              lastUpdate: data.tracking.last_update
            });
          }
        } else if (data.type === 'connection_status') {
          console.log('📡', data.message);
        } else if (data.type === 'error') {
          console.error('❌ Error del servidor:', data.message);
          setError(data.message);
        }
      } catch (err) {
        console.error('❌ Error parseando mensaje:', err);
      }
    };

    ws.onerror = (event) => {
      console.error('❌ WebSocket error:', event);
      setError('Error de conexión con el servidor');
    };

    ws.onclose = (event) => {
      console.log('🔌 WebSocket cerrado:', event.code, event.reason);
      setIsConnected(false);

      // Limpiar heartbeat
      if (ws._heartbeat) {
        clearInterval(ws._heartbeat);
      }

      // Intentar reconectar con backoff exponencial
      if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
        const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
        console.log(`🔄 Reconectando en ${delay/1000}s... (intento ${reconnectAttemptsRef.current + 1}/${MAX_RECONNECT_ATTEMPTS})`);
        
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectAttemptsRef.current++;
          connect();
        }, delay);
      } else {
        console.error('❌ Máximo de intentos de reconexión alcanzado');
        setError('No se pudo conectar al servidor. Por favor, recarga la página.');
      }
    };

    wsRef.current = ws;
  }, [sellerId, shopkeeperId]);

  useEffect(() => {
    connect();

    // Cleanup al desmontar
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        if (wsRef.current._heartbeat) {
          clearInterval(wsRef.current._heartbeat);
        }
        wsRef.current.close();
      }
    };
  }, [connect]);

  return {
    sellerLocation,
    trackingInfo,
    isConnected,
    error,
    reconnect: connect
  };
};