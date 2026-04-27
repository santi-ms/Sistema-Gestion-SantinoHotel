---
title: "Overview"
source:
  - "*.md"
  - "package.json"
  - "pnpm-workspace.yaml"
  - "turbo.json"
  - "*.config.*"
generated: true
lastSync:
  sourceCommit: "9fb0313ae99103344e50066b4e39e116462e422a"
  docHash: "36597998c452"
---
## Descripción general

Este repositorio contiene el frontend de una aplicación de gestión hotelera. El código vive en `frontend/hotel-frontend` y está construido con React, empaquetado con Vite y estilizado con Tailwind CSS.

## Estructura del repositorio

```
frontend/
  hotel-frontend/   # Aplicación React principal
docs/               # Documentación del proyecto
```

## Tech stack

| Categoría | Tecnologías |
|-----------|-------------|
| UI | React, React DOM, React Router DOM |
| Estilos | Tailwind CSS, PostCSS, Autoprefixer |
| Gráficos | Recharts |
| Iconos | Lucide React |
| HTTP | Axios |
| Build | Vite, `@vitejs/plugin-react` |
| Linting | ESLint, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh` |

## Primeros pasos

```bash
cd frontend/hotel-frontend
npm install
npm run dev
```

Vite levanta el servidor de desarrollo en `http://localhost:5173` por defecto.

Para generar un build de producción:

```bash
npm run build
```

Los archivos compilados quedan en `frontend/hotel-frontend/dist`.

## Estado de la documentación

El índice de archivos del repositorio no está disponible en esta revisión (`9fb0313`). Las secciones de arquitectura, rutas y componentes se completarán a medida que se indexe el código fuente.
