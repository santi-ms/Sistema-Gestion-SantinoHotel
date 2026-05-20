# Migración temporal a Render (mientras Railway está caído)

Esto es **temporal**. Cuando Railway vuelva, regresamos a Railway.

## Qué hace esto

- Sube tu backend (FastAPI) a Render con una base de datos Postgres **nueva y vacía**.
- El frontend (en Vercel) sigue igual, solo cambiás 1 variable de entorno para apuntar al backend de Render.
- Tus datos viejos en Railway **NO se tocan**. Quedan ahí esperando a que Railway vuelva.

---

## PASO 1 — Crear cuenta en Render (2 min)

1. Andá a https://render.com y registrate con tu cuenta de GitHub.
2. Autorizá a Render para acceder al repo `Sistema-Gestion-SantinoHotel`.

## PASO 2 — Deploy con Blueprint (5 min)

1. En el dashboard de Render, click en **"New +"** → **"Blueprint"**.
2. Seleccioná el repo `Sistema-Gestion-SantinoHotel`.
3. Render va a detectar el archivo `render.yaml` automáticamente.
4. Click en **"Apply"**.
5. Esperá a que termine el build (~5 min). Render va a crear:
   - Una base de datos Postgres llamada `hotel-santino-db`
   - El backend `hotel-santino-backend` (FastAPI)
   - La variable `DATABASE_URL` se conecta sola entre los dos

## PASO 3 — Copiar la URL del backend de Render (1 min)

Cuando termine el deploy, Render te da una URL tipo:

```
https://hotel-santino-backend.onrender.com
```

Copiala.

## PASO 4 — Apuntar el frontend al nuevo backend (2 min)

En Vercel:

1. Andá a tu proyecto del frontend en https://vercel.com
2. **Settings** → **Environment Variables**
3. Editá (o creá) la variable:
   - Nombre: `VITE_API_URL`
   - Valor: `https://hotel-santino-backend.onrender.com` (la URL que copiaste arriba)
4. **Deployments** → click en los `...` del último deploy → **Redeploy**.

## PASO 5 — Crear usuario dueño (1 min)

Como la DB está vacía, no hay usuarios. Para crear el dueño:

1. En Render, andá al servicio `hotel-santino-backend` → tab **"Shell"**.
2. Ejecutá:
   ```
   python crear_usuario_dueño.py
   ```
3. Listo, ya podés loguearte.

---

## Cuando Railway vuelva — Volver a Railway

1. En Vercel, cambiá `VITE_API_URL` de vuelta a la URL de Railway:
   `https://hotel-santino-backend-production.up.railway.app`
2. Redeploy del frontend.
3. (Opcional) En Render, suspendé o eliminá los servicios para no consumir recursos.
4. Los datos creados durante el outage quedan en Render — si los necesitás, decime y armamos un script para pasarlos a Railway.

---

## Notas

- **Render free tier:** el backend se "duerme" tras 15 min sin tráfico. La primera request después tarda ~30s en despertar. Para uso real, considerá el plan pago ($7/mes).
- **DB free:** expira a los 90 días. Para esto temporal sobra.
- **CORS:** si el backend rechaza pedidos del frontend, hay que agregar la URL de Vercel a los orígenes permitidos en `hotel.py`. Avisame si ves errores de CORS.
