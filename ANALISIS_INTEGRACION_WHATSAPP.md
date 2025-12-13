# 📱 Análisis Completo para Integración de Chatbot WhatsApp

## 1️⃣ STACK TECNOLÓGICO

### Framework Backend
- **FastAPI** (Python 3.x)
- Framework web asíncrono moderno

### Lenguaje
- **Python 3.x**

### ORM
- **SQLModel** (combinación de SQLAlchemy + Pydantic)
- No hay ORM tradicional separado, SQLModel maneja modelos y validación

### Base de Datos
- **SQLite** (desarrollo local: `hotel.db`)
- **PostgreSQL** (producción en Railway)
- La base de datos se selecciona automáticamente según la variable de entorno `DATABASE_URL`

### Sistema de Auth
- **JWT (JSON Web Tokens)** con `python-jose`
- OAuth2 con `OAuth2PasswordBearer`
- Endpoint de login: `POST /login`
- Endpoint de registro: `POST /registro`
- Tokens expiran en 120 minutos (`ACCESS_TOKEN_EXPIRE_MINUTES = 120`)
- Header requerido: `Authorization: Bearer {token}`

---

## 2️⃣ MODELO DE DATOS

### Tabla Principal: `Reserva`

```python
class Reserva(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    cliente_id: int                    # FK a tabla Cliente
    habitacion_id: int                 # FK a tabla Habitacion
    fecha_checkin: datetime           # Fecha de ingreso
    fecha_checkout: datetime          # Fecha de egreso
    seña: float                       # Monto de la seña
    total_estadia: float             # Precio total de la estadía
    forma_pago: str                   # Estado del pago
    nombre_huesped: Optional[str] = None  # Nombre del huésped
```

### Campos Obligatorios
- `cliente_id` (int) - **NO puede ser NULL**
- `habitacion_id` (int) - **NO puede ser NULL**
- `fecha_checkin` (datetime) - **NO puede ser NULL**
- `fecha_checkout` (datetime) - **NO puede ser NULL**
- `seña` (float) - **NO puede ser NULL** (puede ser 0)
- `total_estadia` (float) - **NO puede ser NULL**
- `forma_pago` (str) - **NO puede ser NULL**

### Estados de la Reserva
**IMPORTANTE:** El sistema NO tiene un campo `estado` explícito. Los estados se determinan por:
- **Fecha actual vs fechas de check-in/check-out** (calculado en frontend)
- **Valor del campo `forma_pago`** que puede ser:
  - `"pendiente"` - Pago pendiente
  - `"efectivo"` - Pagado en efectivo
  - `"tarjeta"` - Pagado con tarjeta
  - `"transferencia"` - Pagado por transferencia
  - `"Seña Pendiente"` - Seña pendiente de recibir
  - `"Seña Recibida"` - Seña recibida
  - `"Pendiente - Reserva Web"` - Reserva desde web sin seña confirmada

### Relación con Pagos/Señas
- **NO existe tabla separada de pagos**
- La seña se guarda directamente en `Reserva.seña` (float)
- El estado del pago se guarda en `Reserva.forma_pago` (string)
- **La reserva se confirma cuando `seña > 0`** (según lógica del frontend)
- El cálculo del 50% se hace en el frontend, el backend solo recibe el monto

### Tabla Relacionada: `Cliente`

```python
class Cliente(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    nombre: str                      # Nombre completo
    dni: str                         # DNI (único)
    celular: str                     # Número de celular
    patente: Optional[str] = None    # Patente del vehículo (opcional)
```

**Campos obligatorios en Cliente:**
- `nombre` (str) - **NO puede ser NULL**
- `dni` (str) - **NO puede ser NULL** (debe ser único)
- `celular` (str) - **NO puede ser NULL**

---

## 3️⃣ FLUJO ACTUAL DE RESERVA

### Endpoint Usado por el Frontend
**`POST /reservas-gestion`** (requiere autenticación JWT)

### Función que se Ejecuta
```python
@app.post("/reservas-gestion")
def crear_reserva_desde_gestion(data: ReservaGestion, db: Session, token: dict)
```

### Validaciones Realizadas

1. **Validación de Cliente:**
   - Busca cliente existente por DNI
   - Si existe, actualiza datos (nombre, celular, patente)
   - Si no existe, crea nuevo cliente

2. **Validación de Fechas:**
   - Convierte fechas de formato `"dd/mm/aaaa"` a `datetime`
   - Aplica zona horaria de Argentina (UTC-3)
   - **NO valida que checkout > checkin** (debe hacerse en frontend o agregarse)

3. **Validación de Habitación:**
   - **NO valida disponibilidad automáticamente** en este endpoint
   - Solo verifica que `habitacion_id` exista implícitamente (FK constraint)

4. **Validación de Seña:**
   - **NO valida que seña = 50% del total**
   - Acepta cualquier valor de `seña` que se envíe
   - Puede ser 0 (reserva sin seña)

### En qué Momento se Guarda la Seña
- La seña se guarda **directamente al crear la reserva**
- Se almacena en `Reserva.seña` (float)
- Se guarda en la misma transacción que crea la reserva

### Cómo se Calcula el 50%
- **El cálculo se hace en el FRONTEND** (no en el backend)
- El frontend calcula: `seña = precio_total * 0.5`
- El backend solo recibe el monto ya calculado
- En el endpoint `/reservas-web` (público) sí hay cálculo: `monto_sena = data.montoSeña if data.montoSeña is not None else (precio_total * 0.5)`

### Payload Completo del Endpoint

```json
{
  "nombre_completo": "Juan Pérez",
  "dni": "12345678",
  "celular": "1123456789",
  "patente": "ABC123",                    // OPCIONAL
  "cantidad_personas": 4,
  "habitacion_id": 5,
  "fecha_ingreso": "15/02/2025",          // Formato: dd/mm/aaaa
  "fecha_egreso": "17/02/2025",           // Formato: dd/mm/aaaa
  "precio_total": 180000,
  "seña": 90000,                          // 50% del precio_total
  "forma_pago": "efectivo",               // "efectivo", "tarjeta", "transferencia", "pendiente"
  "mascota": false,                       // OPCIONAL
  "observaciones_mascota": null          // OPCIONAL
}
```

---

## 4️⃣ API EXISTENTE

### Endpoints Disponibles para Reservas

#### ✅ Crear Reserva
**`POST /reservas-gestion`** (requiere autenticación)
- **Método:** POST
- **Headers:** `Authorization: Bearer {token}`
- **Payload:** Ver sección 3️⃣
- **Respuesta:**
```json
{
  "mensaje": "Reserva registrada desde sistema de gestión",
  "reserva_id": 123,
  "cliente_id": 45,
  "mascota": false,
  "precio_total": 180000
}
```

#### ✅ Actualizar Reserva
**`PUT /reservas/{reserva_id}`** (requiere autenticación)
- **Método:** PUT
- **Headers:** `Authorization: Bearer {token}`
- **Payload:**
```json
{
  "habitacion_id": 6,                    // OPCIONAL
  "nombre_huesped": "Nuevo nombre",      // OPCIONAL
  "precio": 95000,                       // OPCIONAL
  "seña": 47500,                         // OPCIONAL
  "forma_pago": "transferencia",        // OPCIONAL
  "fecha_checkin": "2025-02-16T00:00:00", // OPCIONAL (datetime ISO)
  "fecha_checkout": "2025-02-18T00:00:00" // OPCIONAL (datetime ISO)
}
```

#### ✅ Registrar/Actualizar Seña
**`PATCH /reservas/{reserva_id}/actualizar-sena`** (requiere autenticación)
- **Método:** PATCH
- **Headers:** `Authorization: Bearer {token}`
- **Query Parameters:**
  - `estado`: `"Seña Recibida"` | `"Seña Pendiente"` | `"Pagado Completo"` | `"Cancelado"`
- **Ejemplo:** `PATCH /reservas/123/actualizar-sena?estado=Seña Recibida`

#### ✅ Actualizar Forma de Pago
**`PATCH /reservas/{reserva_id}/pago`** (requiere autenticación)
- **Método:** PATCH
- **Headers:** `Authorization: Bearer {token}`
- **Payload:**
```json
{
  "forma_pago": "efectivo"
}
```

#### ✅ Obtener Reservas
**`GET /reservas`** (requiere autenticación)
- Retorna todas las reservas

**`GET /reservas/dia?fecha=2025-02-15`** (requiere autenticación)
- Retorna reservas de un día específico

#### ✅ Verificar Disponibilidad
**`GET /verificar-disponibilidad`** (PÚBLICO - sin autenticación)
- **Query Parameters:**
  - `checkin`: `"2025-02-15"` (YYYY-MM-DD)
  - `checkout`: `"2025-02-17"` (YYYY-MM-DD)
  - `huespedes`: `4` (int)
  - `tipo_preferido`: `"Estándar"` | `"Confort"` (opcional)
- **Respuesta:**
```json
{
  "disponible": true,
  "habitaciones_libres": 3,
  "habitaciones_disponibles": [...],
  "recomendacion": {
    "habitacion_recomendada": {
      "id": 5,
      "numero": 5,
      "tipo": "Estándar",
      "precio": 90000,
      "capacidad": 4
    }
  }
}
```

---

## 5️⃣ ACCESO DIRECTO A BASE DE DATOS

### ⚠️ NO RECOMENDADO
El sistema usa SQLModel/SQLAlchemy, pero **NO se recomienda acceso directo a BD** porque:
1. Se pierden las validaciones del modelo
2. Se pierden las relaciones FK
3. Se puede corromper la integridad de datos

### Tablas Involucradas
1. **`cliente`** - Datos del cliente
2. **`reserva`** - Datos de la reserva
3. **`habitacion`** - Datos de habitaciones (para verificar disponibilidad)

### Queries Críticas (solo para referencia)

**Crear Cliente:**
```sql
INSERT INTO cliente (nombre, dni, celular, patente)
VALUES ('Juan Pérez', '12345678', '1123456789', 'ABC123');
```

**Crear Reserva:**
```sql
INSERT INTO reserva (cliente_id, habitacion_id, fecha_checkin, fecha_checkout, seña, total_estadia, forma_pago, nombre_huesped)
VALUES (1, 5, '2025-02-15 00:00:00', '2025-02-17 00:00:00', 90000, 180000, 'efectivo', 'Juan Pérez');
```

**Verificar Disponibilidad:**
```sql
SELECT * FROM reserva
WHERE habitacion_id = 5
AND (
  (fecha_checkin <= '2025-02-17' AND fecha_checkout > '2025-02-15')
);
```

### Campos que NO Pueden Quedar Nulos
- `cliente_id` (int)
- `habitacion_id` (int)
- `fecha_checkin` (datetime)
- `fecha_checkout` (datetime)
- `seña` (float) - puede ser 0
- `total_estadia` (float)
- `forma_pago` (str)

---

## 6️⃣ RECOMENDACIÓN PARA EL BOT

### ¿Conviene Crear Endpoints Nuevos o Usar los Existentes?

**✅ RECOMENDACIÓN: Usar endpoints existentes con algunas mejoras**

**Razones:**
1. El endpoint `/reservas-gestion` ya tiene toda la lógica necesaria
2. Evita duplicación de código
3. Mantiene consistencia con el sistema actual

**⚠️ PROBLEMA ACTUAL:**
- El endpoint `/reservas-gestion` **requiere autenticación JWT**
- El bot de WhatsApp necesitará un token válido

### Soluciones Posibles

#### Opción A: Crear Endpoint Público Específico para Bot (RECOMENDADO)
Crear un nuevo endpoint `/reservas-whatsapp` que:
- Sea público (sin autenticación) o use API key
- Valide disponibilidad automáticamente
- Calcule el 50% de la seña automáticamente
- Use el mismo flujo que `/reservas-gestion`

#### Opción B: Usar Endpoint Existente con API Key
- Agregar autenticación por API key en lugar de JWT
- Usar el endpoint `/reservas-gestion` existente
- Requiere modificar el sistema de auth

### Endpoints Mínimos Necesarios para el Bot

1. **Crear Reserva:**
   - `POST /reservas-whatsapp` (nuevo, público con API key)
   - O `POST /reservas-gestion` (existente, requiere JWT)

2. **Verificar Disponibilidad:**
   - `GET /verificar-disponibilidad` (ya existe, público)

3. **Actualizar Seña (opcional):**
   - `PATCH /reservas/{reserva_id}/actualizar-sena` (requiere auth)

### Payload Recomendado para Crear Reserva desde WhatsApp

```json
{
  "nombre_completo": "Juan Pérez",
  "dni": "12345678",
  "celular": "5491123456789",          // Formato internacional recomendado
  "patente": "ABC123",                  // OPCIONAL
  "cantidad_personas": 4,
  "habitacion_id": 5,                   // O usar null para asignación automática
  "fecha_ingreso": "15/02/2025",        // Formato: dd/mm/aaaa
  "fecha_egreso": "17/02/2025",         // Formato: dd/mm/aaaa
  "precio_total": 180000,
  "seña": 90000,                        // 50% del precio_total
  "forma_pago": "transferencia",       // "efectivo", "tarjeta", "transferencia"
  "mascota": false,                     // OPCIONAL
  "observaciones_mascota": null,       // OPCIONAL
  "origen": "whatsapp"                  // NUEVO: para identificar origen
}
```

### Payload Recomendado para Registrar la Seña

**Opción 1: Al crear la reserva (recomendado)**
- Incluir `seña` y `forma_pago` en el payload de creación
- El backend guarda todo en una sola transacción

**Opción 2: Actualizar después (si se crea sin seña)**
```json
PATCH /reservas/{reserva_id}/actualizar-sena?estado=Seña Recibida
```

O actualizar el monto de seña:
```json
PUT /reservas/{reserva_id}
{
  "seña": 90000,
  "forma_pago": "transferencia"
}
```

---

## 7️⃣ RIESGOS Y VALIDACIONES

### Qué Cosas NO Debería Hacer el Bot

1. **❌ NO crear reservas sin verificar disponibilidad**
   - Siempre llamar a `/verificar-disponibilidad` antes de crear

2. **❌ NO crear reservas con fechas inválidas**
   - Validar que `fecha_egreso > fecha_ingreso`
   - Validar que fechas no sean en el pasado

3. **❌ NO crear reservas sin seña del 50%**
   - Si el cliente no paga seña, la reserva debe quedar como "pendiente"
   - Usar `forma_pago: "Seña Pendiente"`

4. **❌ NO asignar habitaciones manualmente sin verificar**
   - Usar el endpoint `/verificar-disponibilidad` para obtener habitación recomendada
   - O dejar que el backend asigne automáticamente (si se implementa)

5. **❌ NO modificar reservas existentes sin autorización**
   - Solo crear nuevas reservas
   - Las modificaciones deben hacerse desde el panel de gestión

6. **❌ NO crear clientes duplicados**
   - Siempre verificar si el cliente existe por DNI antes de crear

### Validaciones que Deben Mantenerse del Lado Servidor

1. **✅ Validación de DNI único**
   - El backend ya valida esto (FK constraint)

2. **✅ Validación de fechas**
   - Formato correcto: `dd/mm/aaaa`
   - Zona horaria Argentina (UTC-3)

3. **✅ Validación de disponibilidad** (debe agregarse)
   - Verificar que no haya conflictos de fechas en la habitación
   - **ACTUALMENTE NO SE VALIDA en `/reservas-gestion`**

4. **✅ Validación de habitación existente**
   - Verificar que `habitacion_id` exista en la BD

5. **✅ Validación de montos**
   - `precio_total > 0`
   - `seña >= 0` (puede ser 0 si no se paga seña)

6. **✅ Validación de formato de celular**
   - El backend NO valida formato actualmente
   - Recomendado: validar en el bot antes de enviar

### Casos que Deben Escalar a Humano

1. **🔴 Reservas con fechas muy cercanas (< 24 horas)**
   - Requiere confirmación rápida

2. **🔴 Reservas con montos muy altos (> $500,000)**
   - Puede requerir verificación de pago

3. **🔴 Clientes con múltiples reservas en el mismo período**
   - Posible error o intento de fraude

4. **🔴 Reservas con habitación específica no disponible**
   - El bot debe sugerir alternativas o escalar

5. **🔴 Reservas con mascota**
   - Verificar políticas del hotel

6. **🔴 Errores de pago o seña**
   - Si no se puede registrar la seña, escalar a humano

7. **🔴 Solicitudes fuera de horario de atención**
   - Si el bot no puede procesar, derivar a WhatsApp del hotel

---

## 📋 RESUMEN EJECUTIVO

### Endpoint Principal para el Bot
**`POST /reservas-gestion`** (requiere JWT)

### Flujo Recomendado para n8n

1. **Recibir mensaje de WhatsApp** (Evolution API)
2. **Extraer datos con IA** (n8n AI node)
3. **Verificar disponibilidad** → `GET /verificar-disponibilidad`
4. **Calcular precio total** (noches × precio por noche + mascota si aplica)
5. **Calcular seña** (50% del total)
6. **Obtener token JWT** → `POST /login` (con credenciales del bot)
7. **Crear reserva** → `POST /reservas-gestion` (con token)
8. **Confirmar al cliente** (enviar mensaje por WhatsApp)

### Variables de Entorno Necesarias
- `API_BASE_URL`: URL del backend (ej: `https://hotel-santino-backend-production.up.railway.app`)
- `BOT_EMAIL`: Email del usuario bot para autenticación
- `BOT_PASSWORD`: Contraseña del usuario bot
- `WHATSAPP_API_KEY`: API key de Evolution API (si aplica)

### Mejoras Sugeridas para el Backend

1. **Agregar validación de disponibilidad en `/reservas-gestion`**
2. **Crear endpoint público `/reservas-whatsapp` con API key**
3. **Agregar campo `origen` en Reserva para tracking**
4. **Agregar validación de formato de celular**
5. **Agregar validación de fechas (checkout > checkin)**

---

**Última actualización:** 2025-02-15  
**Versión del análisis:** 1.0


