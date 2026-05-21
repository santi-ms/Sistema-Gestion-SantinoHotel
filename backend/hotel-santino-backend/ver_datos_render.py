"""
Ver reservas y pedidos creados desde el inicio del outage de Railway (19/05)
hasta hoy, en la base de datos de Render.

Uso:
    export RENDER_DATABASE_URL="postgresql://...oregon-postgres.render.com/..."
    python ver_datos_render.py

La External Database URL la sacás de:
    Render → hotel-santino-db → Info → Connections → External Database URL
"""

import os
import sys
import json
from datetime import datetime, timezone, timedelta
from sqlmodel import Session, select, create_engine

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from hotel import Reserva, Pedido, Cliente, Habitacion

DATABASE_URL = os.getenv("RENDER_DATABASE_URL")
if not DATABASE_URL:
    print("❌ Falta la variable RENDER_DATABASE_URL")
    print("   Sacala de: Render → hotel-santino-db → Info → External Database URL")
    sys.exit(1)

# Filtro: desde 19/05 00:00 (hora Argentina = UTC-3)
DESDE = datetime(2026, 5, 19, 0, 0, 0, tzinfo=timezone(timedelta(hours=-3)))

engine = create_engine(
    DATABASE_URL,
    echo=False,
    connect_args={"sslmode": "require"},
)


def fmt_dt(dt):
    if dt is None:
        return "-"
    if isinstance(dt, str):
        return dt
    return dt.strftime("%Y-%m-%d %H:%M")


def main():
    with Session(engine) as db:
        clientes = {c.id: c for c in db.exec(select(Cliente)).all()}
        habs = {h.id: h for h in db.exec(select(Habitacion)).all()}

        # ─── RESERVAS ───
        print("\n" + "=" * 80)
        print("📋 RESERVAS CREADAS DESDE 19/05")
        print("=" * 80)

        reservas = db.exec(
            select(Reserva).where(Reserva.fecha_checkin >= DESDE).order_by(Reserva.id)
        ).all()
        # también traer las que tienen checkin viejo pero fueron creadas en este periodo
        # (no hay fecha_creacion en Reserva, así que filtramos por fecha_checkin)

        if not reservas:
            print("\n   (sin reservas en el rango)")
        for r in reservas:
            cli = clientes.get(r.cliente_id)
            hab = habs.get(r.habitacion_id)
            print(f"\n  ─ Reserva #{r.id} [{r.estado}] origen={r.origen or '-'}")
            print(f"    Huésped:   {r.nombre_huesped or (cli.nombre if cli else '?')}")
            if cli:
                print(f"    Cliente:   {cli.nombre}  DNI {cli.dni}  Cel {cli.celular}  Patente {cli.patente or '-'}")
            else:
                print(f"    Cliente:   id={r.cliente_id} (NO ENCONTRADO)")
            print(f"    Habitación: {hab.numero if hab else f'id={r.habitacion_id} (?)'}  ({hab.tipo if hab else ''})")
            print(f"    Check-in:  {fmt_dt(r.fecha_checkin)}")
            print(f"    Check-out: {fmt_dt(r.fecha_checkout)}")
            print(f"    Total:     ${r.total_estadia:.2f}   Seña: ${r.seña:.2f}   Pago: {r.forma_pago}")

        # ─── PEDIDOS ───
        print("\n" + "=" * 80)
        print("🍽️  PEDIDOS CREADOS DESDE 19/05")
        print("=" * 80)

        pedidos = db.exec(
            select(Pedido).where(Pedido.fecha >= DESDE).order_by(Pedido.id)
        ).all()

        if not pedidos:
            print("\n   (sin pedidos en el rango)")
        for p in pedidos:
            hab = habs.get(p.habitacion_id) if p.habitacion_id else None
            print(f"\n  ─ Pedido #{p.id} [{p.estado}] {'(externo)' if p.externo else ''}")
            print(f"    Fecha:      {fmt_dt(p.fecha)}")
            print(f"    Habitación: {hab.numero if hab else ('externo' if p.externo else '-')}")
            print(f"    Monto:      ${p.monto:.2f}   Pago: {p.forma_pago or '-'}")
            if p.pagado_at:
                print(f"    Pagado:     {fmt_dt(p.pagado_at)}")
            try:
                detalle = json.loads(p.detalle) if p.detalle else []
                if isinstance(detalle, list):
                    for item in detalle:
                        nombre = item.get("nombre") or item.get("producto") or "?"
                        cant = item.get("cantidad", "?")
                        precio = item.get("precio", "?")
                        print(f"      • {cant}x {nombre}  @ ${precio}")
                else:
                    print(f"    Detalle:    {p.detalle}")
            except Exception:
                print(f"    Detalle:    {p.detalle}")

        print("\n" + "=" * 80)
        print(f"  Total: {len(reservas)} reserva(s)  |  {len(pedidos)} pedido(s)")
        print("=" * 80 + "\n")


if __name__ == "__main__":
    main()
