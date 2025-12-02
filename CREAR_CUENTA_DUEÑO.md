# 👑 Crear Cuenta de Dueño

## 📋 Opciones para Crear la Cuenta

Hay **3 formas** de crear la cuenta del dueño:

### Opción 1: Usar el Script Python (RECOMENDADA) 🎯

1. **Ejecutar el script desde el backend:**
   ```bash
   cd backend/hotel-santino-backend
   python crear_usuario_dueño.py
   ```

2. **Ingresar los datos:**
   - Email del dueño
   - Contraseña

3. **Listo!** Ya puedes iniciar sesión

### Opción 2: Usar el Endpoint `/registro` (API)

**Desde Postman, curl, o cualquier cliente HTTP:**

```bash
POST https://hotel-santino-backend-production.up.railway.app/registro
Content-Type: application/json

{
  "email": "dueño@hotelsantino.com",
  "contraseña": "tu_contraseña_segura",
  "rol": "dueño"
}
```

**O desde el navegador (consola JavaScript):**
```javascript
fetch('https://hotel-santino-backend-production.up.railway.app/registro', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'dueño@hotelsantino.com',
    contraseña: 'tu_contraseña_segura',
    rol: 'dueño'
  })
})
.then(r => r.json())
.then(console.log);
```

### Opción 3: Crear desde el Frontend (Futuro)

Podrías agregar una página de registro en el frontend, pero por ahora usa una de las opciones anteriores.

## 🔐 Credenciales Recomendadas

**Email:** `dueño@hotelsantino.com` o `admin@hotelsantino.com`
**Contraseña:** (elige una contraseña segura)
**Rol:** `dueño`

## 👑 Funcionalidades del Dueño

El dueño tiene acceso a **TODO**:

### ✅ Panel del Dueño (`/dueno`)
- Ver resumen del día (ingresos, gastos, balance)
- Ver todas las estadísticas
- Gestionar todo el sistema

### ✅ Analytics y Reportes (`/analytics`)
- Dashboard completo con gráficos
- Ingresos por día
- Análisis de formas de pago
- Ocupación de habitaciones
- Reportes mensuales

### ✅ Gestión Completa
- Ver todas las reservas
- Ver todos los pedidos
- Gestionar habitaciones
- Gestionar clientes
- Registrar gastos
- Configurar precios

### ✅ Funcionalidades Exclusivas del Dueño
- Eliminar reservas (solo dueño)
- Ver analytics completos
- Acceso a todas las estadísticas

## 📊 Comparación: Dueño vs Empleado

| Funcionalidad | Dueño | Empleado |
|--------------|-------|----------|
| Ver reservas del día | ✅ | ✅ |
| Crear reservas | ✅ | ✅ |
| Eliminar reservas | ✅ | ❌ |
| Ver todas las reservas | ✅ | ✅ |
| Registrar pedidos | ✅ | ✅ |
| Ver pedidos | ✅ | ✅ |
| Ver analytics | ✅ | ❌ |
| Ver estadísticas | ✅ | ❌ |
| Gestionar habitaciones | ✅ | ❌ |
| Gestionar clientes | ✅ | ✅ |
| Registrar gastos | ✅ | ✅ |
| Configurar precios | ✅ | ✅ |

## 🚀 Después de Crear la Cuenta

1. **Iniciar sesión** en el frontend con las credenciales del dueño
2. **Serás redirigido** al panel del dueño (`/dueno`)
3. **Verás todas las funcionalidades** disponibles

## ⚠️ Nota de Seguridad

- **Nunca compartas** las credenciales del dueño
- Usa una **contraseña segura**
- El dueño tiene acceso completo al sistema

