# 🔧 Solución: Error "No start command could be found" en Railway

## 🚨 Problema

Railway no encuentra el comando de inicio porque está buscando en la raíz del proyecto, pero el código está en `hotel-santino-backend/`.

## ✅ Solución: Configurar Root Directory en Railway

### Opción 1: Configurar Root Directory (RECOMENDADA)

1. **En Railway Dashboard:**
   - Ir a tu proyecto `hotel-santino-backend`
   - Click en el servicio (no en la base de datos)
   - Ir a **Settings** → **Service**
   - Buscar **Root Directory**
   - Cambiar de `/` a `hotel-santino-backend`
   - Click **Save**

2. **Verificar Variables:**
   - Ir a **Variables**
   - Asegurarse de que `DATABASE_URL` esté configurada
   - (Opcional) Agregar `SECRET_KEY` si quieres

3. **Redeploy:**
   - Railway debería detectar automáticamente los cambios
   - O hacer click en **Deploy** → **Redeploy**

### Opción 2: Usar railway.json (Ya configurado)

El archivo `railway.json` ya está configurado, pero Railway necesita saber el Root Directory.

**Pasos:**
1. Configurar Root Directory como en Opción 1
2. El `railway.json` se aplicará automáticamente

## 📝 Configuración Actual

### Archivos de Configuración

**railway.json:**
```json
{
  "deploy": {
    "startCommand": "uvicorn hotel:app --host 0.0.0.0 --port $PORT"
  }
}
```

**nixpacks.toml:**
```toml
[start]
cmd = "uvicorn hotel:app --host 0.0.0.0 --port $PORT"
```

**Procfile:**
```
web: uvicorn hotel:app --host 0.0.0.0 --port $PORT
```

## 🔍 Verificación

Después de configurar el Root Directory:

1. **Verificar Build:**
   - Debería instalar dependencias de `requirements.txt`
   - Debería encontrar `hotel.py`

2. **Verificar Start:**
   - Debería ejecutar: `uvicorn hotel:app --host 0.0.0.0 --port $PORT`
   - El servidor debería iniciar correctamente

3. **Verificar Deployment:**
   - Ir a **Deployments**
   - El último deployment debería estar en estado "Active"
   - Click en el dominio para verificar que funciona

## 🐛 Si Sigue Fallando

### Verificar Logs

1. En Railway Dashboard → **Deployments**
2. Click en el último deployment
3. Ver los logs para identificar el error específico

### Problemas Comunes

**Error: "Module not found"**
- Verificar que `requirements.txt` tenga todas las dependencias
- Verificar que el build instaló correctamente

**Error: "Port already in use"**
- Railway asigna el puerto automáticamente con `$PORT`
- No debería pasar, pero verificar que no haya otro proceso

**Error: "Database connection failed"**
- Verificar que `DATABASE_URL` esté configurada
- Verificar que el servicio PostgreSQL esté activo

## 📋 Checklist

- [ ] Root Directory configurado a `hotel-santino-backend`
- [ ] `DATABASE_URL` configurada en Variables
- [ ] Deployment exitoso
- [ ] Servidor respondiendo en el dominio de Railway
- [ ] Endpoint `/` funciona correctamente

## 🔗 Pasos Rápidos

1. Railway Dashboard → Tu servicio → Settings → Service
2. Root Directory: `hotel-santino-backend`
3. Save
4. Deploy → Redeploy (o esperar auto-deploy)
5. Verificar que funcione

---

**Última actualización**: 2025  
**Estado**: Solución aplicada

