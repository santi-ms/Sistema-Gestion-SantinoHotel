# 🤖 Motor de Estado del Bot de WhatsApp

## Descripción

Motor de estado determinístico para el chatbot de WhatsApp. El backend es el "cerebro" que recuerda el estado de cada conversación por número de teléfono y devuelve el texto de respuesta a enviar.

## Arquitectura

- **Endpoint único**: `POST /api/bot/handle-message`
- **Estado persistido**: Tabla `chat_session` en PostgreSQL
- **Lógica de negocio**: Service `app/services/bot_service.py`
- **Sin IA**: Flujo determinístico basado en estados y comandos

## Estados del Bot

1. **INICIO** - Inicio de conversación
2. **ESPERANDO_CHECKIN** - Esperando fecha de check-in
3. **ESPERANDO_CHECKOUT** - Esperando fecha de check-out
4. **ESPERANDO_PERSONAS** - Esperando número de personas
5. **ESPERANDO_MASCOTA** - Esperando si viaja con mascota
6. **MOSTRANDO_DISPONIBILIDAD** - Mostrando disponibilidad consultada
7. **ESPERANDO_CONFIRMACION** - Esperando confirmación para crear reserva
8. **DERIVADO_A_HUMANO** - Derivado a atención humana

## Endpoint

### `POST /api/bot/handle-message`

**Request:**
```json
{
  "from": "5493791234567",
  "text": "hola"
}
```

**Response:**
```json
{
  "reply": "¡Hola! 😊 ¿Para qué fecha sería el check-in? (AAAA-MM-DD)",
  "action": null
}
```

**Comportamiento:**
- Busca o crea sesión por `phone=from`
- Si `bot_pausado=true` o `estado=DERIVADO_A_HUMANO` → devuelve `{"reply": null}`
- Procesa el mensaje según el estado actual
- Actualiza estado y campos según corresponda
- Devuelve respuesta a enviar

## Comandos Especiales

### Derivar a Humano
Palabras clave: `"humano"`, `"asesor"`, `"persona"`, `"recepción"`, `"hablar con alguien"`

**Ejemplo:**
```
Usuario: "quiero hablar con un humano"
Bot: "Perfecto, ahora te atiende una persona 🙂"
Estado: DERIVADO_A_HUMANO, bot_pausado: true
```

### Reset
Palabras clave: `"reset"`, `"reiniciar"`, `"empezar de nuevo"`

**Ejemplo:**
```
Usuario: "reset"
Bot: "Listo, reiniciamos 😊 ¿Para qué fecha sería el check-in? (AAAA-MM-DD)"
Estado: INICIO, campos limpiados
```

## Flujo de Conversación

### 1. INICIO → ESPERANDO_CHECKIN
```
Usuario: "hola"
Bot: "¡Hola! 😊 ¿Para qué fecha sería el check-in? (AAAA-MM-DD)"
```

### 2. ESPERANDO_CHECKIN → ESPERANDO_CHECKOUT
```
Usuario: "2025-02-15"
Bot: "Perfecto, check-in: 2025-02-15. ¿Cuál sería la fecha de check-out? (AAAA-MM-DD)"
```

### 3. ESPERANDO_CHECKOUT → ESPERANDO_PERSONAS
```
Usuario: "2025-02-17"
Bot: "Perfecto, check-out: 2025-02-17. ¿Cuántas personas serían? (1-7)"
```

### 4. ESPERANDO_PERSONAS → ESPERANDO_MASCOTA
```
Usuario: "3"
Bot: "¿Viajás con mascota pequeña? (si/no)"
```

### 5. ESPERANDO_MASCOTA → MOSTRANDO_DISPONIBILIDAD
```
Usuario: "no"
Bot: [Consulta disponibilidad internamente]
```

### 6. MOSTRANDO_DISPONIBILIDAD → ESPERANDO_CONFIRMACION
```
Bot: "✅ Habitación disponible:
🏨 Habitación 8 (Estándar)
👥 Capacidad: 3 personas
🌙 Noches: 2
💰 Precio por noche: $65,000
💵 Total estadía: $130,000
💳 Total: $130,000

¿Querés que te la reserve? Respondé 'confirmo' para crear la reserva (queda pendiente de seña)."
```

### 7. ESPERANDO_CONFIRMACION → DERIVADO_A_HUMANO
```
Usuario: "confirmo"
Bot: "✅ Reserva creada correctamente!

Tu reserva está PENDIENTE DE SEÑA (50% del total).

💰 Seña a pagar: $65,000

💳 Datos para transferencia:
Alias: santinocasitas
CVU: 0000003100053095518930
Titular: Susana Mabel Martins

Enviame el comprobante por acá y lo confirmamos. 😊"
Estado: DERIVADO_A_HUMANO
```

## Ejemplo de Conversación Completa

```bash
# 1. Inicio
curl -X POST https://api.ejemplo.com/api/bot/handle-message \
  -H "Content-Type: application/json" \
  -d '{"from": "5493791234567", "text": "hola"}'

# Respuesta:
{
  "reply": "¡Hola! 😊 ¿Para qué fecha sería el check-in? (AAAA-MM-DD)",
  "action": null
}

# 2. Check-in
curl -X POST https://api.ejemplo.com/api/bot/handle-message \
  -H "Content-Type: application/json" \
  -d '{"from": "5493791234567", "text": "2025-02-15"}'

# Respuesta:
{
  "reply": "Perfecto, check-in: 2025-02-15. ¿Cuál sería la fecha de check-out? (AAAA-MM-DD)",
  "action": null
}

# 3. Check-out
curl -X POST https://api.ejemplo.com/api/bot/handle-message \
  -H "Content-Type: application/json" \
  -d '{"from": "5493791234567", "text": "2025-02-17"}'

# ... y así sucesivamente
```

## Integración con n8n/Evolution API

### Configuración en n8n

1. **Webhook Trigger** (recibe mensaje de Evolution API)
2. **HTTP Request** (POST a `/api/bot/handle-message`)
   - Body: `{"from": "{{$json.from}}", "text": "{{$json.text}}"}`
3. **Condition** (si `reply` no es null)
4. **HTTP Request** (envía respuesta a Evolution API)
   - Usar `reply` del response

### Ejemplo de flujo n8n:

```
Evolution API → Webhook → POST /api/bot/handle-message → Si reply != null → Evolution API Send Message
```

## Pruebas

### Con curl/Postman

```bash
# Test 1: Inicio
curl -X POST http://localhost:8000/api/bot/handle-message \
  -H "Content-Type: application/json" \
  -d '{"from": "5493791234567", "text": "hola"}'

# Test 2: Check-in válido
curl -X POST http://localhost:8000/api/bot/handle-message \
  -H "Content-Type: application/json" \
  -d '{"from": "5493791234567", "text": "2025-02-15"}'

# Test 3: Comando reset
curl -X POST http://localhost:8000/api/bot/handle-message \
  -H "Content-Type: application/json" \
  -d '{"from": "5493791234567", "text": "reset"}'
```

### Tests Unitarios

```bash
pytest tests/test_bot_service.py -v
```

## Migración de Base de Datos

Para crear la tabla `chat_session`:

```bash
alembic upgrade head
```

O si no usas Alembic, la tabla se creará automáticamente con `SQLModel.metadata.create_all()`.

## Modelo de Datos

### Tabla `chat_session`

- `id` (PK)
- `phone` (UNIQUE, INDEX) - Número de WhatsApp
- `estado` - Estado actual del bot
- `checkin` - Fecha check-in (YYYY-MM-DD)
- `checkout` - Fecha check-out (YYYY-MM-DD)
- `personas` - Número de personas
- `mascota` - Si viaja con mascota
- `reserva_id` - ID de reserva creada (nullable)
- `bot_pausado` - Si el bot está pausado
- `updated_at` - Última actualización

## Logging

El endpoint registra:
- Mensajes recibidos
- Estados anteriores y nuevos
- Respuestas generadas
- Errores

Logs se encuentran en los logs de la aplicación (stdout/stderr).

## Notas Importantes

1. **Estado persistido**: Cada número de teléfono mantiene su propio estado
2. **Sin autenticación**: El endpoint es público (protegido por n8n si es necesario)
3. **Concurrencia**: Transacciones por request para evitar inconsistencias
4. **Datos de cliente**: Actualmente usa datos temporales. En producción, el bot debería pedir nombre/DNI antes de confirmar

## Próximos Pasos

- [ ] Agregar solicitud de nombre/DNI antes de confirmar reserva
- [ ] Agregar manejo de recibos de pago
- [ ] Agregar notificaciones de recordatorio
- [ ] Integrar con IA para respuestas más naturales (opcional)

