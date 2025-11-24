/**
 * Marcador animado para vendedor en movimiento
 * HU18: Tracking visual mejorado
 */
import React from 'react';
import { Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';

const AnimatedSellerMarker = ({ position, seller, speed, battery, status }) => {
  // Icono dinámico según estado
  const getIcon = () => {
    const color = status === 'active' ? 'blue' : status === 'inactive' ? 'orange' : 'red';
    const emoji = speed > 10 ? '🚚' : '🛑';
    
    return L.divIcon({
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
      className: 'animated-marker',
      iconSize: [40, 40],
      iconAnchor: [20, 20],
      popupAnchor: [0, -20]
    });
  };

  // Color del círculo de precisión
  const getCircleColor = () => {
    if (status === 'active') return '#3b82f6';
    if (status === 'inactive') return '#f59e0b';
    return '#ef4444';
  };

  return (
    <>
      <Marker position={position} icon={getIcon()}>
        <Popup>
          <div style={{ minWidth: '200px' }}>
            <strong>🚚 {seller.name}</strong>
            <hr style={{ margin: '8px 0' }} />
            <div style={{ fontSize: '14px' }}>
              <div>📱 {seller.phone}</div>
              <div>⚡ Velocidad: {speed?.toFixed(1) || 0} km/h</div>
              <div>🔋 Batería: {battery || '?'}%</div>
              <div>
                📊 Estado: 
                <span style={{
                  marginLeft: '5px',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  backgroundColor: status === 'active' ? '#dcfce7' : '#fef3c7',
                  color: status === 'active' ? '#166534' : '#92400e',
                  fontSize: '12px',
                  fontWeight: 'bold'
                }}>
                  {status === 'active' ? 'Activo' : status === 'inactive' ? 'Inactivo' : 'Offline'}
                </span>
              </div>
            </div>
          </div>
        </Popup>
      </Marker>

      {/* Círculo de precisión */}
      <Circle
        center={position}
        radius={50}
        pathOptions={{
          color: getCircleColor(),
          fillColor: getCircleColor(),
          fillOpacity: 0.1,
          weight: 2
        }}
      />
    </>
  );
};

export default AnimatedSellerMarker;