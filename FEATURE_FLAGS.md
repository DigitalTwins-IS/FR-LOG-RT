# Feature Flags - Control de Funcionalidades

## 📋 Descripción

Este documento explica cómo activar/desactivar funcionalidades del frontend según el sprint actual.

## 🎯 Sprint Actual: Sprint 1

### Funcionalidades Habilitadas
- ✅ **Mapa** - Visualización de ciudades, zonas y tenderos
- ✅ **Vendedores** - Gestión de vendedores y asignación a zonas
- ✅ **Tenderos** - Registro y gestión de tenderos con coordenadas

### Funcionalidades Deshabilitadas (Sprint 2)
- ❌ **Dashboard** - Métricas y KPIs del sistema
- ❌ **Reportes** - Análisis y exportación de datos

---

## 🔧 Configuración

Las feature flags se controlan en el archivo `src/config.js`:

```javascript
export const FEATURES = {
  enableDashboard: false,    // Sprint 2
  enableReports: false,       // Sprint 2
  enableMap: true,            // Sprint 1
  enableSellers: true,        // Sprint 1
  enableShopkeepers: true     // Sprint 1
};
```

---

## 🚀 Cómo Activar Features para Sprint 2

### Paso 1: Editar config.js
```javascript
export const FEATURES = {
  enableDashboard: true,     // ✅ Activar
  enableReports: true,        // ✅ Activar
  enableMap: true,
  enableSellers: true,
  enableShopkeepers: true
};
```

### Paso 2: Rebuild (si es necesario)
```bash
npm run build
```

### Paso 3: Verificar
- Dashboard debe aparecer en la barra de navegación
- Reportes debe aparecer en la barra de navegación
- Las rutas deben estar accesibles

---

## 📦 Deployment por Sprint

### Sprint 1 (Actual)
```bash
# Las features están configuradas para Sprint 1
docker build -t frontend:sprint1 .
```

### Sprint 2 (Futuro)
```bash
# Cambiar FEATURES en config.js primero
docker build -t frontend:sprint2 .
```

---

## 🎯 Ventajas de Feature Flags

1. **No perder código** - Todo está implementado, solo oculto
2. **Fácil activación** - Solo cambiar una variable
3. **Testing independiente** - Se puede probar cada feature
4. **Deployment gradual** - Activar features progresivamente
5. **Rollback rápido** - Desactivar si hay problemas

---

## 📝 Notas Importantes

- ✅ El código de Dashboard y Reports **NO se elimina**
- ✅ Solo se ocultan de la UI temporalmente
- ✅ Las rutas siguen existiendo pero no son accesibles desde la navegación
- ✅ Para Sprint 2, solo cambiar los valores de true/false

---

## 🔍 Testing de Features

### Probar Sprint 1 (Actual)
```bash
# Verificar que NO aparecen:
# - Dashboard en navbar
# - Reports en navbar

# Verificar que SÍ aparecen:
# - Mapa
# - Vendedores
# - Tenderos
```

### Probar Sprint 2 (Futuro)
```bash
# Cambiar FEATURES.enableDashboard = true
# Cambiar FEATURES.enableReports = true

# Verificar que TODO aparece en navbar
```

---

## 🤝 Recomendaciones DevOps

1. **CI/CD**: Usar variables de entorno para feature flags
2. **Testing**: Probar con features activadas/desactivadas
3. **Documentación**: Actualizar este archivo en cada sprint
4. **Rollback**: Mantener versión con features desactivadas
