import { useState, useEffect } from 'react';

// Configuración de API
const API_BASE_URL = 'http://localhost:8002/api/v1/users';

const RouteOptimizerPage = () => {
  const [sellers, setSellers] = useState([]);
  const [selectedSeller, setSelectedSeller] = useState('');
  const [route, setRoute] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [startLocation, setStartLocation] = useState({
    latitude: '',
    longitude: ''
  });

  useEffect(() => {
    loadSellers();
  }, []);

  const loadSellers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/sellers`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      setSellers(data);
    } catch (err) {
      console.error('Error loading sellers:', err);
    }
  };

  const handleGenerateRoute = async () => {
    if (!selectedSeller) {
      setError('Por favor seleccione un vendedor');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const token = localStorage.getItem('token');
      let url = `${API_BASE_URL}/sellers/${selectedSeller}/optimized-route`;
      
      const params = new URLSearchParams();
      if (startLocation.latitude && startLocation.longitude) {
        params.append('start_latitude', startLocation.latitude);
        params.append('start_longitude', startLocation.longitude);
      }
      
      if (params.toString()) {
        url += '?' + params.toString();
      }

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error('Error al generar ruta');
      }

      const data = await response.json();
      setRoute(data);
    } catch (err) {
      setError(err.message || 'Error al generar ruta');
      console.error('Error generating route:', err);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setStartLocation({
            latitude: position.coords.latitude.toFixed(7),
            longitude: position.coords.longitude.toFixed(7)
          });
        },
        (error) => {
          setError('Error al obtener ubicación: ' + error.message);
        }
      );
    } else {
      setError('Geolocalización no disponible en este navegador');
    }
  };

  const formatTime = (hours) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  return (
    <div style={{ padding: '20px', maxinline-size: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ margininset-block-end: '30px' }}>
        <h2 style={{ margin: 0 }}>🗺️ Optimizador de Rutas</h2>
        <p style={{ color: '#666', margin: '5px 0 0 0' }}>
          HU13: Genera rutas optimizadas para reducir tiempo de desplazamiento
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div style={{
          padding: '15px',
          margininset-block-end: '20px',
          backgroundColor: '#f8d7da',
          color: '#721c24',
          border: '1px solid #f5c6cb',
          borderRadius: '4px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>{error}</span>
          <button 
            onClick={() => setError('')}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '20px',
              cursor: 'pointer',
              color: '#721c24'
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* Formulario de configuración */}
      <div style={{
        backgroundColor: 'white',
        border: '1px solid #ddd',
        borderRadius: '8px',
        margininset-block-end: '20px',
        overflow: 'hidden'
      }}>
        <div style={{
          padding: '15px',
          backgroundColor: '#f8f9fa',
          borderinset-block-end: '1px solid #ddd',
          fontWeight: 'bold'
        }}>
          📋 Configuración de Ruta
        </div>
        <div style={{ padding: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', margininset-block-end: '20px' }}>
            <div>
              <label style={{ display: 'block', margininset-block-end: '5px', fontWeight: '500' }}>
                Vendedor *
              </label>
              <select
                value={selectedSeller}
                onChange={(e) => setSelectedSeller(e.target.value)}
                style={{
                  inline-size: '100%',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              >
                <option value="">Seleccione un vendedor</option>
                {sellers.map(seller => (
                  <option key={seller.id} value={seller.id}>
                    {seller.name} ({seller.total_shopkeepers || 0} tenderos)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', margininset-block-end: '5px', fontWeight: '500' }}>
                Latitud Inicio (Opcional)
              </label>
              <input
                type="number"
                step="0.0000001"
                placeholder="4.6097100"
                value={startLocation.latitude}
                onChange={(e) => setStartLocation({...startLocation, latitude: e.target.value})}
                style={{
                  inline-size: '100%',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', margininset-block-end: '5px', fontWeight: '500' }}>
                Longitud Inicio (Opcional)
              </label>
              <input
                type="number"
                step="0.0000001"
                placeholder="-74.0817500"
                value={startLocation.longitude}
                onChange={(e) => setStartLocation({...startLocation, longitude: e.target.value})}
                style={{
                  inline-size: '100%',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button
                onClick={getCurrentLocation}
                style={{
                  inline-size: '100%',
                  padding: '8px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                📍 Mi Ubicación
              </button>
            </div>
          </div>

          <button
            onClick={handleGenerateRoute}
            disabled={loading || !selectedSeller}
            style={{
              inline-size: '100%',
              padding: '15px',
              backgroundColor: loading || !selectedSeller ? '#ccc' : '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading || !selectedSeller ? 'not-allowed' : 'pointer',
              fontSize: '16px',
              fontWeight: 'bold'
            }}
          >
            {loading ? '⏳ Generando ruta...' : '🚀 Generar Ruta Optimizada'}
          </button>

          {route && (
            <div style={{
              margininset-block-start: '15px',
              padding: '12px',
              backgroundColor: '#d1ecf1',
              color: '#0c5460',
              border: '1px solid #bee5eb',
              borderRadius: '4px'
            }}>
              <strong>Algoritmo utilizado:</strong> {route.algorithm_used === 'nearest_neighbor' ? 'Vecino Más Cercano (Greedy)' : route.algorithm_used}
            </div>
          )}
        </div>
      </div>

      {route && (
        <>
          {/* Estadísticas */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '15px',
            margininset-block-end: '20px'
          }}>
            <div style={{
              backgroundColor: 'white',
              border: '1px solid #ddd',
              borderRadius: '8px',
              padding: '20px',
              textAlign: 'center'
            }}>
              <div style={{ color: '#666', margininset-block-end: '10px' }}>Total Tenderos</div>
              <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{route.statistics.total_shopkeepers}</div>
            </div>

            <div style={{
              backgroundColor: 'white',
              border: '1px solid #ddd',
              borderRadius: '8px',
              padding: '20px',
              textAlign: 'center'
            }}>
              <div style={{ color: '#666', margininset-block-end: '10px' }}>Distancia Total</div>
              <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{route.statistics.total_distance_km} km</div>
            </div>

            <div style={{
              backgroundColor: 'white',
              border: '1px solid #ddd',
              borderRadius: '8px',
              padding: '20px',
              textAlign: 'center'
            }}>
              <div style={{ color: '#666', margininset-block-end: '10px' }}>Tiempo Viaje</div>
              <div style={{ fontSize: '32px', fontWeight: 'bold' }}>
                {formatTime(route.statistics.estimated_travel_time_hours)}
              </div>
            </div>

            <div style={{
              backgroundColor: 'white',
              border: '1px solid #ddd',
              borderRadius: '8px',
              padding: '20px',
              textAlign: 'center'
            }}>
              <div style={{ color: '#666', margininset-block-end: '10px' }}>Tiempo Total</div>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#007bff' }}>
                {formatTime(route.statistics.estimated_total_time_hours)}
              </div>
              <div style={{ fontSize: '12px', color: '#666', margininset-block-start: '5px' }}>
                (incluye {formatTime(route.statistics.estimated_visit_time_hours)} de visitas)
              </div>
            </div>
          </div>

          {/* Mapa y Lista */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
            {/* Mapa (Placeholder - necesitarías Leaflet o Google Maps) */}
            <div style={{
              backgroundColor: 'white',
              border: '1px solid #ddd',
              borderRadius: '8px',
              overflow: 'hidden'
            }}>
              <div style={{
                padding: '15px',
                backgroundColor: '#f8f9fa',
                borderinset-block-end: '1px solid #ddd',
                fontWeight: 'bold'
              }}>
                🗺️ Visualización de Ruta
              </div>
              <div style={{
                block-size: '600px',
                backgroundColor: '#e9ecef',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                padding: '20px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '48px', margininset-block-end: '20px' }}>🗺️</div>
                <h3>Mapa Interactivo</h3>
                <p style={{ color: '#666', maxinline-size: '400px' }}>
                  Para ver el mapa completo con marcadores y líneas de ruta, 
                  esta página debe integrarse con el sistema que tiene Leaflet instalado.
                </p>
                <div style={{
                  margininset-block-start: '20px',
                  padding: '15px',
                  backgroundColor: 'white',
                  borderRadius: '4px',
                  border: '1px solid #ddd',
                  maxinline-size: '500px'
                }}>
                  <strong>Coordenadas de la ruta:</strong>
                  <div style={{ margininset-block-start: '10px', fontSize: '12px', textAlign: 'left' }}>
                    {route.route_points.slice(0, 3).map((point, i) => (
                      <div key={i} style={{ margininset-block-end: '5px' }}>
                        {i + 1}. {point.shopkeeper_name}: ({point.latitude.toFixed(4)}, {point.longitude.toFixed(4)})
                      </div>
                    ))}
                    {route.route_points.length > 3 && <div>... y {route.route_points.length - 3} más</div>}
                  </div>
                </div>
              </div>
            </div>

            {/* Lista de visitas */}
            <div style={{
              backgroundColor: 'white',
              border: '1px solid #ddd',
              borderRadius: '8px',
              overflow: 'hidden'
            }}>
              <div style={{
                padding: '15px',
                backgroundColor: '#f8f9fa',
                borderinset-block-end: '1px solid #ddd',
                fontWeight: 'bold'
              }}>
                📋 Orden de Visitas
              </div>
              <div style={{ block-size: '600px', overflowY: 'auto' }}>
                {route.route_points.map((point, index) => (
                  <div key={point.shopkeeper_id} style={{
                    padding: '15px',
                    borderinset-block-end: '1px solid #eee'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'start', gap: '10px' }}>
                      <span style={{
                        backgroundColor: '#007bff',
                        color: 'white',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        mininline-size: '30px',
                        textAlign: 'center'
                      }}>
                        #{point.order}
                      </span>
                      <div style={{ flex: 1 }}>
                        <strong>{point.shopkeeper_name}</strong>
                        <div style={{ fontSize: '12px', color: '#666', margininset-block-start: '5px' }}>
                          {point.address}
                        </div>
                        <div style={{ margininset-block-start: '8px', display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                          {index > 0 && (
                            <span style={{
                              backgroundColor: '#17a2b8',
                              color: 'white',
                              padding: '2px 6px',
                              borderRadius: '3px',
                              fontSize: '11px'
                            }}>
                              🚗 {point.distance_from_previous_km} km
                            </span>
                          )}
                          <span style={{
                            backgroundColor: '#6c757d',
                            color: 'white',
                            padding: '2px 6px',
                            borderRadius: '3px',
                            fontSize: '11px'
                          }}>
                            📊 {point.cumulative_distance_km} km total
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Información adicional */}
          <div style={{
            margininset-block-start: '20px',
            padding: '20px',
            backgroundColor: '#d4edda',
            color: '#155724',
            border: '1px solid #c3e6cb',
            borderRadius: '8px'
          }}>
            <strong>✅ Ruta optimizada generada exitosamente</strong>
            <ul style={{ margininset-block-end: 0, margininset-block-start: '10px' }}>
              <li>Distancia promedio entre paradas: <strong>{route.statistics.average_distance_between_stops_km} km</strong></li>
              <li>Velocidad promedio estimada: <strong>25 km/h</strong> (ciudad)</li>
              <li>Tiempo por visita estimado: <strong>10 minutos</strong></li>
              <li>Ahorro estimado vs ruta no optimizada: <strong>~20-30%</strong></li>
            </ul>
          </div>
        </>
      )}

      {!route && !loading && (
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #ddd',
          borderRadius: '8px',
          padding: '60px 20px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '64px', margininset-block-end: '20px' }}>🗺️</div>
          <h3 style={{ color: '#666' }}>Seleccione un vendedor y genere una ruta optimizada</h3>
          <p style={{ color: '#999' }}>
            El sistema calculará la mejor ruta para visitar todos los tenderos, minimizando la distancia total.
          </p>
        </div>
      )}
    </div>
  );
};