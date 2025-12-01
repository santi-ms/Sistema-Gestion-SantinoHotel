# ✅ Agregar Archivos del Monorepo a Git

## 🎯 Problema

GitHub Desktop muestra que hay archivos sin rastrear:
- `backend/`
- `frontend/hotel-frontend/hotel-santino-frontend/`

## ✅ Solución: Agregar Archivos

### Desde GitHub Desktop:

1. **En la pestaña "Changes"**
2. **Marca las casillas** de los archivos que quieres agregar:
   - ✅ `backend/hotel-santino-backend`
   - ✅ `frontend/hotel-frontend`
   - ✅ `docs/`
   - ✅ `README.md`
   - ✅ `railway.json`
   - ✅ `Procfile`
   - ✅ `.gitignore`
3. **Escribe un mensaje de commit**: "Reorganizar proyecto en monorepo"
4. **Click en "Commit to main"**

### O desde Terminal:

```bash
git add backend/ frontend/ docs/ README.md railway.json Procfile .gitignore
git commit -m "Reorganizar proyecto en monorepo: backend, frontend y docs"
```

## 📤 Después de Agregar

1. **Hacer Push:**
   - En GitHub Desktop, click en **"Push origin"**
   - O desde terminal: `git push origin main`

2. **Railway detectará los cambios** automáticamente y hará un nuevo deployment

## ⚠️ Nota sobre node_modules

Los `node_modules/` están en `.gitignore`, así que no se agregarán (está bien, es correcto).

---

**Acción**: Agregar los archivos marcados en GitHub Desktop y hacer commit + push

