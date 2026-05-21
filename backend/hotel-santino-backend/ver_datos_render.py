"""
Ver reservas y pedidos creados desde el inicio del outage de Railway (19/05)
hasta hoy, en la base de datos de Render.

Uso (Windows PowerShell):
    pip install psycopg2-binary
    $env:RENDER_DATABASE_URL="postgresql://...oregon-postgres.render.com/..."
    python ver_datos_render.py

Uso (Linux/Mac):
    pip install psycopg2-binary
    export RENDER_DATABASE_URL="postgresql://...oregon-postgres.render.com/..."
    python ver_datos_render.py

La External Database URL la sacás de:
    Render → hotel-santino-db → Info → Connections → External Database URL
"""

import os
import sys
import json
import psycopg2
from psycopg2.extras import RealDictCursor

url = os.getenv("RENDER_DATABASE_URL")
if not url:
    print("❌ Falta la variable RENDER_DATABASE_URL")
    sys.exit(1)

# Desde el inicio del outage (19/05 00:00 hora Argentina = UTC-3)
DESDE = "2026-05-19 00:00:00-03"

conn = psycopg2.connect(url, sslmode="require")
cur = conn.cursor(cursor_factory=RealDictCursor)

cur.execute("SELECT id, numero, tipo FROM habitacion")
habs = {r["id"]: r for r in cur.fetchall()}

cur.execute("SELECT id, nombre, dni, celular, patente FROM cliente")
clis = {r["id"]: r for r in cur.fetchall()}

print("\n" + "=" * 80)
print("RESERVAS  (fecha_checkin >= 19/05)")
print("=" * 80)
cur.execute("SELECT * FROM reserva WHERE fecha_checkin >= %s ORDER BY id", (DESDE,))
reservas = cur.fetchall()
if not reservas:
    print("\n  (sin reservas)")
for r in reservas:
    cli = clis.get(r["cliente_id"])
    hab = habs.get(r["habitacion_id"])
    hab_txt = f"{hab['numero']} ({hab['tipo']})" if hab else f"id={r['habitacion_id']} (?)"
    print(f"\n  - Reserva #{r['id']}  [{r['estado']}]  origen={r['origen'] or '-'}")
    print(f"    Huesped:    {r['nombre_huesped'] or (cli['nombre'] if cli else '?')}")
    if cli:
        print(f"    Cliente:    {cli['nombre']}  DNI {cli['dni']}  Cel {cli['celular']}  Patente {cli['patente'] or '-'}")
    else:
        print(f"    Cliente:    id={r['cliente_id']} (no encontrado)")
    print(f"    Habitacion: {hab_txt}")
    print(f"    Check-in:   {r['fecha_checkin']}")
    print(f"    Check-out:  {r['fecha_checkout']}")
    print(f"    Total: ${float(r['total_estadia']):.2f}   Sena: ${float(r['seña']):.2f}   Pago: {r['forma_pago']}")

print("\n" + "=" * 80)
print("PEDIDOS  (fecha >= 19/05)")
print("=" * 80)
cur.execute("SELECT * FROM pedido WHERE fecha >= %s ORDER BY id", (DESDE,))
pedidos = cur.fetchall()
if not pedidos:
    print("\n  (sin pedidos)")
for p in pedidos:
    hab = habs.get(p["habitacion_id"]) if p["habitacion_id"] else None
    hab_txt = str(hab["numero"]) if hab else ("externo" if p["externo"] else "-")
    print(f"\n  - Pedido #{p['id']}  [{p['estado']}]  {'(externo)' if p['externo'] else ''}")
    print(f"    Fecha:      {p['fecha']}")
    print(f"    Habitacion: {hab_txt}")
    print(f"    Monto: ${float(p['monto']):.2f}   Pago: {p['forma_pago'] or '-'}")
    if p["pagado_at"]:
        print(f"    Pagado:     {p['pagado_at']}")
    try:
        det = json.loads(p["detalle"]) if p["detalle"] else []
        if isinstance(det, list):
            for it in det:
                nom = it.get("nombre") or it.get("producto") or "?"
                cant = it.get("cantidad", "?")
                precio = it.get("precio", "?")
                print(f"      * {cant}x {nom}  @ ${precio}")
        else:
            print(f"    Detalle:    {p['detalle']}")
    except Exception:
        print(f"    Detalle:    {p['detalle']}")

print("\n" + "=" * 80)
print(f"  Total: {len(reservas)} reserva(s)  |  {len(pedidos)} pedido(s)")
print("=" * 80 + "\n")

cur.close()
conn.close()
