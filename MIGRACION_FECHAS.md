# Fechas con zona horaria (`timestamptz`)

**No hay nada que hacer a mano.** La migración se aplica sola al desplegar.
Este documento explica qué hace y cómo verificar que salió bien.

## El problema que resuelve

Las columnas de fecha eran `timestamp without time zone`: guardaban un instante
sin decir en qué zona estaba medido. El código tenía que asumirlo, y una
asunción equivocada corre las fechas un día entero — un pedido cargado a las
21:30 aparecía con fecha del día siguiente y desaparecía del listado de hoy.

Con `timestamptz` el dato deja de ser ambiguo: Postgres guarda el instante y
devuelve la hora con su zona. No queda nada que adivinar, ni en el código, ni
en una consulta suelta de psql, ni en cualquier herramienta que lea la base más
adelante.

## Cómo se aplica

Al arrancar, el backend llama a `migrar_fechas_a_timestamptz()`. La función:

1. Si las columnas ya tienen zona horaria, no hace nada.
2. Determina en qué zona están medidos los valores guardados.
3. Si —y sólo si— puede **probarlo**, convierte las 10 columnas.

### Cómo lo prueba

Por descarte, no por estimación. Las columnas de evento (cuándo se cargó un
pedido, cuándo se pagó, cuándo se movió stock) **nunca pueden tener fecha
futura**. Si el registro más nuevo es posterior a la hora argentina actual,
entonces no puede estar medido en hora argentina: sería del futuro. Sólo queda
UTC.

Eso requiere que haya habido actividad en las últimas 3 horas. Si no la hubo,
no se puede probar nada y **no se migra**: se reintenta en el próximo arranque.
Nunca se adivina — migrar con la zona equivocada correría todos los datos.

`reserva.fecha_checkin` queda afuera de la detección a propósito: una reserva sí
puede ser para el mes que viene.

### Si no migra, no pasa nada

El código funciona igual con o sin la migración: `normalizar_fecha_argentina()`
trata las fechas sin zona como UTC, que es exactamente lo que hace hoy. No
migrar sólo deja el dato ambiguo un rato más. Tampoco puede impedir el arranque:
cualquier error se registra y el servidor levanta igual.

## Cómo verificar que salió bien

En los logs de Railway, al desplegar, buscá:

```
🕐 [Fechas] Zona determinada: UTC — el registro más nuevo (...) es posterior a
   la hora argentina actual (...): no puede estar en hora argentina, está en UTC
   ✅ pedido.fecha -> timestamptz
   ... (10 columnas)
✅ [Fechas] 10 columnas migradas
```

Si en cambio dice `⏸️ Migración pospuesta`, no pasó nada malo: no había
actividad reciente para probar la zona. Se reintenta en el próximo arranque, o
se fuerza cargando un pedido y redeployando.

En el sistema: cargá un pedido y confirmá que la hora que muestra coincide con
el reloj. La fecha y la hora salen del mismo cálculo.

## Cómo se probó

Contra un PostgreSQL 16 real con `TimeZone=UTC` (igual que Railway), no sólo
contra SQLite — que fue justamente el error que causó el incidente original:
SQLite guarda la hora local tal cual y Postgres la convierte a UTC, así que un
test sobre SQLite no dice nada sobre producción.

Se verificó:

- Que Postgres guarda en UTC un datetime escrito con offset `-03:00`.
- La migración completa: 10 columnas convertidas, instante y día preservados,
  una reserva de diciembre sin correrse, idempotente al correr dos veces, y
  pedidos nuevos leyéndose bien después.
- Los cuatro casos en que **no** debe migrar: sin actividad reciente, base
  vacía, sólo reservas futuras, y —el importante— datos guardados en hora
  argentina, donde migrar sería destructivo. En los cuatro deja los datos
  intactos.

## Control manual (opcional)

También existe la migración de Alembic `003_timestamptz`, con el mismo efecto,
por si alguna vez querés aplicarla o revertirla a mano:

```bash
cd backend/hotel-santino-backend
export DATABASE_URL="postgresql://..."   # Railway → Postgres → Variables

alembic upgrade head     # aplicar
alembic downgrade -1     # revertir
```

El `downgrade` devuelve las columnas a `timestamp` con los valores en UTC, o
sea exactamente como estaban. La conversión es de ida y vuelta sin pérdida.

`diagnostico_fechas.py` (solo lectura) muestra el tipo de cada columna, la zona
del servidor y los últimos pedidos leídos de las dos formas, por si querés
inspeccionar el estado en cualquier momento.

## Qué cambió en el código

- Los 10 campos de fecha de los 7 modelos con tabla usan `columna_fecha()`, que
  declara `DateTime(timezone=True)`.
- `normalizar_fecha_argentina()` ya no asume nada cuando la fecha viene con
  zona. El caso sin zona queda como fallback para SQLite (tests) y para filas
  anteriores a la migración.
- `test_zona_horaria.py` cubre el contrato, incluido el caso exacto que rompió
  producción (21:27) y las 24 horas del día. Uno de sus tests falla si alguien
  agrega una columna de fecha sin zona horaria.
- `test_migracion_fechas.py` cubre la lógica de detección, incluido que nunca
  dé "migrar" para datos en hora argentina.
