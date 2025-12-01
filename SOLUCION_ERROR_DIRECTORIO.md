# 🔧 Solución: "No such file or directory" en Railway

## 🚨 Error

```
Error: Failed to read app source directory
Caused by: No such file or directory (os error 2)
```

## 🔍 Causa

Railway no encuentra el código en la ruta `backend/hotel-santino-backend` porque:
- Los archivos del monorepo no están en GitHub, O
- La estructura en GitHub es diferente

## ✅ Solución: Dos Opciones

### Opción 1: Root Directory = `/` (RECOMENDADA)

Si el `railway.json` ya tiene el comando correcto con `cd backend/hotel-santino-backend`, puedes dejar Root Directory en `/`:

1. **En Railway Dashboard:**
   - Settings → Service
   - **Root Directory**: Cambiar a `/` (raíz)
   - Guardar

2. **Railway usará el `railway.json`** que ya tiene:
   ```json
   "startCommand": "cd backend/hotel-santino-backend && uvicorn hotel:app ..."
   ```

### Opción 2: Subir archivos a GitHub

Si prefieres usar Root Directory = `backend/hotel-santino-backend`:

1. **Verificar qué archivos faltan:**
   ```bash
   git status
   git ls-files
   ```

2. **Agregar archivos del monorepo:**
   ```bash
   git add backend/ railway.json Procfile
   git commit -m "Agregar estructura de monorepo"
   git push origin main
   ```

3. **Verificar en GitHub** que la estructura sea:
   ```
   hotel-santino-backend/
   ├── backend/
   │   └── hotel-santino-backend/
   │       ├── hotel.py
   │       └── requirements.txt
   ├── railway.json
   └── Procfile
   ```

## 🎯 Recomendación

**Usa la Opción 1** (Root Directory = `/`):
- Más simple
- No necesitas subir archivos nuevos
- El `railway.json` ya tiene el comando correcto

---

**Acción inmediata**: Cambiar Root Directory a `/` en Railway

