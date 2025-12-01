# 🔧 Configuración de Variables de Entorno

## 📋 Resumen

- **Railway (Backend)**: Tiene `DATABASE_URL` ✅
- **Vercel (Frontend)**: No tiene variables ❌ (necesita configuración)
- **Railway (Backend)**: Falta `SECRET_KEY` ⚠️ (importante para seguridad)

---

## 🚂 Railway - Variables del Backend

### Variables Actuales ✅
- `DATABASE_URL` - ✅ Configurada (PostgreSQL)

### Variables Faltantes ⚠️

#### 1. SECRET_KEY (CRÍTICO - Agregar ahora)

**¿Por qué es importante?**
- Se usa para firmar los tokens JWT
- Sin esto, la autenticación puede ser insegura
- En producción debe ser única y segura

**Cómo agregarla:**

1. **Generar una clave segura:**
   ```bash
   python -c "import secrets; print(secrets.token_urlsafe(32))"
   ```
   
   O usar este generador online: https://randomkeygen.com/

2. **En Railway:**
   - Ir a Variables
   - Click en "Add Variable"
   - Key: `SECRET_KEY`
   - Value: (pegar la clave generada)
   - Environments: "All Environments"
   - Click "Save"

**Ejemplo de clave generada:**
```
xK9mP2vQ7wR4tY8uI0oP3aS6dF9gH2jK5lM8nQ1rT4vW7xY0zA3bC6eF9gH2j
```

### Variables del Sistema (Railway las proporciona automáticamente) ✅
- `RAILWAY_PUBLIC_DOMAIN` - Dominio público del servicio
- `RAILWAY_PRIVATE_DOMAIN` - Dominio privado
- `RAILWAY_PROJECT_NAME` - Nombre del proyecto
- `RAILWAY_ENVIRONMENT_NAME` - Entorno (production)
- `RAILWAY_SERVICE_NAME` - Nombre del servicio
- `RAILWAY_PROJECT_ID` - ID del proyecto
- `RAILWAY_ENVIRONMENT_ID` - ID del entorno
- `RAILWAY_SERVICE_ID` - ID del servicio

---

## ▲ Vercel - Variables del Frontend

### Variables Necesarias ❌

Necesitas configurar la URL del backend para que el frontend se conecte.

#### 1. URL del Backend (REQUERIDA)

**Opción A: Si usas Vite (React/Vue con Vite)**

1. En Vercel Dashboard:
   - Ir a tu proyecto
   - Settings → Environment Variables
   - Click "Add New"

2. Configurar:
   - **Key**: `VITE_API_URL`
   - **Value**: `https://hotel-santino-backend-production.up.railway.app`
   - **Environments**: Seleccionar todos (Production, Preview, Development)
   - Click "Save"

**Opción B: Si usas Create React App**

1. En Vercel Dashboard:
   - Settings → Environment Variables
   - Click "Add New"

2. Configurar:
   - **Key**: `REACT_APP_API_URL`
   - **Value**: `https://hotel-santino-backend-production.up.railway.app`
   - **Environments**: Seleccionar todos
   - Click "Save"

**Opción C: Si usas Next.js**

1. En Vercel Dashboard:
   - Settings → Environment Variables
   - Click "Add New"

2. Configurar:
   - **Key**: `NEXT_PUBLIC_API_URL`
   - **Value**: `https://hotel-santino-backend-production.up.railway.app`
   - **Environments**: Seleccionar todos
   - Click "Save"

### Cómo saber qué variable usar

Revisa tu código del frontend. Busca dónde haces las peticiones al backend:

```javascript
// Si ves algo como esto:
const API_URL = import.meta.env.VITE_API_URL  // → Usa VITE_API_URL
const API_URL = process.env.REACT_APP_API_URL  // → Usa REACT_APP_API_URL
const API_URL = process.env.NEXT_PUBLIC_API_URL // → Usa NEXT_PUBLIC_API_URL
```

---

## 📝 Checklist de Configuración

### Railway (Backend) ✅/❌

- [x] `DATABASE_URL` - ✅ Ya configurada
- [ ] `SECRET_KEY` - ❌ **AGREGAR AHORA** (crítico para seguridad)

### Vercel (Frontend) ❌

- [ ] `VITE_API_URL` o `REACT_APP_API_URL` o `NEXT_PUBLIC_API_URL` - ❌ **AGREGAR** (según tu framework)

---

## 🔍 Verificación

### Verificar Backend (Railway)

1. **Verificar que el backend esté funcionando:**
   ```bash
   curl https://hotel-santino-backend-production.up.railway.app/
   ```
   
   Debería responder:
   ```json
   {
     "mensaje": "API del Hotel Santino funcionando correctamente",
     "version": "3.0",
     "status": "Conectado ✅"
   }
   ```

2. **Verificar estado del sistema:**
   ```bash
   curl https://hotel-santino-backend-production.up.railway.app/status
   ```

### Verificar Frontend (Vercel)

1. Después de agregar las variables, hacer un nuevo deployment
2. Verificar en la consola del navegador que no haya errores de CORS
3. Probar hacer login o alguna petición al backend

---

## 🚨 Problemas Comunes

### Error: "Token inválido" o problemas de autenticación

**Causa**: `SECRET_KEY` no configurada o incorrecta en Railway

**Solución**: 
1. Verificar que `SECRET_KEY` esté configurada en Railway
2. Hacer un nuevo deployment después de agregar la variable

### Error: CORS o "Failed to fetch"

**Causa**: URL del backend incorrecta en Vercel o backend no accesible

**Solución**:
1. Verificar que la URL en Vercel sea correcta: `https://hotel-santino-backend-production.up.railway.app`
2. Verificar que el backend esté funcionando (usar curl)
3. Verificar que CORS esté configurado (ya está en `allow_origins=["*"]`)

### Error: Variables de entorno no se cargan en el frontend

**Causa**: 
- Variable mal nombrada
- No se hizo nuevo deployment después de agregar la variable
- Framework no reconoce la variable

**Solución**:
1. Verificar el nombre exacto de la variable según tu framework
2. Hacer un nuevo deployment en Vercel
3. Verificar en el código que estés usando la variable correctamente

---

## 📞 Pasos Inmediatos

### 1. Railway - Agregar SECRET_KEY (5 minutos)

1. Generar clave:
   ```bash
   python -c "import secrets; print(secrets.token_urlsafe(32))"
   ```

2. En Railway → Variables → Add Variable:
   - Key: `SECRET_KEY`
   - Value: (pegar clave generada)
   - Save

3. Hacer nuevo deployment (Railway lo hace automáticamente)

### 2. Vercel - Agregar URL del Backend (3 minutos)

1. En Vercel → Settings → Environment Variables
2. Add New:
   - Key: `VITE_API_URL` (o según tu framework)
   - Value: `https://hotel-santino-backend-production.up.railway.app`
   - Environments: All
   - Save

3. Hacer nuevo deployment en Vercel

---

## 🔗 URLs Importantes

- **Backend Railway**: `https://hotel-santino-backend-production.up.railway.app`
- **Railway Dashboard**: https://railway.app
- **Vercel Dashboard**: https://vercel.com

---

**Última actualización**: 2025  
**Estado**: Railway configurado parcialmente, Vercel necesita configuración

