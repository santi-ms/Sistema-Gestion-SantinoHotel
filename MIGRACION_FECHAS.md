# Migración de fechas a `timestamptz`

Pasos para eliminar de raíz los errores de zona horaria. Leelo entero antes de
empezar: son unos 15 minutos y hay un punto donde hay que parar a verificar.

## Por qué

Las columnas de fecha eran `timestamp without time zone`. Guardaban un instante
sin decir en qué zona estaba medido, así que el código tenía que asumirlo.

Asumir mal corre las fechas un día entero: un pedido cargado a las 21:30
aparecía con fecha del día siguiente y desaparecía del listado de hoy. Ya pasó
una vez, y mientras el dato no diga su zona puede volver a pasar con cualquier
cambio futuro.

Con `timestamptz` el dato deja de ser ambiguo. Postgres guarda el instante y
devuelve un datetime con zona horaria — no queda nada que adivinar, ni en el
código, ni en una consulta suelta de psql, ni en cualquier herramienta que lea
la base más adelante.

## Paso 1 — Conseguir la URL de la base

En Railway: servicio de Postgres → pestaña **Variables** → `DATABASE_URL`.

```bash
cd backend/hotel-santino-backend
export DATABASE_URL="postgresql://..."
```

## Paso 2 — Diagnóstico (no escribe nada)

```bash
python diagnostico_fechas.py
```

Mirá la sección **3. Veredicto**. Tiene que decir:

```
✅ VEREDICTO: lo guardado está en UTC.
```

**Si dice que están en hora de Argentina, PARÁ.** Avisame y cambio la
migración: hay que editar `ZONA_DE_ORIGEN` en
`alembic/versions/003_timestamptz.py`. Aplicarla con la zona equivocada corre
todos los datos 3 horas.

El veredicto se calcula comparando el pedido más reciente contra el reloj del
servidor, así que vale si ese pedido es de hoy. Si es viejo, cargá uno de
prueba y volvé a correr el diagnóstico.

En la sección **4** podés contrastar los últimos 5 pedidos con la hora real a
la que los cargaste. Es la verificación más directa.

## Paso 3 — Backup

No lo saltees. La migración convierte datos y `downgrade` los devuelve al
formato anterior, pero un backup es lo único que cubre un error inesperado.

```bash
pg_dump "$DATABASE_URL" > backup_antes_timestamptz.sql
```

Si no tenés `pg_dump` a mano, Railway permite crear un backup desde el panel
del servicio de Postgres.

## Paso 4 — Aplicar la migración

Conviene hacerlo en un horario sin movimiento (no a las 21:00, que es cuando
hay pedidos).

```bash
alembic upgrade head
```

Tiene que imprimir una línea por columna:

```
✅ reserva.fecha_checkin -> timestamptz
✅ reserva.fecha_checkout -> timestamptz
...
```

Son 10 columnas en 7 tablas. Con el volumen de datos del hotel tarda segundos.

## Paso 5 — Desplegar el código

Mergeá la rama `claude/fechas-timestamptz` a `main`. Railway redeploya solo.

El orden importa: **primero la migración, después el código.** El código nuevo
espera columnas con zona horaria.

## Paso 6 — Verificar

```bash
python diagnostico_fechas.py
```

La sección 1 tiene que mostrar las 10 columnas con `✅ con zona`.

Después, en el sistema: cargá un pedido y confirmá que **la hora que muestra
coincide con el reloj**. La fecha y la hora salen del mismo cálculo, así que si
una está bien la otra también.

## Si algo sale mal

```bash
alembic downgrade -1
```

Vuelve las columnas a `timestamp` sin zona, con los valores en UTC — o sea,
exactamente como estaban. Después revertí el merge de `main`.

## Qué cambia en el código

- Los 10 campos de fecha de los modelos usan `columna_fecha()`, que declara
  `DateTime(timezone=True)`.
- `normalizar_fecha_argentina()` ya no asume nada cuando la fecha viene con
  zona. Mantiene el caso sin zona sólo para SQLite (que se usa en los tests) y
  para filas anteriores a la migración.
- `test_zona_horaria.py` cubre el contrato, incluido el caso exacto que rompió
  producción (21:27) y las 24 horas del día. Uno de los tests falla si alguien
  agrega una columna de fecha sin zona horaria.
