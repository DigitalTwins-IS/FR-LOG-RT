/**
 * RouteOptimizerPage - Optimizador de Rutas
 */
import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// ============================================================================
// CONFIGURACIÓN
// ============================================================================
const API_BASE_URL = 'http://localhost:8002/api/v1/users';
const MS_GEO_URL = 'http://localhost:8003/api/v1/geo';

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
  const [zones, setZones] = useState([]);  // ✅ NUEVO
  const [selectedSeller, setSelectedSeller] = useState('');
  const [route, setRoute] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [startLocation, setStartLocation] = useState({ latitude: '', longitude: '' });
  const [mapCenter, setMapCenter] = useState([4.6097, -74.0817]);

  const token = () => localStorage.getItem('token');

  // Función para obtener nombre de zona 
  const getZoneName = (zoneId) => {
    const zone = zones.find(z => z.id === zoneId);
    return zone ? zone.name : 'Sin zona';
  };

  // Cargar vendedores Y zonas
  useEffect(() => {
    const loadData = async () => {
      try {
        const headers = { Authorization: `Bearer ${token()}` };
        
       
        const [sellersData, zonesData] = await Promise.all([
          fetch(`${API_BASE_URL}/sellers`, { headers }).then(r => r.json()),
          fetch(`${MS_GEO_URL}/zones`, { headers }).then(r => r.json())
        ]);
        
        setSellers(sellersData);
        setZones(zonesData);
      } catch (err) {
        console.error('Error cargando datos:', err);
      }
    };
    
    loadData();
  }, []);

  // Centrar mapa
  useEffect(() => {
    if (route?.route_points?.[0]) {
      setMapCenter([route.route_points[0].latitude, route.route_points[0].longitude]);
    }
  }, [route]);

  // Generar ruta
  const generateRoute = async () => {
    if (!selectedSeller) return setError('Seleccione un vendedor');
    
    setLoading(true);
    setError('');
    
    try {
      const params = new URLSearchParams();
      if (startLocation.latitude && startLocation.longitude) {
        params.append('start_latitude', startLocation.latitude);
        params.append('start_longitude', startLocation.longitude);
      }
      
      const url = `${API_BASE_URL}/sellers/${selectedSeller}/optimized-route${params.toString() ? '?' + params : ''}`;
      const response = await fetch(url, { headers: { Authorization: `Bearer ${token()}` }});
      
      if (!response.ok) throw new Error('Error al generar ruta');
      
      setRoute(await response.json());
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
      <p style={{ color: '#666' }}>Genera rutas optimizadas para reducir tiempo de desplazamiento</p>

      {/* Error */}
      {error && (
        <div style={{ padding: '15px', marginBottom: '20px', backgroundColor: '#f8d7da', color: '#721c24', borderRadius: '4px', display: 'flex', justifyContent: 'space-between' }}>
          <span>{error}</span>
          <button onClick={() => setError('')} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>×</button>
        </div>
      )}

      {/* Configuración */}
      <div style={{ backgroundColor: 'white', border: '1px solid #ddd', borderRadius: '8px', padding: '20px', marginBottom: '20px' }}>
        <h5>⚙️ Configuración</h5>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '15px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Vendedor *</label>
            <select value={selectedSeller} onChange={(e) => setSelectedSeller(e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}>
              <option value="">Seleccionar...</option>
              {sellers.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} - {getZoneName(s.zone_id)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Latitud (Opcional)</label>
            <input type="number" step="0.0000001" placeholder="4.6097100" value={startLocation.latitude} onChange={(e) => setStartLocation({...startLocation, latitude: e.target.value})} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Longitud (Opcional)</label>
            <input type="number" step="0.0000001" placeholder="-74.0817500" value={startLocation.longitude} onChange={(e) => setStartLocation({...startLocation, longitude: e.target.value})} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button onClick={getLocation} style={{ width: '100%', padding: '8px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>📍 Mi Ubicación</button>
          </div>
        </div>
        <button onClick={generateRoute} disabled={loading || !selectedSeller} style={{ width: '100%', padding: '15px', backgroundColor: loading || !selectedSeller ? '#ccc' : '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: loading || !selectedSeller ? 'not-allowed' : 'pointer', fontSize: '16px', fontWeight: 'bold' }}>
          {loading ? '⏳ Generando...' : '🚀 Generar Ruta'}
        </button>
      </div>

      {route ? (
        <>
          {/* Estadísticas */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '20px' }}>
            {[
              { label: 'Total Tenderos', value: route.statistics.total_shopkeepers },
              { label: 'Distancia Total', value: `${route.statistics.total_distance_km} km` },
              { label: 'Tiempo Viaje', value: formatTime(route.statistics.estimated_travel_time_hours) },
              { label: 'Tiempo Total', value: formatTime(route.statistics.estimated_total_time_hours), highlight: true }
            ].map((stat, i) => (
              <div key={i} style={{ backgroundColor: 'white', border: '1px solid #ddd', borderRadius: '8px', padding: '20px', textAlign: 'center' }}>
                <div style={{ color: '#666', marginBottom: '10px' }}>{stat.label}</div>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: stat.highlight ? '#007bff' : 'inherit' }}>{stat.value}</div>
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
                {route.route_points[0] && <Circle center={[route.route_points[0].latitude, route.route_points[0].longitude]} radius={100} pathOptions={{ color: 'green', fillColor: 'green', fillOpacity: 0.2 }} />}
              </MapContainer>
            </div>

            {/* Lista */}
            <div style={{ backgroundColor: 'white', border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden' }}>
              <div style={{ padding: '15px', backgroundColor: '#f8f9fa', borderBottom: '1px solid #ddd', fontWeight: 'bold' }}>📋 Orden de Visitas</div>
              <div style={{ height: '600px', overflowY: 'auto' }}>
                {route.route_points.map((p, i) => (
                  <div key={p.shopkeeper_id} style={{ padding: '15px', borderBottom: '1px solid #eee', backgroundColor: i === 0 ? '#e7f5e7' : i === route.route_points.length - 1 ? '#ffe7e7' : 'white' }}>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <span style={{ backgroundColor: i === 0 ? '#28a745' : i === route.route_points.length - 1 ? '#dc3545' : '#007bff', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', minWidth: '30px', textAlign: 'center' }}>{p.order}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 'bold' }}>{p.shopkeeper_name} {i === 0 && '🟢'} {i === route.route_points.length - 1 && '🔴'}</div>
                        <div style={{ fontSize: '12px', color: '#666' }}>📍 {p.address}</div>
                        {p.distance_from_previous_km > 0 && <div style={{ fontSize: '12px', color: '#007bff' }}>🚗 {p.distance_from_previous_km} km | Acum: {p.cumulative_distance_km} km</div>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      ) : !loading && (
        <div style={{ backgroundColor: 'white', border: '1px solid #ddd', borderRadius: '8px', padding: '60px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: '64px', marginBottom: '20px' }}>🗺️</div>
          <h3 style={{ color: '#666' }}>Seleccione un vendedor y genere una ruta optimizada</h3>
        </div>
      )}
    </div>
  );
};

export default RouteOptimizerPage;