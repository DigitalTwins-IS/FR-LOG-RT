/**
 * RouteOptimizerPage - Optimizador de Rutas (Versión 2.0 con APIs)
 * 
 * Cambios:
 * - Integración con OpenRouteService
 * - Muestra si viene de caché
 * - Indica algoritmo usado
 * - Permite forzar recálculo
 * - Soporte para tenderos
 */
import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// ============================================================================
// CONFIGURACIÓN
// ============================================================================
const API_BASE_URL = 'http://localhost:8002/api/v1/users';

// Fix iconos Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Factory de iconos
const createIcon = (color) => new L.Icon({
  iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});

const icons = { start: createIcon('green'), end: createIcon('red'), waypoint: createIcon('blue') };

// Utilidades
const formatTime = (h) => `${Math.floor(h)}h ${Math.round((h - Math.floor(h)) * 60)}m`;
const getIcon = (i, total) => i === 0 ? icons.start : i === total - 1 ? icons.end : icons.waypoint;
const getLines = (points) => points?.slice(0, -1).map((p, i) => [[p.latitude, p.longitude], [points[i+1].latitude, points[i+1].longitude]]) || [];

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================
const RouteOptimizerPage = () => {
  const [sellers, setSellers] = useState([]);
  const [selectedSeller, setSelectedSeller] = useState('');
  const [route, setRoute] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [startLocation, setStartLocation] = useState({ latitude: '', longitude: '' });
  const [mapCenter, setMapCenter] = useState([4.6097, -74.0817]);

  const token = () => localStorage.getItem('token');
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const isTendero = currentUser.role === 'TENDERO';

  // Cargar vendedores
  useEffect(() => {
    if (!isTendero) {
      fetch(`${API_BASE_URL}/sellers`, { headers: { Authorization: `Bearer ${token()}` }})
        .then(r => r.json())
        .then(setSellers)
        .catch(console.error);
    }
  }, [isTendero]);

  // Si es tendero, cargar su ruta automáticamente
  useEffect(() => {
    if (isTendero && currentUser.shopkeeper_id) {
      loadShopkeeperRoute();
    }
  }, [isTendero]);

  const loadShopkeeperRoute = async () => {
    setLoading(true);
    try {
      const url = `${API_BASE_URL}/routes/optimize?shopkeeper_id=${currentUser.shopkeeper_id}`;
      const response = await fetch(url, { headers: { Authorization: `Bearer ${token()}` }});
      
      if (!response.ok) throw new Error('No tienes vendedor asignado');
      
      const data = await response.json();
      setRoute(data);
      
      console.log(`✅ Ruta cargada: ${data.from_cache ? 'desde caché' : 'nueva'} con ${data.algorithm_used}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Centrar mapa
  useEffect(() => {
    if (route?.route_points?.[0]) {
      setMapCenter([route.route_points[0].latitude, route.route_points[0].longitude]);
    }
  }, [route]);

  // Generar ruta
  const generateRoute = async (forceRecalculate = false) => {
    if (!selectedSeller) return setError('Seleccione un vendedor');
    
    setLoading(true);
    setError('');
    
    try {
      const params = new URLSearchParams();
      if (startLocation.latitude && startLocation.longitude) {
        params.append('start_latitude', startLocation.latitude);
        params.append('start_longitude', startLocation.longitude);
      }
      
      if (forceRecalculate) {
        params.append('force_recalculate', 'true');
      }
      
      const url = `${API_BASE_URL}/routes/optimize?seller_id=${selectedSeller}${params.toString() ? '&' + params : ''}`;
      const response = await fetch(url, { headers: { Authorization: `Bearer ${token()}` }});
      
      if (!response.ok) throw new Error('Error al generar ruta');
      
      const data = await response.json();
      setRoute(data);
      
      // Log de información
      if (data.from_cache && !forceRecalculate) {
        console.log(`✅ Ruta desde caché (${data.cache_age_minutes || 0} min)`);
      } else {
        console.log(`🔄 Ruta calculada con ${data.algorithm_used}`);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Obtener ubicación actual
  const getLocation = () => {
    if (!navigator.geolocation) return setError('Geolocalización no disponible');
    
    navigator.geolocation.getCurrentPosition(
      (pos) => setStartLocation({ 
        latitude: pos.coords.latitude.toFixed(7), 
        longitude: pos.coords.longitude.toFixed(7) 
      }),
      (err) => setError('Error al obtener ubicación: ' + err.message)
    );
  };

  const routeLines = getLines(route?.route_points);

  return (
    <div style={{ padding: '20px', maxWidth: '1600px', margin: '0 auto' }}>
      {/* Header */}
      <h2>🗺️ Optimizador de Rutas</h2>
      <p style={{ color: '#666' }}>
        {isTendero 
          ? 'Visualiza la ruta de tu vendedor asignado'
          : 'Genera rutas optimizadas para reducir tiempo de desplazamiento'
        }
      </p>

      {/* Badges de información */}
      {route && (
        <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {/* Badge de algoritmo */}
          <span style={{
            padding: '8px 16px',
            borderRadius: '20px',
            fontSize: '14px',
            backgroundColor: route.algorithm_used === 'openrouteservice' ? '#10b981' : '#f59e0b',
            color: 'white',
            fontWeight: 'bold',
            display: 'inline-block'
          }}>
            {route.algorithm_used === 'openrouteservice' ? '🌐 Ruta Real (OpenRouteService)' : '📏 Ruta Estimada (Haversine)'}
          </span>

          {/* Badge de caché */}
          {route.from_cache && (
            <span style={{
              padding: '8px 16px',
              borderRadius: '20px',
              fontSize: '14px',
              backgroundColor: '#3b82f6',
              color: 'white',
              fontWeight: 'bold',
              display: 'inline-block'
            }}>
              ⚡ Desde caché ({route.cache_age_minutes || 0} min)
            </span>
          )}

          {/* Badge de precisión */}
          <span style={{
            padding: '8px 16px',
            borderRadius: '20px',
            fontSize: '14px',
            backgroundColor: '#6b7280',
            color: 'white',
            fontWeight: 'bold',
            display: 'inline-block'
          }}>
            🎯 Precisión: {route.algorithm_used === 'openrouteservice' ? '~95%' : '~70%'}
          </span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ padding: '15px', marginBottom: '20px', backgroundColor: '#f8d7da', color: '#721c24', borderRadius: '4px' }}>
          {error}
        </div>
      )}

      {/* Controles (solo para vendedores/admin) */}
      {!isTendero && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '20px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Vendedor</label>
            <select value={selectedSeller} onChange={e => setSelectedSeller(e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}>
              <option value="">Seleccionar...</option>
              {sellers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Inicio (Lat)</label>
            <input type="number" step="any" placeholder="Opcional" value={startLocation.latitude} onChange={e => setStartLocation({...startLocation, latitude: e.target.value})} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Inicio (Lon)</label>
            <input type="number" step="any" placeholder="Opcional" value={startLocation.longitude} onChange={e => setStartLocation({...startLocation, longitude: e.target.value})} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px' }}>
            <button onClick={getLocation} style={{ padding: '8px 16px', backgroundColor: '#6b7280', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
              📍 Mi Ubicación
            </button>
            <button onClick={() => generateRoute(false)} disabled={!selectedSeller || loading} style={{ padding: '8px 16px', backgroundColor: loading ? '#ccc' : '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: loading ? 'not-allowed' : 'pointer' }}>
              {loading ? '⏳ Generando...' : '🚀 Generar Ruta'}
            </button>
            {route && (
              <button onClick={() => generateRoute(true)} disabled={loading} style={{ padding: '8px 16px', backgroundColor: '#6b7280', color: 'white', border: 'none', borderRadius: '4px', cursor: loading ? 'not-allowed' : 'pointer' }}>
                🔄 Recalcular
              </button>
            )}
          </div>
        </div>
      )}

      {/* Resultados */}
      {route && (
        <>
          {/* Estadísticas */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px', marginBottom: '20px' }}>
            {[
              { label: 'Paradas', value: route.statistics.total_shopkeepers, icon: '📍' },
              { label: 'Distancia', value: `${route.statistics.total_distance_km} km`, icon: '📏' },
              { label: 'Tiempo', value: formatTime(route.statistics.estimated_total_time_hours), icon: '⏱️' },
              { label: 'Vendedor', value: route.seller_name, icon: '👤' }
            ].map((stat, i) => (
              <div key={i} style={{ padding: '15px', border: '1px solid #ddd', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '24px' }}>{stat.icon}</div>
                <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>{stat.label}</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold', marginTop: '5px', color: '#007bff' }}>{stat.value}</div>
              </div>
            ))}
          </div>

          {/* Mapa y Lista */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
            {/* Mapa */}
            <div style={{ backgroundColor: 'white', border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden' }}>
              <div style={{ padding: '15px', backgroundColor: '#f8f9fa', borderBottom: '1px solid #ddd', fontWeight: 'bold' }}>🗺️ Visualización</div>
              <MapContainer center={mapCenter} zoom={13} style={{ height: '600px', width: '100%' }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                {route.route_points.map((p, i) => (
                  <Marker key={p.shopkeeper_id} position={[p.latitude, p.longitude]} icon={getIcon(i, route.route_points.length)}>
                    <Popup>
                      <strong>#{p.order} - {p.shopkeeper_name}</strong><br />
                      <small>{p.address}</small>
                      {p.distance_from_previous_km > 0 && (
                        <><hr style={{ margin: '5px 0' }} /><small>📍 {p.distance_from_previous_km} km | 📏 Acumulado: {p.cumulative_distance_km} km</small></>
                      )}
                    </Popup>
                  </Marker>
                ))}
                {routeLines.map((line, i) => <Polyline key={i} positions={line} color="#007bff" weight={3} opacity={0.7} />)}
              </MapContainer>
            </div>

            {/* Lista */}
            <div style={{ backgroundColor: 'white', border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden' }}>
              <div style={{ padding: '15px', backgroundColor: '#f8f9fa', borderBottom: '1px solid #ddd', fontWeight: 'bold' }}>📋 Orden de Visitas</div>
              <div style={{ height: '600px', overflowY: 'auto' }}>
                {route.route_points.map((p, i) => (
                  <div key={p.shopkeeper_id} style={{ padding: '15px', borderBottom: '1px solid #eee', backgroundColor: i === 0 ? '#e7f5e7' : i === route.route_points.length - 1 ? '#ffe7e7' : 'white' }}>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <span style={{ backgroundColor: i === 0 ? '#28a745' : i === route.route_points.length - 1 ? '#dc3545' : '#007bff', color: 'white', borderRadius: '50%', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>{p.order}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 'bold' }}>{p.shopkeeper_name}</div>
                        <div style={{ fontSize: '12px', color: '#666' }}>{p.business_name}</div>
                        <div style={{ fontSize: '12px', color: '#666' }}>{p.address}</div>
                        {p.distance_from_previous_km > 0 && <div style={{ fontSize: '12px', color: '#007bff', marginTop: '5px' }}>📍 {p.distance_from_previous_km} km desde anterior</div>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default RouteOptimizerPage;
