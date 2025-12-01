# 📱 Configurar GitHub Desktop con Monorepo

## 🔍 Situación

Después de reorganizar el proyecto en monorepo, GitHub Desktop ya no detecta el repositorio.

## ✅ Solución: Agregar Repositorio en GitHub Desktop

### Opción 1: Agregar desde la Raíz (RECOMENDADA)

Si el `.git` está en la raíz (`HotelGestion2/`):

1. **Abrir GitHub Desktop**
2. **File → Add Local Repository**
3. **Browse** y seleccionar la carpeta: `C:\Users\santi\Desktop\HotelGestion2`
4. Click **"Add Repository"**

### Opción 2: Agregar desde Backend

Si el `.git` está en `backend/hotel-santino-backend/`:

1. **Abrir GitHub Desktop**
2. **File → Add Local Repository**
3. **Browse** y seleccionar: `C:\Users\santi\Desktop\HotelGestion2\backend\hotel-santino-backend`
4. Click **"Add Repository"**

## 🔍 Verificar Ubicación del Repositorio

Para saber dónde está el repositorio Git:

```bash
# Desde la raíz (HotelGestion2)
git rev-parse --show-toplevel
```

Esto te dirá la ruta exacta del repositorio.

## 📝 Después de Agregar

Una vez agregado en GitHub Desktop:

1. **Verás todos los archivos** del monorepo
2. **Puedes hacer commit y push** normalmente
3. **Los cambios se subirán a GitHub**

## ⚠️ Nota Importante

Si el repositorio está en `backend/hotel-santino-backend/`:
- GitHub Desktop mostrará solo los archivos de esa carpeta
- Para ver todo el monorepo, necesitas mover el `.git` a la raíz

## 🔄 Mover Repositorio a la Raíz (Opcional)

Si quieres que GitHub Desktop muestre todo el monorepo:

1. **Cerrar GitHub Desktop**
2. **Mover .git a la raíz:**
   ```bash
   # Desde backend/hotel-santino-backend
   Move-Item -Path ".git" -Destination "..\..\.git" -Force
   ```
3. **Abrir GitHub Desktop** y agregar desde la raíz

---

**¿Quieres que verifique dónde está el repositorio Git y te ayude a configurarlo?**

