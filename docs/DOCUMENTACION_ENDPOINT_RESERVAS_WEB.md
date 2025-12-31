# Documentación Técnica: Endpoint POST /reservas-web

## Información General

- **Endpoint**: `POST /reservas-web`
- **Autenticación**: ❌ **Público** (no requiere token)
- **Base URL**: Depende de la configuración del servidor (ej: `http://localhost:8000` o `https://api.hotel.com`)

---

## Modelo de Datos: ReservaWeb

El endpoint utiliza el modelo `ReservaWeb` definido en el backend:

```227:241:backend/hotel-santino-backend/hotel.py
class ReservaWeb(BaseModel):
    firstName: str
    lastName: str
    email: str
    phone: str
    checkin: str  # formato: "2025-01-15"
    checkout: str # formato: "2025-01-16"
    roomType: str
    guests: int
    requests: Optional[str] = None
    pet: bool = False
    # NUEVOS CAMPOS PARA MANEJAR LA SEÑA
    tipoPago: Optional[str] = "transferencia"  # Tipo de pago desde el frontend
    montoSeña: Optional[float] = None  # Monto de la seña calculado en el frontend
```

---

## Request Body (JSON)

### Campos Obligatorios

| Campo | Tipo | Descripción | Ejemplo |
|-------|------|-------------|---------|
| `firstName` | `string` | Nombre del huésped | `"Juan"` |
| `lastName` | `string` | Apellido del huésped | `"Pérez"` |
| `email` | `string` | Email del huésped | `"juan@ejemplo.com"` |
| `phone` | `string` | Teléfono del huésped | `"1234567890"` |
| `checkin` | `string` | Fecha de check-in | `"2025-02-15"` |
| `checkout` | `string` | Fecha de check-out | `"2025-02-17"` |
| `roomType` | `string` | Tipo de habitación preferida | `"Estándar"` o `"Confort"` |
| `guests` | `number` (integer) | Número de huéspedes | `4` |

### Campos Opcionales

| Campo | Tipo | Valor por Defecto | Descripción | Ejemplo |
|-------|------|-------------------|-------------|---------|
| `requests` | `string` \| `null` | `null` | Solicitudes especiales o comentarios | `"Vista al mar"` |
| `pet` | `boolean` | `false` | Indica si viajan con mascota | `true` |
| `tipoPago` | `string` \| `null` | `"transferencia"` | Tipo de pago seleccionado | `"transferencia"` |
| `montoSeña` | `number` (float) \| `null` | `null` | Monto de la seña calculado en frontend | `45000.0` |

---

## Validaciones y Reglas

### Formato de Fechas

- **Formato requerido**: `YYYY-MM-DD` (ISO 8601, solo fecha)
- **Ejemplos válidos**:
  - `"2025-02-15"`
  - `"2025-12-31"`
- **Ejemplos inválidos**:
  - `"15/02/2025"` ❌
  - `"2025-2-15"` ❌ (debe tener ceros a la izquierda)
  - `"2025-02-15T10:30:00"` ❌ (solo fecha, sin hora)

El backend convierte las fechas usando:
```python
fecha_checkin = datetime.strptime(data.checkin, "%Y-%m-%d").replace(tzinfo=ARGENTINA_TZ)
fecha_checkout = datetime.strptime(data.checkout, "%Y-%m-%d").replace(tzinfo=ARGENTINA_TZ)
```

### Valores Permitidos para `roomType`

El sistema acepta los siguientes valores (case-sensitive):

- `"Estándar"` ✅
- `"Confort"` ✅

**Nota**: Si se envía un valor diferente, el sistema lo ignorará y buscará cualquier habitación disponible sin filtrar por tipo.

```2238:2238:backend/hotel-santino-backend/hotel.py
        tipo_preferido = data.roomType if data.roomType in ["Estándar", "Confort"] else None
```

### Valores Permitidos para `tipoPago`

Aunque el campo es opcional y acepta cualquier string, el comportamiento del sistema es:

- Si `tipoPago == "transferencia"`: El estado de pago se establece como `"Seña Pendiente"`
- Si `tipoPago` es cualquier otro valor o `null`: El estado de pago se establece como `"Pendiente - Reserva Web"`

```2306:2310:backend/hotel-santino-backend/hotel.py
        # Establecer estado según el tipo de pago
        if data.tipoPago == "transferencia":
            estado_pago = "Seña Pendiente"
        else:
            estado_pago = "Pendiente - Reserva Web"
```

### Cálculo de Seña

- Si se envía `montoSeña`, se usa ese valor
- Si `montoSeña` es `null` o no se envía, se calcula automáticamente como el **50% del precio total**

```2304:2304:backend/hotel-santino-backend/hotel.py
        monto_sena = data.montoSeña if data.montoSeña is not None else (precio_total * 0.5)
```

### Costo de Mascota

Si `pet: true`, se agregan **$7.000** al precio total:

```2298:2300:backend/hotel-santino-backend/hotel.py
        if data.pet:
            precio_total += 7000
            print(f"🐾 Costo de mascota agregado: +$7.000")
```

---

## Ejemplo de Request

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
  "requests": "Vista al mar, por favor",
  "pet": false,
  "tipoPago": "transferencia",
  "montoSeña": 45000
}
```

---

## Response (Respuesta Exitosa)

### Estructura de la Respuesta

```2344:2366:backend/hotel-santino-backend/hotel.py
        return {
            "success": True,
            "mensaje": "Reserva confirmada y habitación asignada automáticamente",
            "confirmacion": numero_confirmacion,
            "habitacion_asignada": {
                "numero": habitacion_recomendada["numero"],
                "tipo": habitacion_recomendada["tipo"],
                "capacidad": habitacion_recomendada["capacidad"]
            },
            "precio_total": precio_total,
            "precio_por_noche": precio_por_noche,
            "seña_requerida": monto_sena,  # ✅ DEVUELVE EL MONTO DE SEÑA
            "estado_pago": estado_pago,  # ✅ DEVUELVE EL ESTADO
            "noches": noches,
            "checkin": data.checkin,
            "checkout": data.checkout,
            "huespedes": data.guests,
            "cliente": nombre_completo,
            "reserva_id": reserva.id,
            "cliente_id": cliente.id,
            "mascota": data.pet,
            "tipo_pago": data.tipoPago
        }
```

### Campos de la Respuesta

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `success` | `boolean` | Indica si la reserva se creó exitosamente (`true`) |
| `mensaje` | `string` | Mensaje descriptivo del resultado |
| `confirmacion` | `string` | **Número de confirmación** en formato `CS{id:08d}` (ej: `"CS00000001"`) |
| `habitacion_asignada` | `object` | Información de la habitación asignada automáticamente |
| `habitacion_asignada.numero` | `number` (integer) | Número de la habitación |
| `habitacion_asignada.tipo` | `string` | Tipo de habitación (`"Estándar"` o `"Confort"`) |
| `habitacion_asignada.capacidad` | `number` (integer) | Capacidad máxima de la habitación |
| `precio_total` | `number` (float) | Precio total de la estadía (incluye mascota si aplica) |
| `precio_por_noche` | `number` (float) | Precio por noche de la habitación |
| `seña_requerida` | `number` (float) | Monto de la seña requerida |
| `estado_pago` | `string` | Estado del pago (`"Seña Pendiente"` o `"Pendiente - Reserva Web"`) |
| `noches` | `number` (integer) | Número de noches calculadas |
| `checkin` | `string` | Fecha de check-in (formato `YYYY-MM-DD`) |
| `checkout` | `string` | Fecha de check-out (formato `YYYY-MM-DD`) |
| `huespedes` | `number` (integer) | Número de huéspedes |
| `cliente` | `string` | Nombre completo del cliente (`firstName + " " + lastName`) |
| `reserva_id` | `number` (integer) | ID interno de la reserva en la base de datos |
| `cliente_id` | `number` (integer) | ID interno del cliente en la base de datos |
| `mascota` | `boolean` | Indica si la reserva incluye mascota |
| `tipo_pago` | `string` | Tipo de pago enviado en el request |

### Ejemplo de Respuesta Exitosa

```json
{
  "success": true,
  "mensaje": "Reserva confirmada y habitación asignada automáticamente",
  "confirmacion": "CS00000001",
  "habitacion_asignada": {
    "numero": 5,
    "tipo": "Estándar",
    "capacidad": 4
  },
  "precio_total": 180000,
  "precio_por_noche": 90000,
  "seña_requerida": 90000,
  "estado_pago": "Seña Pendiente",
  "noches": 2,
  "checkin": "2025-02-15",
  "checkout": "2025-02-17",
  "huespedes": 4,
  "cliente": "Juan Pérez",
  "reserva_id": 1,
  "cliente_id": 1,
  "mascota": false,
  "tipo_pago": "transferencia"
}
```

---

## Response (Respuesta de Error)

### Error: No hay disponibilidad

**Status Code**: `200` (aunque técnicamente es un error, el endpoint devuelve 200)

```json
{
  "success": false,
  "error": "No hay habitaciones disponibles para 4 huéspedes del 2025-02-15 al 2025-02-17",
  "alternativas": "Por favor selecciona otras fechas o contacta al hotel"
}
```

```2248:2253:backend/hotel-santino-backend/hotel.py
        if not disponibilidad["disponible"]:
            return {
                "success": False,
                "error": f"No hay habitaciones disponibles para {data.guests} huéspedes del {data.checkin} al {data.checkout}",
                "alternativas": "Por favor selecciona otras fechas o contacta al hotel"
            }
```

### Error: Formato de fecha inválido

**Status Code**: `400 Bad Request`

```json
{
  "detail": "Formato de fecha inválido: time data '2025-2-15' does not match format '%Y-%m-%d'"
}
```

```2230:2235:backend/hotel-santino-backend/hotel.py
        try:
            fecha_checkin = datetime.strptime(data.checkin, "%Y-%m-%d").replace(tzinfo=ARGENTINA_TZ)
            fecha_checkout = datetime.strptime(data.checkout, "%Y-%m-%d").replace(tzinfo=ARGENTINA_TZ)
        except ValueError as e:
            print(f"❌ Error en formato de fechas: {e}")
            raise HTTPException(status_code=400, detail=f"Formato de fecha inválido: {e}")
```

---

## Comportamiento del Endpoint

### 1. Verificación de Disponibilidad

El endpoint verifica automáticamente la disponibilidad de habitaciones para las fechas y número de huéspedes solicitados. Si se especifica un `roomType`, intenta asignar una habitación de ese tipo, pero si no hay disponibilidad, puede asignar otra habitación disponible.

### 2. Asignación Automática de Habitación

El sistema asigna automáticamente una habitación disponible que cumpla con los requisitos (fechas, capacidad, tipo preferido si está disponible).

### 3. Creación/Actualización de Cliente

- Si el cliente ya existe (por teléfono o nombre), se reutiliza el cliente existente
- Si no existe, se crea un nuevo cliente con:
  - `nombre`: `firstName + " " + lastName`
  - `dni`: `"WEB-{últimos 8 dígitos del teléfono}"` (ej: `"WEB-12345678"`)
  - `celular`: El teléfono enviado
  - `patente`: `null`

### 4. Cálculo de Precios

- **Precio base**: `precio_por_noche * número_de_noches`
- **Costo de mascota**: Si `pet: true`, se suma $7.000
- **Precio total**: Suma de precio base + costo de mascota
- **Seña**: 50% del precio total (o el valor enviado en `montoSeña`)

### 5. Número de Confirmación

El número de confirmación se genera en formato: `CS{reserva_id:08d}`

Ejemplos:
- Reserva ID 1 → `"CS00000001"`
- Reserva ID 123 → `"CS00000123"`
- Reserva ID 9999 → `"CS00009999"`

```2331:2331:backend/hotel-santino-backend/hotel.py
        numero_confirmacion = f"CS{reserva.id:08d}"
```

---

## Notas Importantes

1. **Endpoint Público**: No requiere autenticación, por lo que puede ser llamado directamente desde la página web.

2. **Validación de Fechas**: El sistema valida que las fechas estén en el formato correcto, pero no valida que `checkout` sea posterior a `checkin` (aunque el cálculo de noches maneja esto internamente).

3. **Mínimo de Noches**: Si el cálculo resulta en 0 o menos noches, se establece automáticamente en 1 noche.

4. **Cliente Automático**: El sistema crea o reutiliza clientes automáticamente, no es necesario crear el cliente por separado.

5. **Habitación Automática**: La habitación se asigna automáticamente según disponibilidad, no es necesario especificar un `habitacion_id`.

---

## Ubicación del Código

- **Endpoint**: `backend/hotel-santino-backend/hotel.py` (líneas 2221-2376)
- **Modelo**: `backend/hotel-santino-backend/hotel.py` (líneas 227-241)
- **Documentación adicional**: `docs/ENDPOINTS.md` (líneas 216-250)

