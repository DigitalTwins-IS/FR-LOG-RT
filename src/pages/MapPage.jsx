import { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, ListGroup, Badge, Button, ButtonGroup } from 'react-bootstrap';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polygon, Rectangle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { geoService, userService } from '../services/api';
import { MAP_CONFIG, ZONE_COLORS } from '../config';
import { toast } from 'react-toastify';

// Importar GeoJSON real simplificado de zonas de Bogotá
import bogotaZonesGeoJSON from '../data/bogota-zones-real.geojson?url';

// Cargar el GeoJSON de forma asíncrona
let cachedGeoJSON = null;
const loadGeoJSON = async () => {
  if (cachedGeoJSON) return cachedGeoJSON;
  const response = await fetch(bogotaZonesGeoJSON);
  cachedGeoJSON = await response.json();
  return cachedGeoJSON;
};

// CSS personalizado para las zonas
const zoneStyles = `
  .zona-section {
    transition: all 0.3s ease;
    cursor: pointer;
  }
  .zona-section:hover {
    filter: brightness(1.1);
  }
`;

// Inyectar estilos
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = zoneStyles;
  document.head.appendChild(styleSheet);
}

// Fix para iconos de Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Definición de secciones de Bogotá - Coordenadas ajustadas al área visible
const BOGOTA_SECTIONS = {
  norte: {
    name: 'Bogotá Norte',
    color: '#e74c3c',
    borderColor: '#c0392b',
    coordinates: [
      [4.7600, -74.1500],  // Noroeste
      [4.7600, -74.0000],  // Noreste
      [4.6700, -74.0000],  // Sureste
      [4.6700, -74.1500],  // Suroeste
    ],
    center: [4.7150, -74.0750],
    zoom: 13
  },
  centro: {
    name: 'Bogotá Centro Ampliado',
    color: '#f39c12',
    borderColor: '#d68910',
    coordinates: [
      [4.6700, -74.1500],  // Noroeste
      [4.6700, -74.0000],  // Noreste
      [4.5800, -74.0000],  // Sureste
      [4.5800, -74.1500],  // Suroeste
    ],
    center: [4.6250, -74.0750],
    zoom: 13
  },
  sur: {
    name: 'Bogotá Sur',
    color: '#27ae60',
    borderColor: '#1e8449',
    coordinates: [
      [4.5800, -74.1500],  // Noroeste
      [4.5800, -74.0000],  // Noreste
      [4.4900, -74.0000],  // Sureste
      [4.4900, -74.1500],  // Suroeste
    ],
    center: [4.5350, -74.0750],
    zoom: 13
  }
};

// Componente para controlar el mapa
function MapController({ center, zoom }) {
  const map = useMap();
  
  useEffect(() => {
    if (center && zoom && map) {
      console.log('🗺️ MapController - Moviendo a:', center, 'Zoom:', zoom);
      try {
        map.setView(center, zoom, {
          animate: true,
          duration: 0.5
        });
      } catch (error) {
        console.error('Error al mover mapa:', error);
      }
    }
  }, [center, zoom, map]);
  
  return null;
}

// Componente para dibujar polígonos reales de Bogotá usando GeoJSON
function BogotaSections({ selectedSection, onSectionClick }) {
  const map = useMap();
  const [geoData, setGeoData] = useState(null);
  
  // Cargar GeoJSON al montar
  useEffect(() => {
    loadGeoJSON()
      .then(data => {
        console.log('✅ GeoJSON real cargado:', data.features.length, 'zonas');
        setGeoData(data);
      })
      .catch(err => {
        console.error('❌ Error cargando GeoJSON:', err);
      });
  }, []);
  
  useEffect(() => {
    if (!geoData) return;
    
    console.log('🎨 Redibujando secciones de Bogotá - Selección:', selectedSection || 'Todas');
    
    // Limpiar TODAS las capas anteriores de zonas
    const layersToRemove = [];
    map.eachLayer((layer) => {
      if (layer.options && layer.options.sectionKey) {
        layersToRemove.push(layer);
      }
    });
    layersToRemove.forEach(layer => map.removeLayer(layer));
    
    // Dibujar cada feature del GeoJSON usando L.geoJSON para soportar MultiPolygon
    geoData.features.forEach((feature) => {
      const { properties } = feature;
      const key = properties.zone; // 'norte', 'centro', 'sur'
      
      const isSelected = selectedSection === key;
      const isNoneSelected = selectedSection === null;
      
      let fillOpacity, weight, dashArray, display;
      
      if (isNoneSelected) {
        // Ver todo: color tenue, borde visible
        fillOpacity = 0.15;
        weight = 2;
        dashArray = null;
        display = true;
      } else if (isSelected) {
        // Seleccionada: color tenue pero visible, borde destacado
        fillOpacity = 0.25;
        weight = 3;
        dashArray = null;
        display = true;
      } else {
        // No seleccionada: OCULTAR completamente
        fillOpacity = 0;
        weight = 0;
        dashArray = null;
        display = false;
      }
      
      // Si no debe mostrarse, saltar
      if (!display) {
        console.log(`⏭️  Sección ${key} oculta (no seleccionada)`);
        return;
      }
      
      // Usar L.geoJSON para manejar MultiPolygon correctamente
      const geoJsonLayer = L.geoJSON(feature, {
        style: {
          fillColor: properties.color,
          fillOpacity: fillOpacity,
          color: properties.color,
          weight: weight,
          opacity: 1,
          dashArray: dashArray,
        },
        onEachFeature: (feature, layer) => {
          // Agregar identificador personalizado
          layer.options.sectionKey = key;
          layer.options.className = 'zona-section';
          
          // Popup mejorado
          const popupContent = `
            <div style="text-align: center; padding: 8px;">
              <div style="width: 40px; height: 40px; background-color: ${properties.color}; 
                          border: 3px solid ${properties.color}; border-radius: 8px; 
                          margin: 0 auto 10px; opacity: 0.8;"></div>
              <strong style="font-size: 16px; color: #333;">${properties.name}</strong><br/>
              <small style="color: #666; font-size: 12px;">${properties.description}</small><br/>
              <small style="color: #999; font-size: 11px;">Haz clic para enfocar esta zona</small>
            </div>
          `;
          layer.bindPopup(popupContent);
          
          // Eventos de clic
          layer.on('click', () => {
            console.log('👆 Clic en sección:', key);
            onSectionClick(key);
          });
          
          // Efecto hover sutil
          layer.on('mouseover', function() {
            this.setStyle({
              weight: weight + 1,
              fillOpacity: Math.min(fillOpacity + 0.1, 0.35),
              color: '#333333'
            });
          });
          
          layer.on('mouseout', function() {
            this.setStyle({
              weight: weight,
              fillOpacity: fillOpacity,
              color: properties.color
            });
          });
        }
      }).addTo(map);
      
      console.log(`✅ Sección ${key} (${properties.name}) dibujada con datos reales (MultiPolygon)`);
    });
    
    console.log('✅ Todas las secciones de Bogotá dibujadas con datos reales');
    
  }, [map, selectedSection, onSectionClick, geoData]);
  
  return null;
}

const MapPage = () => {
  const [cities, setCities] = useState([]);
  const [zones, setZones] = useState([]);
  const [shopkeepers, setShopkeepers] = useState([]);
  const [selectedCity, setSelectedCity] = useState(null);
  const [selectedZone, setSelectedZone] = useState(null);
  const [selectedSection, setSelectedSection] = useState(null);
  const [mapCenter, setMapCenter] = useState([4.6100, -74.0750]);
  const [mapZoom, setMapZoom] = useState(11);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedCity) {
      // Buscar la ciudad seleccionada para obtener sus coordenadas
      const city = cities.find(c => c.id === parseInt(selectedCity));
      
      console.log('🔍 Debug ciudad:', {
        selectedCity,
        cityFound: city,
        allCities: cities.map(c => ({ id: c.id, name: c.name }))
      });
      
      if (city) {
        console.log('✅ Ciudad seleccionada:', city.name);
        loadZones(selectedCity);
        
        // Limpiar sección seleccionada cuando cambia de ciudad
        setSelectedSection(null);
        
        // Coordenadas de ciudades principales de Colombia
        const cityCoordinates = {
          'Bogotá': [4.6100, -74.0750],
          'Medellín': [6.2442, -75.5812],
          'Cali': [3.4516, -76.5320],
          'Barranquilla': [10.9685, -74.7813],
          'Cartagena': [10.3910, -75.4794],
          'Bucaramanga': [7.1254, -73.1198],
          'Pereira': [4.8133, -75.6961],
          'Santa Marta': [11.2408, -74.2099],
          'Manizales': [5.0703, -75.5138],
          'Ibagué': [4.4389, -75.2322]
        };
        
        // Buscar coordenadas por nombre de ciudad
        const coords = cityCoordinates[city.name] || [4.6100, -74.0750]; // Default a Bogotá
        
        console.log(`🗺️ Intentando mover mapa a ${city.name}:`, coords);
        
        setMapCenter(coords);
        setMapZoom(12);
      }
    } else {
      console.log('❌ Sin ciudad - Vista de Colombia');
      setZones([]);
      setSelectedZone(null);
      setSelectedSection(null); // Limpiar sección seleccionada
      setMapCenter([4.5709, -74.2973]);
      setMapZoom(6);
    }
  }, [selectedCity, cities]);

  useEffect(() => {
    if (selectedZone) {
      loadShopkeepers(selectedZone);
    } else {
      setShopkeepers([]);
    }
  }, [selectedZone]);

  const loadData = async () => {
    try {
      const citiesData = await geoService.getCities();
      setCities(citiesData);
    } catch (error) {
      console.warn('⚠️ Backend no disponible, mostrando mapa sin datos:', error.message);
      toast.warning('Backend no disponible. Mostrando mapa de Bogotá.');
      // Continuar sin datos del backend
    } finally {
      setLoading(false);
    }
  };

  const loadZones = async (cityId) => {
    try {
      const zonesData = await geoService.getZones(cityId);
      setZones(zonesData);
    } catch (error) {
      toast.error('Error al cargar zonas');
      console.error(error);
    }
  };

  const loadShopkeepers = async (zoneId) => {
    try {
      const sellers = await userService.getSellers(zoneId);
      let allShopkeepers = [];
      for (const seller of sellers) {
        const sellerShopkeepers = await userService.getShopkeepers({ seller_id: seller.id });
        allShopkeepers = [...allShopkeepers, ...sellerShopkeepers];
      }
      setShopkeepers(allShopkeepers);
    } catch (error) {
      toast.error('Error al cargar tenderos');
      console.error(error);
    }
  };

  const handleSectionClick = (sectionKey) => {
    console.log('=== Clic en sección:', sectionKey);
    if (sectionKey === null) {
      setSelectedSection(null);
      setMapCenter([4.6100, -74.0750]);
      setMapZoom(11);
    } else {
      const section = BOGOTA_SECTIONS[sectionKey];
      setSelectedSection(sectionKey);
      setMapCenter(section.center);
      setMapZoom(section.zoom);
      console.log('Moviendo a:', section.name, section.center, section.zoom);
    }
  };

  const getPolygonStyle = (sectionKey) => {
    const section = BOGOTA_SECTIONS[sectionKey];
    
    if (selectedSection === null) {
      // Ver todo - MUY VISIBLE
      return {
        fillColor: section.color,
        fillOpacity: 0.6,
        color: section.borderColor,
        weight: 6,
        opacity: 1,
        dashArray: null
      };
    } else if (selectedSection === sectionKey) {
      // Seleccionada - SUPER VISIBLE
      return {
        fillColor: section.color,
        fillOpacity: 0.8,
        color: section.borderColor,
        weight: 8,
        opacity: 1,
        dashArray: null
      };
    } else {
      // No seleccionada - tenue
      return {
        fillColor: section.color,
        fillOpacity: 0.15,
        color: section.borderColor,
        weight: 3,
        opacity: 0.6,
        dashArray: null
      };
    }
  };

  if (loading) {
    return (
      <Container className="mt-4">
        <div className="text-center">
          <div className="spinner-border" role="status" />
        </div>
      </Container>
    );
  }

  return (
    <Container fluid className="mt-4">
      <Row>
        <Col md={3}>
          <Card className="mb-3">
            <Card.Header>
              <strong>Ciudades y Zonas</strong>
            </Card.Header>
            <Card.Body>
              <Form.Group className="mb-3">
                <Form.Label>Seleccionar Ciudad</Form.Label>
                <Form.Select
                  value={selectedCity || ''}
                  onChange={(e) => setSelectedCity(e.target.value ? parseInt(e.target.value) : null)}
                >
                  <option value="">Todas las ciudades</option>
                  {cities.map(city => (
                    <option key={city.id} value={city.id}>{city.name}</option>
                  ))}
                </Form.Select>
              </Form.Group>

              {zones.length > 0 && (
                <>
                  <Form.Label>Zonas</Form.Label>
                  <ListGroup>
                    {zones.map(zone => (
                      <ListGroup.Item
                        key={zone.id}
                        action
                        active={selectedZone === zone.id}
                        onClick={() => setSelectedZone(zone.id === selectedZone ? null : zone.id)}
                      >
                        <div className="d-flex justify-content-between align-items-center">
                          <span>
                            <span
                              style={{
                                display: 'inline-block',
                                width: '12px',
                                height: '12px',
                                borderRadius: '50%',
                                backgroundColor: ZONE_COLORS[zone.name] || ZONE_COLORS.default,
                                marginRight: '8px'
                              }}
                            />
                            {zone.name}
                          </span>
                          {selectedZone === zone.id && (
                            <Badge bg="primary">{shopkeepers.length} tenderos</Badge>
                          )}
                        </div>
                      </ListGroup.Item>
                    ))}
                  </ListGroup>
                </>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col md={9}>
          <Card>
            <Card.Header className="d-flex justify-content-between align-items-center flex-wrap">
              <strong className="mb-2 mb-sm-0">
                Mapa de Cobertura{selectedCity && cities.find(c => c.id === parseInt(selectedCity)) 
                  ? ` - ${cities.find(c => c.id === parseInt(selectedCity)).name}` 
                  : ''}
              </strong>
              {/* Mostrar botones de zonas solo para Bogotá */}
              {selectedCity && cities.find(c => c.id === parseInt(selectedCity))?.name === 'Bogotá' && (
                <ButtonGroup size="sm">
                  <Button
                    variant={selectedSection === 'norte' ? 'danger' : 'outline-danger'}
                    onClick={() => handleSectionClick('norte')}
                  >
                    🔴 Norte
                  </Button>
                  <Button
                    variant={selectedSection === 'centro' ? 'warning' : 'outline-warning'}
                    onClick={() => handleSectionClick('centro')}
                  >
                    🟡 Centro
                  </Button>
                  <Button
                    variant={selectedSection === 'sur' ? 'success' : 'outline-success'}
                    onClick={() => handleSectionClick('sur')}
                  >
                    🟢 Sur
                  </Button>
                  <Button
                    variant={selectedSection === null ? 'primary' : 'outline-primary'}
                    onClick={() => handleSectionClick(null)}
                  >
                    ↺ Todo
                  </Button>
                </ButtonGroup>
              )}
            </Card.Header>
            <Card.Body style={{ height: '70vh', padding: 0 }}>
              <MapContainer
                center={[4.6500, -74.0800]}
                zoom={12}
                minZoom={6}
                maxZoom={18}
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom={true}
                zoomControl={true}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                />

                <MapController center={mapCenter} zoom={mapZoom} />
                
                {/* Componente que dibuja las secciones solo para Bogotá */}
                {selectedCity && cities.find(c => c.id === parseInt(selectedCity))?.name === 'Bogotá' && (
                  <BogotaSections 
                    selectedSection={selectedSection}
                    onSectionClick={handleSectionClick}
                  />
                )}

                {/* POLÍGONOS COMENTADOS - Usando Rectangles en su lugar
                {Object.entries(BOGOTA_SECTIONS).map(([key, section]) => {
                  const style = getPolygonStyle(key);
                  console.log(`🗺️ Renderizando polígono ${key}:`, {
                    coords: section.coordinates,
                    style: style
                  });
                  return (
                    <Polygon
                      key={`polygon-${key}`}
                      positions={section.coordinates}
                      pathOptions={style}
                      eventHandlers={{
                        click: () => {
                          console.log('👆 Clic en polígono:', key);
                          handleSectionClick(key);
                        }
                      }}
                    >
                      <Popup>
                        <strong>{section.name}</strong><br />
                        <small>Haz clic para enfocar</small>
                      </Popup>
                    </Polygon>
                  );
                })}
                */}

                {/* Círculos de zonas */}
                {zones.map(zone => (
                  zone.latitude && zone.longitude && (
                    <Circle
                      key={`circle-${zone.id}`}
                      center={[zone.latitude, zone.longitude]}
                      radius={5000}
                      pathOptions={{
                        color: ZONE_COLORS[zone.name] || ZONE_COLORS.default,
                        fillColor: ZONE_COLORS[zone.name] || ZONE_COLORS.default,
                        fillOpacity: 0.2
                      }}
                    >
                      <Popup>
                        <strong>{zone.name}</strong><br />
                        {zone.city_name}
                      </Popup>
                    </Circle>
                  )
                ))}

                {/* Markers de tenderos */}
                {shopkeepers.length > 0 && (() => {
                  const validShopkeepers = shopkeepers.filter(s => 
                    s.latitude >= 4.4 && s.latitude <= 4.85 && 
                    s.longitude >= -74.22 && s.longitude <= -73.95
                  );
                  console.log(`📍 Tenderos: ${validShopkeepers.length} en Bogotá / ${shopkeepers.length} total`);
                  return null;
                })()}
                {shopkeepers.map((shopkeeper, index) => {
                  // Validar que las coordenadas sean válidas para Bogotá
                  const lat = shopkeeper.latitude;
                  const lng = shopkeeper.longitude;
                  
                  // Log del primer tendero para debug
                  if (index === 0) {
                    console.log('📍 Ejemplo de tendero:', {
                      nombre: shopkeeper.name,
                      lat: lat,
                      lng: lng,
                      tipo_lat: typeof lat,
                      tipo_lng: typeof lng
                    });
                  }
                  
                  // Bogotá está aproximadamente en: lat 4.4-4.85, lng -74.22 a -73.95
                  // Filtro más estricto para excluir otras ciudades
                  const isValidLat = lat >= 4.4 && lat <= 4.85;
                  const isValidLng = lng >= -74.22 && lng <= -73.95;
                  
                  if (!isValidLat || !isValidLng) {
                    console.warn(`⚠️ Tendero fuera de Bogotá (${shopkeeper.name}):`, {
                      id: shopkeeper.id,
                      lat: lat,
                      lng: lng,
                      ciudad_probable: lat > 6 && lat < 6.5 ? 'Medellín' : lat > 3 && lat < 3.5 ? 'Cali' : 'Otra ciudad',
                      nota: 'Este tendero no se mostrará en el mapa de Bogotá'
                    });
                    return null;
                  }
                  
                  return (
                    <Marker
                      key={`marker-${shopkeeper.id}`}
                      position={[lat, lng]}
                    >
                      <Popup>
                        <strong>{shopkeeper.name}</strong><br />
                        {shopkeeper.business_name && <>{shopkeeper.business_name}<br /></>}
                        {shopkeeper.address}<br />
                        📍 Lat: {lat.toFixed(4)}, Lng: {lng.toFixed(4)}<br />
                        {shopkeeper.phone && <>📞 {shopkeeper.phone}<br /></>}
                        {shopkeeper.seller_name && (
                          <Badge bg="info">Vendedor: {shopkeeper.seller_name}</Badge>
                        )}
                      </Popup>
                    </Marker>
                  );
                })}
              </MapContainer>
            </Card.Body>
          </Card>

          {selectedSection && (
            <Card className="mt-3">
              <Card.Body>
                <div className="d-flex align-items-center">
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '8px',
                      backgroundColor: BOGOTA_SECTIONS[selectedSection].color,
                      marginRight: '15px'
                    }}
                  />
                  <div>
                    <h5 className="mb-0">{BOGOTA_SECTIONS[selectedSection].name}</h5>
                    <small className="text-muted">
                      Sección seleccionada - Las otras secciones se muestran tenues
                    </small>
                  </div>
                </div>
              </Card.Body>
            </Card>
          )}
        </Col>
      </Row>
    </Container>
  );
};

export default MapPage;
