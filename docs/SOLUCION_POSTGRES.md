# 🔧 Solución: Error de Conexión a PostgreSQL en Railway

## 🚨 Problema

```
psycopg2.OperationalError: connection to server at "turntable.proxy.rlwy.net" 
failed: server closed the connection unexpectedly
```

El servidor PostgreSQL está rechazando la conexión.

## ✅ Soluciones (en orden de probabilidad)

### Solución 1: Verificar que PostgreSQL esté activo (MÁS COMÚN)

1. **En Railway Dashboard:**
   - Ve a tu proyecto
   - Busca el servicio **PostgreSQL** (no el backend)
   - Verifica que esté en estado **"Active"** (verde)
   - Si está pausado o inactivo:
     - Click en el servicio PostgreSQL
     - Click en el botón **"Start"** o **"Resume"**
     - Espera a que se active

2. **Verificar conexión:**
   - Una vez activo, el backend debería conectarse automáticamente
   - Revisa los logs del backend para confirmar

### Solución 2: Verificar que el servicio esté vinculado

1. **En Railway Dashboard:**
   - Ve a tu proyecto
   - Click en el servicio **Backend** (hotel-santino-backend)
   - Ve a **Settings** → **Variables**
   - Verifica que `DATABASE_URL` esté presente
   - Si NO está:
     - Ve al servicio PostgreSQL
     - Click en **"Connect"** o **"Add to Project"**
     - Selecciona tu servicio backend
     - Railway creará automáticamente la variable `DATABASE_URL`

### Solución 3: Regenerar DATABASE_URL

Si la conexión sigue fallando:

1. **En Railway Dashboard:**
   - Ve al servicio PostgreSQL
   - Click en **Settings** → **Variables**
   - Busca `DATABASE_URL` o `POSTGRES_URL`
   - Copia el valor completo
   - Ve al servicio Backend
   - Settings → Variables
   - Si existe `DATABASE_URL`, elimínala y créala de nuevo
   - Pega el valor copiado
   - Guarda

### Solución 4: Verificar formato de DATABASE_URL

La URL debe tener este formato:
```
postgresql://usuario:password@host:puerto/database
```

**Ejemplo correcto:**
```
postgresql://postgres:password123@turntable.proxy.rlwy.net:38203/railway
```

### Solución 5: Reiniciar ambos servicios

1. **En Railway Dashboard:**
   - Ve al servicio PostgreSQL → Click en **"Restart"**
   - Espera a que se reinicie
   - Ve al servicio Backend → Click en **"Restart"**
   - Espera a que se reinicie

## 🔍 Verificación Paso a Paso

### 1. Verificar Estado de PostgreSQL

```
Railway Dashboard
└── Tu Proyecto
    ├── PostgreSQL Service
    │   └── Estado: ✅ Active (verde)
    │   └── Si está ⏸️ Paused → Click "Start"
    │
    └── Backend Service
        └── Variables
            └── DATABASE_URL: ✅ Presente
```

### 2. Verificar Logs

1. Ve a **Deployments** → Último deployment
2. Abre los logs
3. Busca mensajes de conexión a la base de datos
4. Si ves errores, compártelos

### 3. Probar Conexión Manual

Si tienes acceso a la terminal de Railway o puedes ejecutar comandos:

```bash
# Verificar que DATABASE_URL esté configurada
echo $DATABASE_URL

# Probar conexión (si tienes psql instalado)
psql $DATABASE_URL -c "SELECT version();"
```

## 🚨 Problemas Comunes

### Problema: PostgreSQL está pausado

**Síntoma:** Servicio en estado "Paused"

**Solución:**
- Click en PostgreSQL → "Start" o "Resume"
- Railway puede pausar servicios inactivos para ahorrar recursos

### Problema: DATABASE_URL no está en el backend

**Síntoma:** Variable no existe en Variables del backend

**Solución:**
- Conectar PostgreSQL al servicio backend
- Railway debería crear la variable automáticamente

### Problema: URL incorrecta o desactualizada

**Síntoma:** La URL apunta a un servidor que ya no existe

**Solución:**
- Regenerar DATABASE_URL desde el servicio PostgreSQL
- Actualizar en el servicio backend

### Problema: Límite de conexiones alcanzado

**Síntoma:** "too many connections"

**Solución:**
- Reiniciar el servicio PostgreSQL
- Verificar que no haya conexiones huérfanas

## 📋 Checklist de Verificación

- [ ] Servicio PostgreSQL está **Active** (verde)
- [ ] Servicio Backend está **Active** (verde)
- [ ] Variable `DATABASE_URL` existe en el backend
- [ ] `DATABASE_URL` tiene formato correcto
- [ ] Ambos servicios están vinculados
- [ ] Logs no muestran errores de conexión

## 🔄 Pasos Inmediatos

1. **Verificar PostgreSQL:**
   - Railway → Tu proyecto → PostgreSQL
   - Estado debe ser "Active"
   - Si está pausado → Click "Start"

2. **Verificar Variables:**
   - Railway → Backend → Variables
   - `DATABASE_URL` debe estar presente

3. **Reiniciar Backend:**
   - Railway → Backend → Click "Restart"
   - Esperar a que se reinicie

4. **Verificar Logs:**
   - Deployments → Último deployment
   - Debe conectarse correctamente

## 💡 Nota Importante

Railway puede **pausar automáticamente** servicios PostgreSQL inactivos para ahorrar recursos. Si no has usado la base de datos en un tiempo, puede estar pausada.

**Solución:** Simplemente reactívala haciendo click en "Start".

---

**Última actualización**: 2025  
**Estado**: Solución para error de conexión PostgreSQL

