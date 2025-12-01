# 📁 Estructura del Proyecto - Hotel Santino

## 📂 Organización Actual

```
HotelGestion2/
├── hotel-santino-backend/          # ⭐ Backend principal
│   ├── hotel.py                    # API FastAPI (2004 líneas)
│   ├── requirements.txt            # Dependencias Python
│   ├── hotel.db                    # Base de datos SQLite (local)
│   └── README.md                   # Documentación del backend
│
├── __pycache__/                    # Cache de Python (ignorado)
│
├── .gitignore                      # Archivos a ignorar en Git
├── README.md                       # Documentación principal (si existe)
├── ENDPOINTS.md                    # Documentación completa de endpoints
├── COMPARACION_FUNCIONALIDADES.md  # Comparación de versiones
└── ESTRUCTURA_PROYECTO.md         # Este archivo
```

## 🎯 Descripción de Archivos

### Backend (`hotel-santino-backend/`)

#### `hotel.py` (2004 líneas)
**Archivo principal de la API**

**Contenido:**
- Configuración de FastAPI y CORS
- Modelos de datos (SQLModel)
- Endpoints de autenticación
- Endpoints de habitaciones
- Endpoints de clientes
- Endpoints de reservas (web + gestión)
- Endpoints de pedidos
- Endpoints de gastos
- Endpoints de analytics
- Sistema de check-out automático
- Utilidades y debug

**Características:**
- Soporte PostgreSQL (Railway) + SQLite (local)
- Zona horaria Argentina (UTC-3)
- Autenticación JWT
- 49 endpoints totales

#### `requirements.txt`
**Dependencias del proyecto**

```txt
fastapi
uvicorn
sqlmodel
passlib
python-jose[cryptography]
python-multipart
pydantic
psycopg2-binary>=2.9
```

#### `hotel.db`
**Base de datos SQLite local**

- Se usa cuando no hay `DATABASE_URL` configurada
- Se crea automáticamente al iniciar
- Contiene todas las tablas del sistema

#### `README.md`
**Documentación del backend**

- Guía de instalación
- Configuración
- Lista de endpoints
- Modelos de datos
- Funcionalidades especiales

### Documentación en Raíz

#### `ENDPOINTS.md`
**Documentación completa de todos los endpoints**

- Descripción detallada de cada endpoint
- Ejemplos de request/response
- Parámetros requeridos
- Autenticación necesaria

#### `COMPARACION_FUNCIONALIDADES.md`
**Comparación entre versiones**

- Diferencias entre versión antigua y actual
- Funcionalidades exclusivas
- Estadísticas de mejora

#### `ESTRUCTURA_PROYECTO.md`
**Este archivo**

- Descripción de la estructura
- Organización de archivos
- Guía de navegación

#### `.gitignore`
**Archivos ignorados por Git**

- Cache de Python
- Bases de datos
- Entornos virtuales
- Archivos temporales

## 🔄 Flujo de Trabajo

### Desarrollo Local
1. Trabajar en `hotel-santino-backend/hotel.py`
2. Usar SQLite local (`hotel.db`)
3. Ejecutar con `uvicorn hotel:app --reload`

### Producción (Railway)
1. Configurar `DATABASE_URL` en Railway
2. Usar PostgreSQL automáticamente
3. Desplegar código desde `hotel-santino-backend/`

## 📊 Estadísticas del Proyecto

- **Total de endpoints**: 49
- **Endpoints públicos**: 4
- **Endpoints autenticados**: 45
- **Modelos de datos**: 6 principales
- **Líneas de código**: ~2004
- **Sistemas especiales**: 5

## 🗂️ Organización de Endpoints

### Por Categoría

1. **Autenticación** (2 endpoints)
   - `/registro`, `/login`

2. **Habitaciones** (7 endpoints)
   - CRUD básico + verificación + setup + debug

3. **Clientes** (4 endpoints)
   - CRUD completo

4. **Reservas** (11 endpoints)
   - CRUD + web pública + gestión + señas + checkout

5. **Pedidos** (5 endpoints)
   - CRUD + filtros por día

6. **Gastos** (5 endpoints)
   - CRUD + filtros por día

7. **Analytics** (5 endpoints)
   - Dashboard + reportes + estadísticas

8. **Check-out Automático** (4 endpoints)
   - Ejecución + próximos + historial + estado

9. **Utilidades** (6 endpoints)
   - Status + debug + fix + test

## 🚀 Próximas Mejoras Sugeridas

### Estructura:
- [ ] Separar modelos en `models.py`
- [ ] Separar endpoints en `routes/`
- [ ] Crear `config.py` para configuración
- [ ] Crear `utils.py` para utilidades

### Documentación:
- [ ] Agregar ejemplos de uso
- [ ] Crear guía de deployment
- [ ] Documentar variables de entorno

### Testing:
- [ ] Agregar tests unitarios
- [ ] Agregar tests de integración
- [ ] Configurar CI/CD

## 📝 Notas Importantes

1. **Solo usar** `hotel-santino-backend/` como backend activo
2. **No duplicar** archivos en la raíz
3. **Mantener** `.gitignore` actualizado
4. **Documentar** cambios importantes

---

**Última actualización**: 2025  
**Versión del proyecto**: 3.0

