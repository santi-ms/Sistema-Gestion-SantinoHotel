# 🏨 Hotel Santino - Monorepo Completo

Sistema completo de gestión hotelera para el Complejo Santino.

## 📁 Estructura del Monorepo

```
HotelGestion2/
├── backend/                      # Backend FastAPI
│   └── hotel-santino-backend/
│       ├── hotel.py              # API principal (2004 líneas, 49 endpoints)
│       ├── requirements.txt      # Dependencias Python
│       └── README.md            # Documentación del backend
│
├── frontend/                     # Frontend React/Vite
│   └── hotel-frontend/
│       ├── src/                  # Código fuente
│       ├── package.json          # Dependencias Node.js
│       └── README.md            # Documentación del frontend
│
└── docs/                         # Documentación compartida
    ├── DEPLOYMENT.md            # Guía de deployment
    ├── ENDPOINTS.md             # Documentación de API
    └── ...                      # Más documentación
```

## 🚀 Quick Start

### Backend

```bash
cd backend/hotel-santino-backend
pip install -r requirements.txt
uvicorn hotel:app --reload
```

### Frontend

```bash
cd frontend/hotel-frontend
npm install
npm run dev
```

## 📋 Información del Proyecto

- **Backend**: FastAPI (Python) - Desplegado en Railway
- **Frontend**: React + Vite - Desplegado en Vercel
- **Base de Datos**: PostgreSQL (Railway)
- **Autenticación**: JWT con roles (dueño/empleado)

## ✨ Características

- ✅ **49 endpoints** REST completos
- ✅ **Autenticación JWT** con roles
- ✅ **Sistema de reservas** (web pública + gestión interna)
- ✅ **Gestión de habitaciones** (15 habitaciones configuradas)
- ✅ **Sistema de pedidos** con múltiples items
- ✅ **Analytics y reportes** completos
- ✅ **Check-out automático** manual
- ✅ **Sistema de señas** pendientes
- ✅ **Zona horaria Argentina** (UTC-3)

## 📚 Documentación

- **[Backend README](backend/hotel-santino-backend/README.md)**: Documentación completa del backend
- **[Frontend README](frontend/hotel-frontend/README.md)**: Documentación del frontend
- **[Endpoints](docs/ENDPOINTS.md)**: Documentación detallada de todos los endpoints
- **[Deployment](docs/DEPLOYMENT.md)**: Guía de deployment en Railway y Vercel
- **[Estructura](docs/ESTRUCTURA_PROYECTO.md)**: Estructura detallada del proyecto

## 🔧 Configuración

### Variables de Entorno

**Backend (Railway):**
- `DATABASE_URL`: Configurada automáticamente por Railway
- `SECRET_KEY`: Configurar con valor seguro

**Frontend (Vercel):**
- `VITE_API_URL`: URL del backend en Railway

## 🚀 Deployment

- **Backend**: [Railway](https://railway.app) - Ver [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)
- **Frontend**: [Vercel](https://vercel.com)

## 📊 Estadísticas

- **Endpoints**: 49
- **Endpoints públicos**: 4
- **Modelos de datos**: 6
- **Líneas de código backend**: ~2004
- **Sistemas especiales**: 5

## 🛠️ Tecnologías

**Backend:**
- FastAPI, SQLModel, PostgreSQL/SQLite
- JWT, bcrypt para autenticación

**Frontend:**
- React, Vite
- Tailwind CSS

**Deployment:**
- Railway (Backend + PostgreSQL)
- Vercel (Frontend)

## 📞 Soporte

Para más información:
- Ver [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) para problemas de deployment
- Ver [docs/ENDPOINTS.md](docs/ENDPOINTS.md) para documentación de API
- Revisar logs en Railway Dashboard

---

**Versión**: 3.0  
**Última actualización**: 2025  
**Zona horaria**: Argentina (UTC-3)  
**Estructura**: Monorepo
