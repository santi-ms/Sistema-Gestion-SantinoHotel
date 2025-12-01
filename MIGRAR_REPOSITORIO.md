# 🔄 Migrar Repositorio Git a Monorepo

## 📋 Situación Actual

- **Repositorio Git**: Está en `backend/hotel-santino-backend/`
- **Repositorio remoto**: `https://github.com/santi-ms/hotel-santino-backend.git`
- **Monorepo**: `HotelGestion2/` (raíz)

## ✅ Opción 1: Mover Repositorio a la Raíz (RECOMENDADA)

Para un monorepo, el repositorio Git debe estar en la raíz.

### Pasos:

1. **Mover el .git a la raíz:**
   ```bash
   cd backend/hotel-santino-backend
   mv .git ../../.git
   ```

2. **Actualizar .gitignore en la raíz** (ya está actualizado)

3. **Agregar todos los archivos:**
   ```bash
   cd ../..  # Volver a la raíz
   git add .
   git commit -m "Reorganizar proyecto en monorepo: backend, frontend y docs"
   ```

4. **Push al repositorio:**
   ```bash
   git push origin main
   ```

### Ventajas:
- ✅ Un solo repositorio para todo el proyecto
- ✅ Ideal para monorepo
- ✅ Railway puede seguir usando el mismo repositorio

---

## ✅ Opción 2: Crear Nuevo Repositorio (Si prefieres empezar limpio)

Si prefieres un repositorio nuevo para el monorepo:

1. **Crear nuevo repositorio en GitHub:**
   - Ve a GitHub
   - New Repository
   - Nombre: `hotel-santino-monorepo` (o el que prefieras)
   - Crear

2. **Inicializar Git en la raíz:**
   ```bash
   cd HotelGestion2
   git init
   git add .
   git commit -m "Initial monorepo setup"
   git branch -M main
   git remote add origin https://github.com/tu-usuario/hotel-santino-monorepo.git
   git push -u origin main
   ```

3. **Actualizar Railway:**
   - Railway Dashboard → Tu proyecto
   - Settings → Connect GitHub Repo
   - Seleccionar el nuevo repositorio
   - Root Directory: `backend/hotel-santino-backend`

### Ventajas:
- ✅ Repositorio limpio desde cero
- ✅ Historial limpio
- ✅ Mejor para monorepo

---

## ⚠️ Opción 3: Mantener Repositorio Actual (NO RECOMENDADA)

Puedes mantener el repositorio en `backend/hotel-santino-backend/`, pero:
- ❌ No podrás versionar el frontend en el mismo repo
- ❌ No es ideal para monorepo
- ❌ Más difícil de mantener

---

## 🎯 Recomendación

**Usa la Opción 1** (mover .git a la raíz):
- Mantiene el historial
- Un solo repositorio
- Railway puede seguir usando el mismo repo
- Solo necesitas actualizar el Root Directory en Railway

---

## 📝 Pasos Detallados (Opción 1)

¿Quieres que te ayude a hacer la migración ahora?

