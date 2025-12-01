# 🚀 Guía de Deployment - Hotel Santino

## 📋 Información del Deployment

- **Backend**: Railway (Python/FastAPI)
- **Frontend**: Vercel
- **Base de Datos**: PostgreSQL (Railway)
- **URL Backend**: [Tu URL de Railway]
- **URL Frontend**: [Tu URL de Vercel]

## 🔧 Configuración en Railway

### Variables de Entorno Requeridas

En Railway, configurar las siguientes variables de entorno:

```bash
# Base de datos (se configura automáticamente al agregar PostgreSQL)
DATABASE_URL=postgresql://user:password@host:port/database

# Seguridad (IMPORTANTE: Cambiar en producción)
SECRET_KEY=tu-clave-secreta-super-segura-aqui

# Opcional: Puerto (Railway lo asigna automáticamente)
PORT=8000
```

### Pasos para Configurar en Railway

1. **Conectar Repositorio**
   - Ir a Railway Dashboard
   - New Project → Deploy from GitHub repo
   - Seleccionar el repositorio

2. **Agregar Base de Datos PostgreSQL**
   - En el proyecto, hacer clic en "New"
   - Seleccionar "Database" → "Add PostgreSQL"
   - Railway creará automáticamente la variable `DATABASE_URL`

3. **Configurar Variables de Entorno**
   - Ir a Settings → Variables
   - Agregar `SECRET_KEY` con un valor seguro
   - Verificar que `DATABASE_URL` esté configurada

4. **Configurar Build Settings**
   - Root Directory: `hotel-santino-backend`
   - Build Command: (dejar vacío, Railway detecta automáticamente)
   - Start Command: `uvicorn hotel:app --host 0.0.0.0 --port $PORT`

5. **Desplegar**
   - Railway detectará automáticamente que es Python
   - Instalará dependencias de `requirements.txt`
   - Iniciará el servidor

## 🌐 Configuración en Vercel (Frontend)

### Variables de Entorno del Frontend

En Vercel, configurar:

```bash
# URL del backend en Railway
VITE_API_URL=https://tu-backend.railway.app
# o
REACT_APP_API_URL=https://tu-backend.railway.app
```

### CORS

El backend ya está configurado para permitir todos los orígenes:
```python
allow_origins=["*"]
```

Esto permite que el frontend en Vercel se conecte sin problemas.

## 🔒 Seguridad

### ⚠️ IMPORTANTE: Cambiar SECRET_KEY

**En producción, NUNCA usar la clave por defecto.**

1. Generar una clave segura:
```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

2. Agregarla en Railway como variable de entorno:
```
SECRET_KEY=tu-clave-generada-aqui
```

### Variables Sensibles

- ✅ `DATABASE_URL`: Se configura automáticamente en Railway
- ✅ `SECRET_KEY`: **DEBE** cambiarse en producción
- ✅ Credenciales de PostgreSQL: Incluidas en `DATABASE_URL`

## 📊 Verificación del Deployment

### 1. Verificar Backend

```bash
# Verificar que el servidor esté corriendo
curl https://tu-backend.railway.app/

# Debería responder:
{
  "mensaje": "API del Hotel Santino funcionando correctamente",
  "version": "3.0",
  "status": "Conectado ✅"
}
```

### 2. Verificar Base de Datos

```bash
# Verificar estado del sistema
curl https://tu-backend.railway.app/status

# Debería mostrar estadísticas de la base de datos
```

### 3. Verificar Frontend

- Abrir la URL de Vercel
- Verificar que las peticiones al backend funcionen
- Revisar la consola del navegador para errores de CORS

## 🔄 Actualización del Deployment

### Actualizar Backend

1. Hacer push a GitHub
2. Railway detectará automáticamente los cambios
3. Reconstruirá y redesplegará automáticamente

### Actualizar Base de Datos

Si necesitas hacer cambios en el esquema:

```bash
# Llamar al endpoint de reparación
POST https://tu-backend.railway.app/fix-database
```

O ejecutar migraciones manualmente si es necesario.

## 🐛 Troubleshooting

### Problema: Error de conexión a PostgreSQL

**Solución:**
1. Verificar que `DATABASE_URL` esté configurada en Railway
2. Verificar que el servicio PostgreSQL esté activo
3. Revisar logs en Railway Dashboard

### Problema: CORS errors en el frontend

**Solución:**
- El backend ya permite todos los orígenes (`allow_origins=["*"]`)
- Verificar que la URL del backend en Vercel sea correcta
- Verificar que el backend esté accesible públicamente

### Problema: Error 500 en el backend

**Solución:**
1. Revisar logs en Railway Dashboard
2. Verificar variables de entorno
3. Verificar conexión a base de datos
4. Llamar a `/status` para diagnóstico

### Problema: Tablas no se crean

**Solución:**
```bash
# Llamar al endpoint de reparación
POST https://tu-backend.railway.app/fix-database

# O verificar que el evento startup se ejecute
# Las tablas se crean automáticamente al iniciar
```

## 📝 Checklist de Deployment

- [ ] Repositorio conectado a Railway
- [ ] Base de datos PostgreSQL agregada
- [ ] Variable `DATABASE_URL` configurada (automática)
- [ ] Variable `SECRET_KEY` configurada con valor seguro
- [ ] Backend desplegado y accesible
- [ ] Endpoint `/` responde correctamente
- [ ] Endpoint `/status` muestra estadísticas
- [ ] Frontend configurado en Vercel
- [ ] Variable de entorno `API_URL` configurada en Vercel
- [ ] Frontend puede conectarse al backend
- [ ] CORS funcionando correctamente
- [ ] Autenticación funcionando
- [ ] Base de datos operativa

## 🔗 URLs Importantes

- **Railway Dashboard**: https://railway.app
- **Vercel Dashboard**: https://vercel.com
- **Documentación Railway**: https://docs.railway.app
- **Documentación Vercel**: https://vercel.com/docs

## 📞 Soporte

Si tienes problemas con el deployment:

1. Revisar logs en Railway Dashboard
2. Verificar variables de entorno
3. Probar endpoints manualmente
4. Revisar documentación de Railway/Vercel

---

**Última actualización**: 2025  
**Versión**: 3.0

