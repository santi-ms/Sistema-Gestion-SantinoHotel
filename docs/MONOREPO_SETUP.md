# 📦 Configuración de Monorepo - Hotel Santino

## 🎯 Objetivo

Organizar el proyecto completo (frontend + backend) en un monorepo para facilitar el desarrollo y análisis conjunto.

## 📁 Estructura Propuesta

```
hotel-santino-monorepo/
├── backend/                    # Backend (FastAPI)
│   └── hotel-santino-backend/
│       ├── hotel.py
│       ├── requirements.txt
│       └── ...
│
├── frontend/                   # Frontend (React/Vue/Next.js)
│   └── hotel-frontend/
│       ├── src/
│       ├── package.json
│       └── ...
│
├── docs/                       # Documentación compartida
│   ├── DEPLOYMENT.md
│   ├── ENDPOINTS.md
│   └── ...
│
├── .gitignore                  # Git ignore para todo el proyecto
├── README.md                   # README principal
└── package.json                # (Opcional) Workspace config
```

## 🔄 Pasos para Organizar

### Opción 1: Mover carpetas a un monorepo nuevo (RECOMENDADA)

1. **Crear carpeta monorepo:**
   ```bash
   cd Desktop
   mkdir hotel-santino-monorepo
   cd hotel-santino-monorepo
   ```

2. **Mover carpetas:**
   ```bash
   # Mover backend
   mv ../HotelGestion2/hotel-santino-backend ./backend/
   
   # Mover frontend
   mv ../hotel-frontend ./frontend/
   ```

3. **Mover documentación:**
   ```bash
   # Mover docs importantes
   mv ../HotelGestion2/*.md ./docs/
   ```

### Opción 2: Usar HotelGestion2 como monorepo

1. **Crear estructura dentro de HotelGestion2:**
   ```bash
   cd HotelGestion2
   mkdir frontend
   mv ../hotel-frontend ./frontend/
   ```

2. **Reorganizar:**
   ```bash
   # Mover backend a carpeta backend
   mkdir backend
   mv hotel-santino-backend ./backend/
   ```

## ✅ Ventajas del Monorepo

- ✅ **Análisis conjunto**: Puedo ver y analizar frontend y backend juntos
- ✅ **Cambios coordinados**: Cambios en API pueden reflejarse en frontend
- ✅ **Documentación centralizada**: Toda la documentación en un lugar
- ✅ **Versionado unificado**: Un solo repositorio Git
- ✅ **Deployment coordinado**: Más fácil sincronizar deployments

## 📝 Configuración de Git

Si quieres un solo repositorio Git:

1. **Inicializar en el monorepo:**
   ```bash
   cd hotel-santino-monorepo
   git init
   ```

2. **Agregar .gitignore:**
   ```bash
   # Crear .gitignore que cubra ambos proyectos
   ```

3. **Commit inicial:**
   ```bash
   git add .
   git commit -m "Initial monorepo setup"
   ```

## 🔧 Configuración de Workspaces (Opcional)

Si usas npm/yarn, puedes configurar workspaces:

**package.json (raíz):**
```json
{
  "name": "hotel-santino-monorepo",
  "private": true,
  "workspaces": [
    "frontend/*",
    "backend/*"
  ]
}
```

## 📋 Checklist

- [ ] Crear estructura de monorepo
- [ ] Mover backend a `backend/`
- [ ] Mover frontend a `frontend/`
- [ ] Mover documentación a `docs/`
- [ ] Actualizar rutas en archivos de configuración
- [ ] Actualizar .gitignore
- [ ] Probar que ambos proyectos funcionen
- [ ] Actualizar documentación

---

**¿Quieres que te ayude a crear esta estructura ahora?**

