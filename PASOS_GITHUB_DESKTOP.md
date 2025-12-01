# 📱 Pasos para Agregar Repositorio en GitHub Desktop

## 🎯 Solución Rápida

El repositorio Git está en `backend/hotel-santino-backend/`, pero para ver todo el monorepo en GitHub Desktop, agrégalo desde la raíz.

## ✅ Pasos

### 1. Agregar Repositorio en GitHub Desktop

1. **Abrir GitHub Desktop**
2. **File → Add Local Repository** (o Ctrl+O)
3. Click en **"Choose..."** o **"Browse"**
4. Navegar y seleccionar: 
   ```
   C:\Users\santi\Desktop\HotelGestion2
   ```
5. Click **"Add Repository"**

### 2. Verificar

Después de agregar, deberías ver:
- ✅ Todos los archivos del monorepo (backend, frontend, docs)
- ✅ El estado del repositorio
- ✅ Los cambios pendientes

## 🔍 Si No Aparece el Repositorio

Si GitHub Desktop dice que no es un repositorio Git válido:

### Opción A: Agregar desde backend

1. **File → Add Local Repository**
2. Seleccionar: `C:\Users\santi\Desktop\HotelGestion2\backend\hotel-santino-backend`
3. Click **"Add Repository"**

**Nota**: Solo verás los archivos del backend, no todo el monorepo.

### Opción B: Mover .git a la raíz (Para ver todo el monorepo)

Si quieres ver todo el monorepo en GitHub Desktop:

1. **Cerrar GitHub Desktop**
2. Ejecutar estos comandos:
   ```powershell
   cd C:\Users\santi\Desktop\HotelGestion2\backend\hotel-santino-backend
   Move-Item -Path ".git" -Destination "..\..\.git" -Force
   ```
3. **Abrir GitHub Desktop**
4. **File → Add Local Repository**
5. Seleccionar: `C:\Users\santi\Desktop\HotelGestion2`
6. Click **"Add Repository"**

## 📝 Después de Agregar

Una vez agregado correctamente:
- Verás todos los archivos del monorepo
- Podrás hacer commit y push normalmente
- Los cambios se subirán a `santi-ms/hotel-santino-backend`

---

**¿Quieres que te ayude a mover el .git a la raíz para ver todo el monorepo?**

