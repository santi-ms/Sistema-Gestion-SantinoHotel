# 📡 Documentación Completa de Endpoints - Hotel Santino API

## 🔐 Autenticación

### POST `/registro`
Registrar nuevo usuario en el sistema.

**Body:**
```json
{
  "email": "usuario@ejemplo.com",
  "contraseña": "password123",
  "rol": "dueño"  // o "empleado"
}
```

**Respuesta:**
```json
{
  "mensaje": "Usuario registrado"
}
```

---

### POST `/login`
Iniciar sesión y obtener token JWT.

**Body (form-data):**
- `username`: Email del usuario
- `password`: Contraseña

**Respuesta:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

---

## 🏠 Habitaciones

### GET `/habitaciones`
Obtener todas las habitaciones.

**Headers:** `Authorization: Bearer {token}`

**Respuesta:**
```json
[
  {
    "id": 1,
    "numero": 1,
    "tipo": "Estándar",
    "precio": 90000,
    "capacidad": 5,
    "descripcion": "Habitación Estándar para 5 personas"
  }
]
```

---

### POST `/habitaciones`
Agregar nueva habitación.

**Body:**
```json
{
  "numero": 16,
  "tipo": "Confort",
  "precio": 95000,
  "capacidad": 4,
  "descripcion": "Nueva habitación confort"
}
```

---

### PUT `/habitaciones/{habitacion_id}`
Actualizar habitación existente.

**Body:** Mismo formato que POST

---

### DELETE `/habitaciones/{habitacion_id}`
Eliminar habitación.

---

### GET `/verificar-disponibilidad`
Verificar disponibilidad de habitaciones (PÚBLICO - sin autenticación).

**Query Parameters:**
- `checkin`: Fecha check-in (YYYY-MM-DD)
- `checkout`: Fecha check-out (YYYY-MM-DD)
- `huespedes`: Número de huéspedes
- `tipo_preferido`: "Estándar" o "Confort" (opcional)

**Ejemplo:**
```
GET /verificar-disponibilidad?checkin=2025-02-15&checkout=2025-02-17&huespedes=4&tipo_preferido=Confort
```

**Respuesta:**
```json
{
  "disponible": true,
  "habitaciones_libres": 3,
  "habitaciones_disponibles": [...],
  "recomendacion": {
    "habitacion_recomendada": {...}
  }
}
```

---

### POST `/setup-habitaciones`
Configurar las 15 habitaciones del Complejo Santino.

**Respuesta:**
```json
{
  "success": true,
  "mensaje": "✅ Complejo Santino - 15 habitaciones configuradas correctamente",
  "habitaciones_configuradas": 15
}
```

---

## 👥 Clientes

### GET `/clientes`
Obtener todos los clientes.

**Respuesta:**
```json
[
  {
    "id": 1,
    "nombre": "Juan Pérez",
    "dni": "12345678",
    "celular": "1234567890",
    "patente": "ABC123"
  }
]
```

---

### POST `/clientes`
Crear nuevo cliente.

**Body:**
```json
{
  "nombre": "Juan Pérez",
  "dni": "12345678",
  "celular": "1234567890",
  "patente": "ABC123"  // opcional
}
```

**Nota:** Valida que el DNI sea único.

---

### PUT `/clientes/{cliente_id}`
Actualizar cliente existente.

---

### DELETE `/clientes/{cliente_id}`
Eliminar cliente.

---

## 📅 Reservas

### GET `/reservas`
Obtener todas las reservas.

---

### GET `/reservas/dia`
Obtener reservas de un día específico.

**Query Parameters:**
- `fecha`: Fecha en formato YYYY-MM-DD

---

### POST `/reservas`
Crear reserva simple.

**Body:**
```json
{
  "habitacion_id": 1,
  "nombre_huesped": "Juan Pérez",
  "precio": 90000,
  "seña": 45000,
  "forma_pago": "efectivo",
  "fecha_checkin": "2025-02-15T00:00:00",
  "fecha_checkout": "2025-02-17T00:00:00"
}
```

---

### POST `/reservas-web` (PÚBLICO)
Crear reserva desde página web (sin autenticación).

**Body:**
```json
{
  "firstName": "Juan",
  "lastName": "Pérez",
  "email": "juan@ejemplo.com",
  "phone": "1234567890",
  "checkin": "2025-02-15",
  "checkout": "2025-02-17",
  "roomType": "Estándar",
  "guests": 4,
  "requests": "Vista al mar",
  "pet": false,
  "tipoPago": "transferencia",
  "montoSeña": 45000
}
```

**Respuesta:**
```json
{
  "success": true,
  "confirmacion": "CS00000001",
  "habitacion_asignada": {
    "numero": 5,
    "tipo": "Estándar",
    "capacidad": 4
  },
  "precio_total": 180000,
  "seña_requerida": 90000
}
```

---

### POST `/reservas-gestion`
Crear reserva desde sistema de gestión.

**Body:**
```json
{
  "nombre_completo": "Juan Pérez",
  "dni": "12345678",
  "celular": "1234567890",
  "patente": "ABC123",
  "cantidad_personas": 4,
  "habitacion_id": 5,
  "fecha_ingreso": "15/02/2025",
  "fecha_egreso": "17/02/2025",
  "precio_total": 180000,
  "seña": 90000,
  "forma_pago": "efectivo",
  "mascota": false,
  "observaciones_mascota": null
}
```

---

### PUT `/reservas/{reserva_id}`
Editar reserva completa.

**Body:**
```json
{
  "habitacion_id": 6,  // opcional
  "nombre_huesped": "Nuevo nombre",  // opcional
  "precio": 95000,  // opcional
  "seña": 47500,  // opcional
  "forma_pago": "transferencia",  // opcional
  "fecha_checkin": "2025-02-16T00:00:00",  // opcional
  "fecha_checkout": "2025-02-18T00:00:00"  // opcional
}
```

---

### DELETE `/reservas/{reserva_id}`
Eliminar reserva (solo dueño).

---

### PATCH `/reservas/{reserva_id}/checkout`
Realizar checkout de una reserva.

---

### PATCH `/reservas/{reserva_id}/pago`
Actualizar forma de pago.

**Body:**
```json
{
  "forma_pago": "efectivo"
}
```

---

### PATCH `/reservas/{reserva_id}/actualizar-sena`
Actualizar estado de seña.

**Query Parameters:**
- `estado`: "Seña Recibida", "Seña Pendiente", "Pagado Completo", "Cancelado"

---

### GET `/reservas/senas-pendientes`
Obtener reservas con seña pendiente.

**Respuesta:**
```json
{
  "total_pendientes": 5,
  "monto_total_pendiente": 450000,
  "reservas": [...]
}
```

---

## 🍽️ Pedidos

### GET `/pedidos`
Obtener todos los pedidos con items.

**Respuesta:**
```json
[
  {
    "id": 1,
    "items": [
      {
        "descripcion": "Coca Cola",
        "cantidad": 2,
        "precio": 500
      }
    ],
    "monto": 1000,
    "habitacion_id": 5,
    "externo": false,
    "forma_pago": "efectivo",
    "fecha": "2025-02-15T10:30:00"
  }
]
```

---

### GET `/pedidos/hoy`
Obtener pedidos del día actual.

---

### GET `/pedidos-dia`
Obtener pedidos de un día específico.

**Query Parameters:**
- `fecha`: YYYY-MM-DD

---

### POST `/pedidos`
Registrar pedido con múltiples items.

**Body:**
```json
{
  "items": [
    {
      "descripcion": "Coca Cola",
      "cantidad": 2,
      "precio": 500
    },
    {
      "descripcion": "Hamburguesa",
      "cantidad": 1,
      "precio": 3000
    }
  ],
  "habitacion_id": 5,
  "externo": false,
  "forma_pago": "efectivo"
}
```

---

### PUT `/pedidos/{pedido_id}`
Actualizar pedido.

---

### DELETE `/pedidos/{pedido_id}`
Eliminar pedido.

---

## 💰 Gastos

### GET `/gastos`
Obtener todos los gastos adicionales.

---

### GET `/gastos-dia`
Obtener gastos de un día específico.

**Query Parameters:**
- `fecha`: YYYY-MM-DD

---

### POST `/gastos`
Registrar gasto adicional.

**Body:**
```json
{
  "habitacion_id": 5,
  "descripcion": "Reparación de TV",
  "monto": 15000
}
```

---

### PUT `/gastos/{gasto_id}`
Actualizar gasto.

---

### DELETE `/gastos/{gasto_id}`
Eliminar gasto.

---

## 📊 Analytics y Reportes

### GET `/analytics/dashboard`
Dashboard principal con métricas del mes actual.

**Respuesta:**
```json
{
  "periodo": "February 2025",
  "total_reservas": 25,
  "total_pedidos": 150,
  "ingresos_reservas": 2250000,
  "ingresos_pedidos": 450000,
  "total_ingresos": 2700000,
  "total_gastos_monto": 300000,
  "beneficio_neto": 2400000,
  "tasa_ocupacion": 65.5,
  "habitaciones_disponibles": 15
}
```

---

### GET `/analytics/ingresos-por-dia`
Ingresos diarios para gráfico.

**Query Parameters:**
- `dias`: Número de días hacia atrás (default: 30)

**Respuesta:**
```json
[
  {
    "fecha": "2025-02-15",
    "reservas": 90000,
    "pedidos": 15000,
    "total": 105000
  }
]
```

---

### GET `/analytics/formas-pago`
Análisis de formas de pago del mes.

**Respuesta:**
```json
[
  {
    "forma_pago": "efectivo",
    "cantidad": 20,
    "monto": 1800000
  }
]
```

---

### GET `/resumen-dia`
Resumen financiero del día.

**Query Parameters:**
- `fecha`: YYYY-MM-DD

**Respuesta:**
```json
{
  "total_reservas": 90000,
  "total_pedidos": 15000,
  "total_gastos": 5000,
  "balance": 100000
}
```

---

### GET `/ocupacion-estadisticas`
Estadísticas de ocupación por rango de fechas.

**Query Parameters:**
- `fecha_inicio`: YYYY-MM-DD
- `fecha_fin`: YYYY-MM-DD

---

### GET `/estadisticas/senas`
Estadísticas sobre el estado de las señas.

**Respuesta:**
```json
{
  "total_reservas": 50,
  "senas_pendientes": 10,
  "senas_recibidas": 35,
  "monto_pendiente": 450000,
  "monto_recibido": 2250000
}
```

---

## 🚪 Check-out Automático

### POST `/checkout-automatico`
Ejecutar check-out automático manualmente.

**Respuesta:**
```json
{
  "success": true,
  "total_habitaciones_liberadas": 3,
  "habitaciones_liberadas": [...]
}
```

---

### GET `/checkout-automatico/proximos`
Obtener próximos checkouts.

**Query Parameters:**
- `dias`: Días hacia adelante (default: 3)

---

### GET `/checkout-automatico/historial`
Historial de checkouts automáticos.

**Query Parameters:**
- `dias`: Días hacia atrás (default: 7)

---

### GET `/status-checkout`
Estado del sistema de check-out.

---

## 🔧 Utilidades

### GET `/`
Información general de la API.

**Respuesta:**
```json
{
  "mensaje": "API del Hotel Santino funcionando correctamente",
  "version": "3.0",
  "fecha": "2025-02-15 10:30:00",
  "zona_horaria": "Argentina (UTC-3)",
  "status": "Conectado ✅"
}
```

---

### GET `/status`
Estado del sistema y estadísticas.

---

### POST `/fix-database`
Reparar base de datos (agregar columnas faltantes).

---

### GET `/debug/habitaciones`
Debug de configuración de habitaciones.

---

## 🔒 Autenticación

La mayoría de los endpoints requieren autenticación JWT. Incluir el token en el header:

```
Authorization: Bearer {token}
```

**Excepciones (endpoints públicos):**
- `POST /reservas-web`
- `GET /verificar-disponibilidad`
- `GET /`
- `GET /status`
- `POST /fix-database`
- `POST /test-registrar-pedido`

---

## 📝 Notas

1. Todas las fechas se manejan en zona horaria de Argentina (UTC-3)
2. Los pedidos pueden contener múltiples items almacenados como JSON
3. El sistema calcula automáticamente la seña (50% del total) en reservas web
4. Las reservas web asignan habitación automáticamente según disponibilidad
5. Solo usuarios con rol "dueño" pueden eliminar reservas

