# 🗄️ Configuración de Base de Datos - Railway y Vercel

## 📋 Situación Actual

- **Backend**: Railway (hotel-santino-backend)
- **Frontend**: Vercel
- **PostgreSQL**: Vercel (no en Railway)

## ⚠️ Problema

El backend en Railway está intentando conectarse a PostgreSQL, pero la base de datos está en Vercel. Tienes dos opciones:

---

## ✅ Opción 1: Agregar PostgreSQL en Railway (RECOMENDADA)

Esta es la mejor opción porque:
- Backend y base de datos en la misma plataforma
- Más rápido y confiable
- Configuración automática

### Pasos:

1. **En Railway Dashboard:**
   - Ve a tu proyecto `hotel-santino-backend`
   - Click en **"New"** o **"+"**
   - Selecciona **"Database"** → **"Add PostgreSQL"**
   - Railway creará automáticamente un servicio PostgreSQL

2. **Railway configurará automáticamente:**
   - Creará la variable `DATABASE_URL` en tu servicio backend
   - Vinculará ambos servicios
   - Todo funcionará automáticamente

3. **Verificar:**
   - Ve a **Variables** en tu servicio backend
   - Deberías ver `DATABASE_URL` con la nueva URL de PostgreSQL
   - El backend se conectará automáticamente

### Ventajas:
- ✅ Configuración automática
- ✅ Backend y DB en la misma plataforma
- ✅ Más rápido
- ✅ Sin configuración manual

---

## ✅ Opción 2: Usar PostgreSQL de Vercel en Railway

Si prefieres usar la base de datos de Vercel:

### Pasos:

1. **Obtener URL de PostgreSQL de Vercel:**
   - Ve a Vercel Dashboard
   - Tu proyecto → **Storage** o **Database**
   - Busca el servicio PostgreSQL
   - Copia la **Connection String** o **DATABASE_URL**
   - Formato: `postgresql://usuario:password@host:puerto/database`

2. **Configurar en Railway:**
   - Ve a Railway → Tu proyecto → Servicio Backend
   - **Settings** → **Variables**
   - Click **"Add Variable"**
   - **Key**: `DATABASE_URL`
   - **Value**: (pegar la URL de Vercel)
   - **Environments**: All Environments
   - Click **"Save"**

3. **Verificar conexión:**
   - Railway hará un nuevo deployment
   - Revisa los logs para verificar que se conecta

### Consideraciones:
- ⚠️ Latencia entre Railway (US) y Vercel (puede variar)
- ⚠️ Configuración manual
- ⚠️ Dependes de dos plataformas

---

## 🔍 Cómo Obtener la URL de PostgreSQL de Vercel

### Método 1: Desde Vercel Dashboard

1. Ve a **Vercel Dashboard**
2. Tu proyecto → **Storage** o **Database**
3. Click en el servicio **PostgreSQL**
4. Busca **"Connection String"** o **"DATABASE_URL"**
5. Copia la URL completa

### Método 2: Desde Variables de Entorno

1. Ve a **Vercel Dashboard**
2. Tu proyecto → **Settings** → **Environment Variables**
3. Busca `DATABASE_URL` o `POSTGRES_URL`
4. Copia el valor

### Formato de la URL:

```
postgresql://usuario:password@host:puerto/database?sslmode=require
```

---

## 📝 Recomendación

**Usa la Opción 1 (PostgreSQL en Railway)** porque:
- Es más simple
- Configuración automática
- Mejor rendimiento
- Backend y DB juntos

La base de datos de Vercel puede quedarse para el frontend si la necesita, pero el backend debería tener su propia base de datos en Railway.

---

## 🔄 Migración de Datos (Si es necesario)

Si tienes datos importantes en PostgreSQL de Vercel y quieres migrarlos a Railway:

1. **Exportar datos de Vercel:**
   ```bash
   pg_dump $DATABASE_URL_VERCEL > backup.sql
   ```

2. **Importar a Railway:**
   ```bash
   psql $DATABASE_URL_RAILWAY < backup.sql
   ```

O usar herramientas de migración de bases de datos.

---

## ✅ Checklist

### Opción 1 (PostgreSQL en Railway):
- [ ] Agregar PostgreSQL en Railway
- [ ] Verificar que `DATABASE_URL` se creó automáticamente
- [ ] Backend se conecta correctamente
- [ ] Probar endpoints

### Opción 2 (PostgreSQL de Vercel):
- [ ] Obtener URL de PostgreSQL de Vercel
- [ ] Agregar `DATABASE_URL` en Railway con la URL de Vercel
- [ ] Verificar conexión en logs
- [ ] Probar endpoints

---

**Última actualización**: 2025  
**Recomendación**: Usar Opción 1 (PostgreSQL en Railway)

