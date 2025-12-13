# 🔧 Guía de Recuperación de Datos - Hotel Santino

## ⚠️ Situación Actual

Las reservas desaparecieron después de los cambios en el código. Necesitamos investigar y recuperar si es posible.

## 🔍 Pasos de Investigación

### 1. Verificar si hay backups en Railway

Railway tiene backups automáticos de PostgreSQL. Para verificar:

1. Ve al dashboard de Railway
2. Haz clic en el servicio **Postgres**
3. Busca la sección "Backups" o "Snapshots"
4. Si hay backups, puedes restaurar desde ahí

### 2. Verificar logs de Railway

Revisa los logs del servicio `hotel-santino-backend` para ver si hay errores:

1. En Railway Dashboard → hotel-santino-backend
2. Ve a la pestaña "Logs"
3. Busca mensajes alrededor de la hora cuando desaparecieron las reservas
4. Busca errores como:
   - "CREATE TABLE"
   - "DROP TABLE"
   - "TRUNCATE"
   - "ALTER TABLE" con errores

### 3. Verificar directamente en PostgreSQL

Conecta directamente a PostgreSQL desde Railway:

1. En Railway Dashboard → Postgres
2. Haz clic en "Connect" o "Query"
3. Ejecuta:
   ```sql
   SELECT COUNT(*) FROM reserva;
   SELECT * FROM reserva LIMIT 10;
   ```

### 4. Verificar si las reservas están en otra tabla

A veces los datos pueden estar en una tabla diferente:
```sql
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
```

## 🛠️ Cambios Realizados para Prevenir Futuros Problemas

1. **Agregado logging en startup**: Ahora se verifica cuántas reservas hay antes y después de crear tablas
2. **create_all() es seguro**: Solo crea tablas nuevas, nunca elimina datos existentes
3. **ALTER TABLE en lugar de recrear**: Todos los cambios de esquema usan ALTER TABLE, no recreación

## 📋 Qué Hacer Ahora

1. **Verificar backups de Railway** (prioridad alta)
2. **Revisar logs** para entender qué pasó
3. **Restaurar desde backup** si existe uno reciente
4. **Reportar a Railway** si fue un problema de su plataforma

## 🔒 Prevención Futura

- ✅ Agregado logging detallado en startup
- ✅ Verificaciones antes de cambios de esquema
- ✅ Uso de ALTER TABLE en lugar de recrear tablas
- ⚠️ **RECOMENDACIÓN**: Configurar backups automáticos diarios en Railway


