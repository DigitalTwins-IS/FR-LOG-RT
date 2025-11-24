# 🎨 FR-LOG-RT - Frontend React

Frontend del Sistema Digital Twins construido con React, Vite, Bootstrap y Leaflet.

## 📋 **Tabla de Contenidos**

- [Descripción](#descripción)
- [Tecnologías](#tecnologías)
- [Instalación](#instalación)
- [Uso](#uso)
- [Estructura](#estructura)
- [Docker](#docker)

---

## 🎯 **Descripción**

Frontend moderno para el Sistema Digital Twins que implementa todas las Historias de Usuario:

- **HU0**: Login de administradores con JWT
- **HU1**: Visualización de ciudades y zonas en mapa interactivo
- **HU2**: Gestión de vendedores y asignación a zonas
- **HU3**: Registro de tenderos con geolocalización
- **HU4**: Actualización de datos en tiempo real
- **HU5**: Reportes y análisis con exportación
- **HU13**: Optimización de rutas para vendedores
- **HU18**: Tracking en tiempo real de vendedores con WebSockets

---

## 🛠 **Tecnologías**

- **React 18.2** - Framework UI
- **Vite 5.0** - Build tool
- **React Router 6** - Routing
- **Bootstrap 5.3** - Estilos
- **React-Bootstrap 2.9** - Componentes
- **Leaflet 1.9** - Mapas
- **React-Leaflet 4.2** - Integración mapas
- **Axios 1.6** - Cliente HTTP
- **React-Toastify 9.1** - Notificaciones
- **Chart.js 4.4** - Gráficos

---

## 🏗 **Estructura**

```
FR-LOG-RT/
├── public/                 # Archivos estáticos
├── src/
│   ├── components/         # Componentes reutilizables
│   │   ├── Navbar.jsx     # Barra de navegación
│   │   └── PrivateRoute.jsx
│   ├── context/           # Context API
│   │   └── AuthContext.jsx
│   ├── pages/             # Páginas
│   │   ├── LoginPage.jsx  # HU0
│   │   ├── DashboardPage.jsx
│   │   ├── MapPage.jsx    # HU1
│   │   ├── SellersPage.jsx  # HU2
│   │   ├── ShopkeepersPage.jsx  # HU3
│   │   ├── WorkspacePage.jsx  # HU13
│   │   └── ReportsPage.jsx  # HU5
│   ├── hooks/            # Custom hooks
│   │   ├── useWebSocketTracking.js  # HU18
│   │   └── useGeocoding.js  # HU18
│   ├── services/          # API clients
│   │   └── api.js
│   ├── config.js          # Configuración
│   ├── App.jsx            # Componente principal
│   ├── main.jsx           # Entry point
│   └── index.css          # Estilos globales
├── Dockerfile             # Containerización
├── nginx.conf             # Configuración Nginx
├── vite.config.js         # Configuración Vite
├── package.json           # Dependencias
└── README.md              # Este archivo
```

---

## 🚀 **Instalación**

### **Requisitos Previos**

- Node.js 18+
- npm o yarn
- Backend microservicios corriendo

### **Instalación Local**

```bash
cd FR-LOG-RT

# Instalar dependencias
npm install

# Copiar variables de entorno
cp env.example .env

# Editar .env con las URLs de los microservicios
nano .env
```

### **Configurar .env**

```env
VITE_API_BASE_URL=http://localhost:8080/api
VITE_MS_AUTH_URL=http://localhost:8001/api/v1/auth
VITE_MS_GEO_URL=http://localhost:8003/api/v1/geo
VITE_MS_USER_URL=http://localhost:8002/api/v1/users
VITE_MS_REPORT_URL=http://localhost:8004/api/v1/reports
VITE_WS_USER_URL=ws://localhost:8080
```

### **Iniciar Desarrollo**

```bash
npm run dev
```

La aplicación estará disponible en: **http://localhost:3000**

---

## 📱 **Páginas Implementadas**

### **1. Login (HU0)**
- Autenticación con JWT
- Validación de credenciales
- Redirección automática

### **2. Dashboard**
- Métricas generales del sistema
- KPIs principales
- Estado de salud

### **3. Mapa Interactivo (HU1)**
- Visualización de ciudades
- Zonas con colores diferenciados
- Marcadores de tenderos
- Filtros por ciudad/zona

### **4. Gestión de Vendedores (HU2, HU4)**
- Listar vendedores
- Crear nuevo vendedor
- Editar vendedor
- Asignar a zona
- Eliminar vendedor

### **5. Gestión de Tenderos (HU3, HU4)**
- Listar tenderos
- Registro con coordenadas
- Actualizar ubicación
- Asignar a vendedor
- Ver sin asignar

### **6. Optimizador de Rutas (HU13)**
- Generación de rutas optimizadas para vendedores
- Visualización en mapa interactivo
- Soporte para OpenRouteService API (distancias reales)
- Fallback a algoritmo Haversine
- Punto de inicio personalizable
- Estadísticas de ruta (distancia, tiempo estimado)
- Lista ordenada de paradas

### **7. Tracking en Tiempo Real (HU18)**
- WebSocket para actualizaciones en tiempo real
- Visualización de ubicación del vendedor en mapa
- Cálculo de distancia y ETA al tendero
- Marcadores animados
- Reconexión automática
- Indicadores de estado (activo, inactivo, offline)

### **8. Reportes (HU5)**
- Reporte de cobertura
- Rendimiento de vendedores
- Estadísticas por zona
- Exportar CSV/JSON

---

## 🎨 **Características**

### **Autenticación**
- JWT tokens
- Sesión persistente
- Logout seguro
- Rutas protegidas

### **Mapa Interactivo**
- OpenStreetMap
- Marcadores personalizados
- Popups informativos
- Círculos de zonas
- Filtros dinámicos

### **UX/UI**
- Diseño responsive
- Bootstrap components
- Notificaciones toast
- Loading states
- Error handling

### **API Integration**
- Axios interceptors
- Automatic token injection
- Error handling global
- Request/Response logging

---

## 🐳 **Docker**

### **Construir Imagen**

```bash
docker build -t fr-log-rt:latest .
```

### **Ejecutar Contenedor**

```bash
docker run -d \
  --name fr-log-rt \
  -p 3000:80 \
  fr-log-rt:latest
```

### **Con Docker Compose**

Ver `docker-compose.yml` principal del proyecto.

---

## 🧪 **Testing**

```bash
# Instalar dependencias de desarrollo
npm install --save-dev @testing-library/react

# Ejecutar tests
npm test
```

---

## 📦 **Build de Producción**

```bash
# Generar build
npm run build

# Preview del build
npm run preview
```

El build se genera en la carpeta `dist/`

---

## 🔧 **Scripts Disponibles**

| Script | Descripción |
|--------|-------------|
| `npm run dev` | Inicia servidor de desarrollo |
| `npm run build` | Genera build de producción |
| `npm run preview` | Preview del build |
| `npm run lint` | Ejecuta ESLint |

---

## 🌐 **API Endpoints Consumidos**

### **MS-AUTH-PY (8001)**
- `POST /api/v1/auth/login` - Login
- `GET /api/v1/auth/me` - Usuario actual

### **MS-GEO-PY (8003)**
- `GET /api/v1/geo/cities` - Listar ciudades
- `GET /api/v1/geo/zones` - Listar zonas

### **MS-USER-PY (8002)**
- `GET /api/v1/users/sellers` - Listar vendedores
- `POST /api/v1/users/sellers` - Crear vendedor
- `GET /api/v1/users/shopkeepers` - Listar tenderos
- `POST /api/v1/users/shopkeepers` - Crear tendero
- `POST /api/v1/users/assign` - Asignar tendero
- `GET /api/v1/users/routes/optimize` - Generar ruta optimizada (HU13)
- `POST /api/v1/users/tracking/locations` - Registrar ubicación vendedor (HU18)
- `GET /api/v1/users/tracking/locations/seller/{id}/latest` - Última ubicación (HU18)
- `WebSocket /api/v1/users/tracking/ws/track/{seller_id}/{shopkeeper_id}` - Tracking en tiempo real (HU18)

### **MS-REPORT-PY (8004)**
- `GET /api/v1/reports/metrics` - Métricas
- `GET /api/v1/reports/coverage` - Cobertura
- `POST /api/v1/reports/export` - Exportar

---

## 🤝 **Contribuir**

1. Fork el repositorio
2. Crear branch (`git checkout -b feature/nueva-funcionalidad`)
3. Commit cambios (`git commit -am 'Agregar nueva funcionalidad'`)
4. Push al branch (`git push origin feature/nueva-funcionalidad`)
5. Crear Pull Request

---

## 📄 **Licencia**

Este proyecto es parte del Sistema Digital Twins para Ingeniería de Software.

---

## 🎯 **Roadmap**

- [x] Completar páginas de Vendedores y Tenderos
- [x] Implementar optimización de rutas (HU13)
- [x] Implementar WebSockets para tracking en tiempo real (HU14)
- [ ] Implementar reportes con gráficos
- [ ] Agregar tests unitarios
- [ ] Mejorar UX del mapa
- [ ] Agregar modo oscuro

---

**Versión**: 1.0.0  
**Puerto**: 3000 (dev) / 80 (producción)  
**Última actualización**: Octubre 2025
