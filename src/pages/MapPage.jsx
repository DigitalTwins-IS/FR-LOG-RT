/**
 * Página del Mapa - HU1
 * Como administrador, quiero ver ciudades y zonas en el mapa
 */
import { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, ListGroup, Badge } from 'react-bootstrap';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import { geoService, userService } from '../services/api';
import { MAP_CONFIG, ZONE_COLORS } from '../config';
import { toast } from 'react-toastify';

// Fix para iconos de Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const MapPage = () => {
  const [cities, setCities] = useState([]);
  const [zones, setZones] = useState([]);
  const [shopkeepers, setShopkeepers] = useState([]);
  const [selectedCity, setSelectedCity] = useState(null);
  const [selectedZone, setSelectedZone] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedCity) {
      loadZones(selectedCity);
    } else {
      setZones([]);
      setSelectedZone(null);
    }
  }, [selectedCity]);

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
      toast.error('Error al cargar ciudades');
      console.error(error);
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
      // Obtener vendedores de la zona
      const sellers = await userService.getSellers(zoneId);
      
      // Obtener tenderos de esos vendedores
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
            <Card.Header>
              <strong>Mapa de Cobertura</strong>
            </Card.Header>
            <Card.Body style={{ height: '70vh', padding: 0 }}>
              <MapContainer
                center={MAP_CONFIG.center}
                zoom={MAP_CONFIG.zoom}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />

                {/* Mostrar tenderos en el mapa */}
                {shopkeepers.map(shopkeeper => (
                  <Marker
                    key={shopkeeper.id}
                    position={[shopkeeper.latitude, shopkeeper.longitude]}
                  >
                    <Popup>
                      <div>
                        <strong>{shopkeeper.name}</strong><br />
                        {shopkeeper.business_name && <>{shopkeeper.business_name}<br /></>}
                        {shopkeeper.address}<br />
                        {shopkeeper.phone && <>📞 {shopkeeper.phone}<br /></>}
                        {shopkeeper.seller_name && (
                          <Badge bg="info">Vendedor: {shopkeeper.seller_name}</Badge>
                        )}
                      </div>
                    </Popup>
                  </Marker>
                ))}

                {/* Mostrar círculos de zonas */}
                {zones.map(zone => (
                  zone.latitude && zone.longitude && (
                    <Circle
                      key={zone.id}
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
              </MapContainer>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default MapPage;

