# 🚀 Instrucciones para Deploy

## Pasos para Desplegar los Nuevos Endpoints

### 1. Revisar Cambios
```bash
cd backend/hotel-santino-backend
git diff hotel.py
```

### 2. Agregar Cambios
```bash
git add hotel.py
git add ../../ANALISIS_INTEGRACION_WHATSAPP.md  # Opcional: también el análisis
```

### 3. Hacer Commit
```bash
git commit -m "feat: Agregar endpoints para integración WhatsApp Bot

- POST /api/disponibilidad-inteligente: Busca mejor habitación disponible
- POST /api/reservas/bot: Crea reservas desde WhatsApp con estado PENDIENTE_SEÑA
- Agregado campo 'origen' a tabla Reserva para tracking
- Actualizado endpoint /fix-database para agregar columna origen"
```

### 4. Push a GitHub
```bash
git push origin main
```

### 5. Railway Desplegará Automáticamente
Si tienes Railway conectado a GitHub, detectará los cambios y hará el deploy automáticamente.

### 6. Verificar Deployment

Después del deploy, verificar que los endpoints funcionen:

```bash
# Verificar disponibilidad inteligente
curl -X POST https://tu-backend.railway.app/api/disponibilidad-inteligente \
  -H "Content-Type: application/json" \
  -d '{
    "checkin": "2025-03-01",
    "checkout": "2025-03-03",
    "personas": 4,
    "mascota": false
  }'
```

### 7. Actualizar Base de Datos (si es necesario)

Si es la primera vez que despliegas con el campo `origen`, llamar al endpoint de fix:

```bash
curl -X POST https://tu-backend.railway.app/fix-database \
  -H "Authorization: Bearer TU_TOKEN"
```

O ejecutarlo desde el panel de Railway después del deploy.

## ⚠️ Importante

- Los endpoints `/api/disponibilidad-inteligente` y `/api/reservas/bot` son **públicos** (no requieren autenticación)
- Están diseñados específicamente para integrarse con n8n + Evolution API
- El estado inicial de las reservas creadas por el bot es `"PENDIENTE_SEÑA"`

## 📋 Checklist Pre-Deploy

- [ ] Revisar cambios con `git diff`
- [ ] Verificar que no haya errores de sintaxis
- [ ] Commit de cambios
- [ ] Push a GitHub
- [ ] Verificar que Railway detecte los cambios
- [ ] Monitorear logs de Railway durante el deploy
- [ ] Verificar endpoints después del deploy
- [ ] Actualizar base de datos si es necesario


