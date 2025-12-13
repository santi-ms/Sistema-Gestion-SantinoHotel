# 🔧 Solución: Error "column origen does not exist"

## ❌ Problema

El empleado no puede registrar reservas porque aparece el error:
```
column "origen" of relation "reserva" does not exist
```

## 🔍 Causa

1. El código del backend tiene el campo `origen` en el modelo `Reserva`
2. SQLModel intenta insertar en esa columna cuando se crea una reserva
3. Pero la columna **no existe físicamente** en la base de datos PostgreSQL en Railway
4. Por eso falla el INSERT

## ✅ Solución INMEDIATA

### Opción 1: Ejecutar endpoint fix-database (Recomendado)

El endpoint `/fix-database` ya tiene código para agregar la columna. Solo necesitas ejecutarlo:

```bash
# Hacer login primero para obtener el token
curl -X POST https://hotel-santino-backend-production.up.railway.app/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=empleado@gmail.com&password=empleado"

# Copiar el access_token del response

# Ejecutar fix-database con el token
curl -X POST https://hotel-santino-backend-production.up.railway.app/fix-database \
  -H "Authorization: Bearer TU_TOKEN_AQUI"
```

### Opción 2: Ejecutar SQL directamente en Railway

1. Ve a Railway Dashboard
2. Abre tu base de datos PostgreSQL
3. Ve a "Query" o "SQL Editor"
4. Ejecuta:

```sql
ALTER TABLE reserva ADD COLUMN IF NOT EXISTS origen TEXT;
```

## ✅ Solución PERMANENTE

Ya actualicé el código para que **automáticamente** verifique y agregue la columna `origen` cuando el servidor arranca.

**La próxima vez que se haga deploy, esto se ejecutará automáticamente.**

## 🧪 Verificar que Funcionó

Después de ejecutar la solución:

1. Intenta crear una reserva desde el frontend
2. Debería funcionar sin errores
3. Puedes verificar que la columna existe:

```sql
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'reserva' AND column_name = 'origen';
```

Debería devolver una fila con `origen`.

## 📝 Nota

La columna `origen` es opcional (puede ser NULL) y se usa para trackear desde dónde se creó la reserva:
- `"whatsapp"` - Reserva desde bot de WhatsApp
- `"web"` - Reserva desde página web
- `"gestion"` - Reserva desde sistema de gestión
- `NULL` - Reservas antiguas o sin origen definido

---

**Estado:** ✅ Solución implementada en código  
**Acción requerida:** Ejecutar `/fix-database` o SQL manual una vez

