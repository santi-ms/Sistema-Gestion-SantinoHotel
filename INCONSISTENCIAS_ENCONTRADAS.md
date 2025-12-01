# ⚠️ Inconsistencias Encontradas entre Frontend y Backend

## 🔴 Problemas Críticos

### 1. **ReservasDia.jsx usa endpoint incorrecto** 🔴 CRÍTICO

**Problema**: 
- El archivo `frontend/hotel-frontend/src/ReservasDia.jsx` está usando el endpoint `/reservas` (línea 113)
- Este endpoint espera el modelo `ReservaEntrada` que **NO incluye** campos del cliente (dni, celular, patente, cantidad_personas)
- El frontend está enviando estos campos pero el backend los ignora

**Backend espera** (`/reservas`):
```python
class ReservaEntrada(BaseModel):
    habitacion_id: int
    fecha_checkin: datetime
    fecha_checkout: datetime
    precio: float
    seña: float
    forma_pago: str
    nombre_huesped: str
```

**Frontend envía**:
```javascript
{
  habitacion_id: habitacion,
  nombre_huesped: nombre,
  precio: parseFloat(precio),
  seña: parseFloat(seña) || 0,
  fecha_checkin: ingreso,  // ❌ Formato incorrecto
  fecha_checkout: egreso,  // ❌ Formato incorrecto
  forma_pago: formaPago,
  dni: dni,  // ❌ No se usa en /reservas
  patente: patente || null,  // ❌ No se usa en /reservas
  celular: celular,  // ❌ No se usa en /reservas
  cantidad_personas: parseInt(cantidadPersonas)  // ❌ No se usa en /reservas
}
```

**Solución**: 
- Cambiar a usar `/reservas-gestion` que sí acepta todos estos campos
- Convertir fechas de formato ISO (YYYY-MM-DD) a formato dd/mm/aaaa

**Endpoint correcto** (`/reservas-gestion`):
```python
class ReservaGestion(BaseModel):
    nombre_completo: str
    dni: str
    celular: str
    patente: Optional[str] = None
    cantidad_personas: int
    habitacion_id: int
    fecha_ingreso: str  # formato: "dd/mm/aaaa"
    fecha_egreso: str   # formato: "dd/mm/aaaa"
    precio_total: float
    seña: float
    forma_pago: str
    mascota: bool = False
    observaciones_mascota: Optional[str] = None
```

### 2. **Formato de fechas inconsistente** 🟡 IMPORTANTE

**Problema**:
- Frontend envía fechas en formato ISO: `"2025-01-15"` (YYYY-MM-DD)
- Backend `/reservas-gestion` espera formato: `"15/01/2025"` (dd/mm/aaaa)
- Backend `/reservas` espera `datetime` objects

**Solución**: 
- Convertir fechas antes de enviar: `ingreso.split('-').reverse().join('/')`

### 3. **RegistrarPedido.jsx no conecta con el backend** 🔴 CRÍTICO

**Problema**:
- El archivo `frontend/hotel-frontend/src/RegistrarPedido.jsx` usa datos simulados (línea 116-159)
- No hace llamadas reales al backend
- El backend tiene el endpoint `/pedidos` listo y funcional

**Código actual** (simulado):
```javascript
// Simular API call
setTimeout(() => {
  // ... código simulado
}, 1000);
```

**Solución**: 
- Reemplazar con llamada real al backend usando `API_BASE_URL` y `TOKEN_KEY`
- El backend espera:
```json
{
  "items": [
    {"descripcion": "Coca Cola", "cantidad": 2, "precio": 500}
  ],
  "habitacion_id": 5,
  "externo": false,
  "forma_pago": "efectivo"
}
```

### 4. **Falta soporte para mascotas en ReservasDia.jsx** 🟡 MENOR

**Problema**:
- El archivo `frontend/hotel-frontend/src/ReservasDia.jsx` no tiene campos para mascotas
- El backend `/reservas-gestion` sí soporta mascotas (`mascota: bool`, `observaciones_mascota: str`)
- Hay otra versión en `hotel-santino-frontend/src/ReservasDia.jsx` que SÍ tiene soporte para mascotas

**Solución**: 
- Agregar campos de mascota al formulario en `src/ReservasDia.jsx`
- O usar la versión de `hotel-santino-frontend/src/` que ya lo tiene

## 🟡 Problemas Menores

### 5. **Estructura duplicada del frontend**

**Problema**:
- Hay dos carpetas: `frontend/hotel-frontend/src/` y `frontend/hotel-frontend/hotel-santino-frontend/src/`
- La versión en `hotel-santino-frontend/src/` tiene mejor implementación (usa `/reservas-gestion` correctamente)
- La versión en `src/` tiene problemas

**Recomendación**: 
- Decidir cuál usar y eliminar la otra
- O sincronizar ambas versiones

### 6. **Endpoint `/reservas` simple no crea clientes**

**Problema**:
- El endpoint `/reservas` crea reservas con `cliente_id=0` (línea 655 del backend)
- No crea ni asocia clientes
- Esto puede causar problemas de integridad de datos

**Recomendación**: 
- No usar `/reservas` para reservas desde el sistema de gestión
- Usar siempre `/reservas-gestion` que sí crea/actualiza clientes

## ✅ Resumen de Correcciones Necesarias

1. **Cambiar ReservasDia.jsx** para usar `/reservas-gestion` en lugar de `/reservas`
2. **Convertir fechas** de formato ISO a dd/mm/aaaa antes de enviar
3. **Conectar RegistrarPedido.jsx** con el backend real
4. **Agregar soporte para mascotas** en ReservasDia.jsx (opcional pero recomendado)
5. **Decidir qué versión del frontend usar** y eliminar la duplicada

## 📋 Prioridad

1. 🔴 **Alta**: Corregir ReservasDia.jsx (endpoint y formato de fechas)
2. 🔴 **Alta**: Conectar RegistrarPedido.jsx con el backend
3. 🟡 **Media**: Agregar soporte para mascotas
4. 🟡 **Baja**: Limpiar estructura duplicada

