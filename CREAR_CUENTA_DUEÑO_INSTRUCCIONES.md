# 👑 Crear Cuenta de Dueño - Instrucciones Simples

## ✅ El Sistema Ya Está Implementado

El sistema de roles ya está funcionando. El dueño tiene acceso a:

### 👑 Funcionalidades del Dueño

1. **Panel del Dueño** (`/dueno`):
   - Resumen del día (ingresos por reservas, pedidos, gastos, balance)
   - Selector de fecha para ver resumen de cualquier día
   - Accesos rápidos a todas las funcionalidades

2. **Analytics y Estadísticas** (`/analytics`) - **SOLO DUEÑO**:
   - Dashboard completo con gráficos
   - Ingresos por día (últimos 30 días)
   - Análisis de formas de pago
   - Ocupación de habitaciones
   - Reportes mensuales exportables

3. **Ver Todas las Reservas** (`/ver-reservas`):
   - Historial completo de reservas
   - Filtrar por fecha, estado, etc.
   - Editar y eliminar reservas (solo dueño puede eliminar)

4. **Ver Todos los Pedidos** (`/ver-pedidos`) - **SOLO DUEÑO**:
   - Todos los pedidos del restobar
   - Filtrar por fecha, tipo, forma de pago

5. **Gestionar Habitaciones** (`/agregar-habitacion`) - **SOLO DUEÑO**:
   - Agregar, editar, eliminar habitaciones
   - Configurar precios y capacidades

6. **Gestionar Clientes** (`/registrar-cliente`):
   - Ver todos los clientes
   - Agregar, editar, eliminar clientes

7. **Registrar Gastos** (`/registrar-gasto`):
   - Control de gastos operativos

8. **Configurar Precios** (`/configuracion-precios`):
   - Gestionar carta del restobar

## 🚀 Crear la Cuenta - 3 Opciones

### Opción 1: Desde el Navegador (MÁS FÁCIL) ⭐

1. **Abrir** tu navegador
2. **Ir a** la consola del desarrollador (F12 → pestaña "Console")
3. **Pegar y ejecutar** este código (cambia el email y contraseña):

```javascript
fetch('https://hotel-santino-backend-production.up.railway.app/registro', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'dueño@hotelsantino.com',  // ← CAMBIA ESTE EMAIL
    contraseña: 'admin123',  // ← CAMBIA ESTA CONTRASEÑA
    rol: 'dueño'
  })
})
.then(r => r.json())
.then(data => {
  console.log('✅ Usuario creado:', data);
  alert('¡Usuario dueño creado exitosamente!\n\nEmail: dueño@hotelsantino.com\nRol: dueño');
})
.catch(err => {
  console.error('❌ Error:', err);
  alert('Error: ' + err.message);
});
```

4. **Presionar Enter**
5. **¡Listo!** Ya puedes iniciar sesión

### Opción 2: Instalar requests y usar el script

```bash
# Instalar requests
pip install requests

# Ejecutar el script
python crear_dueño.py
```

### Opción 3: Usar Postman o curl

**POST** `https://hotel-santino-backend-production.up.railway.app/registro`

**Body (JSON):**
```json
{
  "email": "dueño@hotelsantino.com",
  "contraseña": "tu_contraseña",
  "rol": "dueño"
}
```

## 📊 Comparación: Dueño vs Empleado

| Funcionalidad | Dueño | Empleado |
|--------------|-------|----------|
| Ver reservas del día | ✅ | ✅ |
| Crear reservas | ✅ | ✅ |
| **Eliminar reservas** | ✅ | ❌ |
| Ver todas las reservas | ✅ | ✅ |
| Registrar pedidos | ✅ | ✅ |
| Ver pedidos | ✅ | ✅ |
| **Ver analytics** | ✅ | ❌ |
| **Ver estadísticas** | ✅ | ❌ |
| **Gestionar habitaciones** | ✅ | ❌ |
| Gestionar clientes | ✅ | ✅ |
| Registrar gastos | ✅ | ✅ |
| Configurar precios | ✅ | ✅ |

## 🔐 Credenciales Recomendadas

- **Email**: `dueño@hotelsantino.com` o `admin@hotelsantino.com`
- **Contraseña**: (elige una contraseña segura)
- **Rol**: `dueño` (se asigna automáticamente)

## ✅ Después de Crear la Cuenta

1. **Iniciar sesión** en el frontend con las credenciales del dueño
2. **Serás redirigido** automáticamente al panel del dueño (`/dueno`)
3. **Verás**:
   - Resumen del día con ingresos, gastos y balance
   - Botón "Ver Analytics" para ver todas las estadísticas
   - Accesos a todas las funcionalidades

## 🎯 Lo Que Puede Ver el Dueño

El dueño puede ver **TODO** lo que registra el empleado:

- ✅ Todas las reservas (historial completo)
- ✅ Todos los pedidos del restobar
- ✅ Todos los gastos registrados
- ✅ Todos los clientes
- ✅ Estadísticas y analytics completos
- ✅ Ingresos por día, mes, año
- ✅ Ocupación de habitaciones
- ✅ Formas de pago más usadas
- ✅ Balance diario, semanal, mensual

---

**¿Necesitas ayuda?** El sistema ya está completamente implementado, solo necesitas crear la cuenta usando una de las opciones arriba.

