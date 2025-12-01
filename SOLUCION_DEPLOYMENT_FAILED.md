# 🔧 Solución: Deployment Fallido en Railway

## 🚨 Problema

El servicio `hotel-santino-backend` está fallando (Failed 24 minutes ago).

## ✅ Solución: Actualizar Root Directory

El deployment falla porque Railway está buscando el código en la ubicación antigua. Necesitas actualizar el Root Directory.

### Pasos:

1. **En Railway Dashboard:**
   - Click en el servicio `hotel-santino-backend` (el que está fallando)
   - Ve a **Settings** → **Service**
   - Busca **"Root Directory"**
   - Cambia de `/` (o lo que tenga) a: `backend/hotel-santino-backend`
   - Click **"Save"**

2. **Railway hará un nuevo deployment automáticamente:**
   - Espera 1-2 minutos
   - El estado debería cambiar a "Active" (verde)

## 🔍 Verificar Logs

Si quieres ver qué error específico está ocurriendo:

1. Click en el servicio `hotel-santino-backend`
2. Click en **"View"** (botón que aparece en la tarjeta)
3. Ve a **"Deployments"** → Último deployment
4. Revisa los logs para ver el error específico

## 📋 Checklist

- [ ] Root Directory actualizado a `backend/hotel-santino-backend`
- [ ] Nuevo deployment iniciado automáticamente
- [ ] Estado cambia a "Active" (verde)
- [ ] Logs muestran que se conecta correctamente a PostgreSQL

## 🐛 Errores Comunes

### Error: "No start command could be found"
**Causa**: Root Directory incorrecto
**Solución**: Actualizar Root Directory a `backend/hotel-santino-backend`

### Error: "Module not found"
**Causa**: requirements.txt no se encuentra
**Solución**: Verificar que Root Directory apunte a `backend/hotel-santino-backend`

### Error: "Connection to PostgreSQL failed"
**Causa**: PostgreSQL no está activo o DATABASE_URL incorrecta
**Solución**: Verificar que PostgreSQL esté activo (ya está ✅)

---

**Acción inmediata**: Actualizar Root Directory en Railway

