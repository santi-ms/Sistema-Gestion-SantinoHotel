# 👑 Crear Cuenta de Dueño - Guía Rápida

## 🚀 Opción Más Rápida: Usar el Script

### 1. Ejecutar el script (requiere Python y requests)

```bash
# Instalar requests si no lo tienes
pip install requests

# Ejecutar el script
python crear_dueño.py
```

### 2. Ingresar los datos:
- Email del dueño (ej: `dueño@hotelsantino.com`)
- Contraseña
- Confirmar contraseña

### 3. ¡Listo! Ya puedes iniciar sesión

---

## 🌐 Opción 2: Usar el Navegador (Más Fácil)

1. **Abrir la consola del navegador** (F12 → Console)

2. **Ejecutar este código:**

```javascript
fetch('https://hotel-santino-backend-production.up.railway.app/registro', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'dueño@hotelsantino.com',  // ← Cambia este email
    contraseña: 'tu_contraseña_segura',  // ← Cambia esta contraseña
    rol: 'dueño'
  })
})
.then(r => r.json())
.then(data => {
  console.log('✅ Usuario creado:', data);
  alert('¡Usuario dueño creado exitosamente!');
})
.catch(err => {
  console.error('❌ Error:', err);
  alert('Error al crear usuario: ' + err.message);
});
```

3. **Cambiar el email y contraseña** en el código
4. **Presionar Enter**
5. **¡Listo!** Ya puedes iniciar sesión

---

## 📱 Opción 3: Usar Postman o Similar

**POST** `https://hotel-santino-backend-production.up.railway.app/registro`

**Headers:**
```
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "email": "dueño@hotelsantino.com",
  "contraseña": "tu_contraseña_segura",
  "rol": "dueño"
}
```

---

## ✅ Después de Crear la Cuenta

1. **Iniciar sesión** en el frontend con las credenciales del dueño
2. **Serás redirigido** automáticamente al panel del dueño (`/dueno`)
3. **Verás todas las funcionalidades** disponibles

## 👑 Funcionalidades del Dueño

El dueño puede ver y hacer **TODO**:

- ✅ **Panel del Dueño**: Resumen del día (ingresos, gastos, balance)
- ✅ **Analytics**: Dashboard completo con gráficos y estadísticas
- ✅ **Ver todas las reservas**: Historial completo
- ✅ **Ver todos los pedidos**: Pedidos del restobar
- ✅ **Gestionar habitaciones**: Agregar, editar, eliminar
- ✅ **Gestionar clientes**: Base de datos completa
- ✅ **Eliminar reservas**: Solo el dueño puede eliminar
- ✅ **Ver estadísticas**: Ingresos, ocupación, formas de pago

## 🔐 Credenciales Recomendadas

- **Email**: `dueño@hotelsantino.com` o `admin@hotelsantino.com`
- **Contraseña**: (elige una contraseña segura)
- **Rol**: `dueño` (se asigna automáticamente)

---

**¿Necesitas ayuda?** Revisa `CREAR_CUENTA_DUEÑO.md` para más detalles.

