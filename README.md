# 🏨 Hotel Santino - Sistema de Gestión Backend

API REST completa para la gestión del Complejo Santino con FastAPI y PostgreSQL/SQLite.

## 📋 Índice

- [Características](#características)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Instalación](#instalación)
- [Configuración](#configuración)
- [Endpoints de la API](#endpoints-de-la-api)
- [Modelos de Datos](#modelos-de-datos)
- [Funcionalidades Especiales](#funcionalidades-especiales)

## ✨ Características

- ✅ **Autenticación JWT** con roles (dueño/empleado)
- ✅ **Gestión completa de habitaciones** (15 habitaciones configuradas)
- ✅ **Sistema de reservas** (web pública + sistema de gestión)
- ✅ **Gestión de clientes** con validación de DNI único
- ✅ **Sistema de pedidos** con múltiples items
- ✅ **Control de gastos adicionales**
- ✅ **Analytics y reportes** completos
- ✅ **Check-out automático** manual
- ✅ **Sistema de señas** pendientes
- ✅ **Zona horaria Argentina** (UTC-3)
- ✅ **Soporte PostgreSQL** (Railway) con fallback a SQLite

## 📁 Estructura del Proyecto

```
hotel-santino-backend/
├── hotel.py              # API principal (2004 líneas)
├── requirements.txt      # Dependencias Python
├── hotel.db             # Base de datos SQLite (local)
└── README.md            # Esta documentación
```

## 🚀 Instalación

### Desarrollo Local

#### 1. Instalar dependencias

```bash
cd hotel-santino-backend
pip install -r requirements.txt
```

#### 2. Configurar variables de entorno (opcional)

```bash
# Copiar el archivo de ejemplo
cp .env.example .env

# Editar .env con tus valores (opcional para desarrollo local)
```

#### 3. Configurar base de datos

**Opción A: SQLite (Desarrollo local - por defecto)**
- Se usa automáticamente si no hay `DATABASE_URL`
- Base de datos: `hotel.db`

**Opción B: PostgreSQL (Desarrollo local)**
- Configurar `DATABASE_URL` en `.env`
- Formato: `postgresql://usuario:password@localhost:5432/hotel_db`

#### 4. Ejecutar el servidor

```bash
uvicorn hotel:app --reload --host 0.0.0.0 --port 8000
```

### 🚀 Deployment en Railway

El proyecto está configurado para desplegarse en Railway con PostgreSQL.

**Ver documentación completa:** [DEPLOYMENT.md](../DEPLOYMENT.md)

**Configuración rápida:**
1. Conectar repositorio a Railway
2. Agregar servicio PostgreSQL (se configura `DATABASE_URL` automáticamente)
3. Agregar variable `SECRET_KEY` con valor seguro
4. Railway desplegará automáticamente

**Frontend:** Desplegado en Vercel, conectado al backend en Railway.

## ⚙️ Configuración

### Variables de Entorno

**Desarrollo Local:**
- `DATABASE_URL`: URL de conexión a PostgreSQL (opcional, por defecto usa SQLite)
- `SECRET_KEY`: Clave secreta para JWT (opcional, tiene valor por defecto para desarrollo)

**Producción (Railway):**
- `DATABASE_URL`: Se configura automáticamente al agregar PostgreSQL en Railway
- `SECRET_KEY`: **DEBE** configurarse con un valor seguro (generar con: `python -c "import secrets; print(secrets.token_urlsafe(32))"`)
- `PORT`: Se configura automáticamente por Railway

**Frontend (Vercel):**
- `VITE_API_URL` o `REACT_APP_API_URL`: URL del backend en Railway

### Configuración de Habitaciones

Ejecutar endpoint para configurar las 15 habitaciones:

```bash
POST /setup-habitaciones
```

**Habitaciones del Complejo Santino:**
- **Estándar 5 personas**: Hab. 1-4 ($90,000)
- **Estándar 4 personas**: Hab. 5 ($80,000)
- **Estándar 1-2 personas**: Hab. 6, 11 ($40k-$50k)
- **Estándar 6 personas**: Hab. 7 ($100,000)
- **Estándar 3 personas**: Hab. 8, 9 ($65,000)
- **Estándar 7 personas**: Hab. 10 ($110,000)
- **Confort 4 personas**: Hab. 12-15 ($90,000)

## 📡 Endpoints de la API

### 🔐 Autenticación

| Método | Endpoint | Descripción | Autenticación |
|--------|----------|-------------|---------------|
| POST | `/registro` | Registrar nuevo usuario | No |
| POST | `/login` | Iniciar sesión (obtener token) | No |

### 🏠 Habitaciones

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/habitaciones` | Obtener todas las habitaciones |
| POST | `/habitaciones` | Agregar nueva habitación |
| PUT | `/habitaciones/{id}` | Actualizar habitación |
| DELETE | `/habitaciones/{id}` | Eliminar habitación |
| GET | `/verificar-disponibilidad` | Verificar disponibilidad (público) |
| POST | `/setup-habitaciones` | Configurar 15 habitaciones |
| GET | `/debug/habitaciones` | Debug de habitaciones |

### 👥 Clientes

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/clientes` | Obtener todos los clientes |
| POST | `/clientes` | Crear nuevo cliente |
| PUT | `/clientes/{id}` | Actualizar cliente |
| DELETE | `/clientes/{id}` | Eliminar cliente |

### 📅 Reservas

| Método | Endpoint | Descripción | Autenticación |
|--------|----------|-------------|---------------|
| GET | `/reservas` | Obtener todas las reservas | ✅ |
| GET | `/reservas/dia` | Reservas por día específico | ✅ |
| POST | `/reservas` | Crear reserva simple | ✅ |
| POST | `/reservas-web` | Reserva desde página web | ❌ Público |
| POST | `/reservas-gestion` | Reserva desde sistema gestión | ✅ |
| PUT | `/reservas/{id}` | Editar reserva completa | ✅ |
| DELETE | `/reservas/{id}` | Eliminar reserva (solo dueño) | ✅ |
| PATCH | `/reservas/{id}/checkout` | Realizar checkout | ✅ |
| PATCH | `/reservas/{id}/pago` | Actualizar forma de pago | ✅ |
| PATCH | `/reservas/{id}/actualizar-sena` | Actualizar estado de seña | ✅ |
| GET | `/reservas/senas-pendientes` | Reservas con seña pendiente | ✅ |

### 🍽️ Pedidos

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/pedidos` | Obtener todos los pedidos (con items) |
| GET | `/pedidos/hoy` | Pedidos del día actual |
| GET | `/pedidos-dia` | Pedidos por día específico |
| POST | `/pedidos` | Registrar pedido con múltiples items |
| PUT | `/pedidos/{id}` | Actualizar pedido |
| DELETE | `/pedidos/{id}` | Eliminar pedido |

### 💰 Gastos

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/gastos` | Obtener todos los gastos |
| GET | `/gastos-dia` | Gastos por día específico |
| POST | `/gastos` | Registrar gasto adicional |
| PUT | `/gastos/{id}` | Actualizar gasto |
| DELETE | `/gastos/{id}` | Eliminar gasto |

### 📊 Analytics y Reportes

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/analytics/dashboard` | Dashboard principal con métricas |
| GET | `/analytics/ingresos-por-dia` | Ingresos diarios (últimos N días) |
| GET | `/analytics/formas-pago` | Análisis de formas de pago |
| GET | `/resumen-dia` | Resumen del día |
| GET | `/ocupacion-estadisticas` | Estadísticas de ocupación |
| GET | `/estadisticas/senas` | Estadísticas de señas |

### 🚪 Check-out Automático

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/checkout-automatico` | Ejecutar check-out manual |
| GET | `/checkout-automatico/proximos` | Próximos checkouts |
| GET | `/checkout-automatico/historial` | Historial de checkouts |
| GET | `/status-checkout` | Estado del sistema |

### 🔧 Utilidades y Debug

| Método | Endpoint | Descripción | Autenticación |
|--------|----------|-------------|---------------|
| GET | `/` | Información de la API | ❌ |
| GET | `/status` | Estado del sistema | ❌ |
| POST | `/fix-database` | Reparar base de datos | ❌ |
| POST | `/test-registrar-pedido` | Test de pedidos | ❌ |

## 📦 Modelos de Datos

### Usuario
- `id`: ID único
- `email`: Email del usuario
- `contraseña`: Hash de contraseña (bcrypt)
- `rol`: "dueño" o "empleado"

### Habitación
- `id`: ID único
- `numero`: Número de habitación
- `tipo`: "Estándar" o "Confort"
- `precio`: Precio por noche
- `capacidad`: Capacidad máxima de personas
- `descripcion`: Descripción de la habitación

### Cliente
- `id`: ID único
- `nombre`: Nombre completo
- `dni`: DNI (único)
- `celular`: Número de teléfono
- `patente`: Patente del vehículo (opcional)

### Reserva
- `id`: ID único
- `cliente_id`: ID del cliente
- `habitacion_id`: ID de la habitación
- `fecha_checkin`: Fecha de ingreso
- `fecha_checkout`: Fecha de salida
- `seña`: Monto de la seña
- `total_estadia`: Precio total
- `forma_pago`: Estado del pago
- `nombre_huesped`: Nombre del huésped

### Pedido
- `id`: ID único
- `detalle`: JSON con items del pedido
- `monto`: Monto total
- `habitacion_id`: ID de habitación (opcional)
- `externo`: Si es pedido externo
- `forma_pago`: Forma de pago
- `fecha`: Fecha del pedido

### Gasto Adicional
- `id`: ID único
- `habitacion_id`: ID de la habitación
- `descripcion`: Descripción del gasto
- `monto`: Monto del gasto
- `fecha`: Fecha del gasto

## 🎯 Funcionalidades Especiales

### 1. Sistema de Reservas Web (Público)

El endpoint `/reservas-web` permite crear reservas desde la página web sin autenticación:

- Verifica disponibilidad automáticamente
- Asigna habitación según capacidad y tipo
- Crea cliente automáticamente si no existe
- Calcula seña (50% del total)
- Soporta mascotas (+$7,000)

### 2. Sistema de Señas

- Estados: "Seña Pendiente", "Seña Recibida", "Pagado Completo", "Cancelado"
- Endpoint para ver reservas con seña pendiente
- Estadísticas de señas

### 3. Check-out Automático Manual

- Ejecución manual del check-out
- Libera habitaciones automáticamente
- Historial y próximos checkouts

### 4. Pedidos con Múltiples Items

Los pedidos pueden contener múltiples items almacenados como JSON:

```json
{
  "items": [
    {"descripcion": "Coca Cola", "cantidad": 2, "precio": 500},
    {"descripcion": "Hamburguesa", "cantidad": 1, "precio": 3000}
  ],
  "habitacion_id": 5,
  "externo": false,
  "forma_pago": "efectivo"
}
```

### 5. Zona Horaria Argentina

Todas las fechas se manejan en zona horaria de Argentina (UTC-3).

### 6. CORS Configurado

Permite todos los orígenes para desarrollo y producción.

## 🔒 Seguridad

- Autenticación JWT con expiración de 120 minutos
- Contraseñas hasheadas con bcrypt
- Validación de roles (dueño puede eliminar reservas)
- Validación de DNI único para clientes

## 📝 Notas Importantes

1. **Base de Datos**: Se usa PostgreSQL en producción (Railway) y SQLite localmente
2. **Habitaciones**: Ejecutar `/setup-habitaciones` para configurar las 15 habitaciones
3. **Check-out**: Sistema manual, ejecutar `/checkout-automatico` cuando sea necesario
4. **Señas**: El sistema maneja automáticamente el cálculo de señas (50% del total)
5. **Deployment**: Backend en Railway, Frontend en Vercel - ver [DEPLOYMENT.md](../DEPLOYMENT.md)
6. **Seguridad**: Cambiar `SECRET_KEY` en producción (usar variable de entorno en Railway)
7. **CORS**: Configurado para permitir todos los orígenes (compatible con Vercel)

## 🐛 Debug

- `/debug/habitaciones`: Ver configuración de habitaciones
- `/status`: Estado general del sistema
- `/test-registrar-pedido`: Test de pedidos

## 📞 Soporte

Para más información o problemas, revisar los logs del servidor o contactar al equipo de desarrollo.

---

**Versión**: 3.0  
**Última actualización**: 2025  
**Zona horaria**: Argentina (UTC-3)
