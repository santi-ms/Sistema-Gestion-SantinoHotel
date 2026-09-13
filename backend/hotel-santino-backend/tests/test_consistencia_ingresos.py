"""
Tests de consistencia de los reportes de plata.

Cuatro endpoints informan ingresos y tenían tres criterios distintos:

  /analytics/dashboard        sumaba los pedidos cancelados
  /analytics/ingresos-por-dia sumaba los pedidos cancelados
  /analytics/detalle-diario   los descartaba
  /finanzas/ingresos          los descartaba

Además, el bucketeo por día restaba 3 horas (trataba la hora argentina
guardada en la base como si fuera UTC), así que un pedido de la madrugada
caía en el día anterior.

Estos tests fijan que los cuatro den el mismo número.
"""
from datetime import datetime

import pytest
from sqlmodel import Session

import hotel
from hotel import (
    ARGENTINA_TZ,
    Cliente,
    Habitacion,
    Pedido,
    Reserva,
    dashboard_analytics,
    detalle_diario_analytics,
    ingresos_por_dia,
    listar_ingresos_finanzas,
)

TOKEN = {"rol": "dueño"}
HOY = datetime(2026, 3, 15, 18, 0, tzinfo=ARGENTINA_TZ)


@pytest.fixture
def datos(test_db: Session, monkeypatch):
    """Marzo 2026 con un caso de cada cosa que rompía los números."""
    monkeypatch.setattr(hotel, "obtener_fecha_argentina", lambda: HOY)

    test_db.add(Habitacion(numero=1, tipo="Estándar", capacidad=2, precio=50000))
    test_db.add(Cliente(nombre="Juan", dni="1", celular="1"))
    test_db.commit()

    # Reserva que factura $200.000 el 5 de marzo
    test_db.add(
        Reserva(
            cliente_id=1,
            habitacion_id=1,
            fecha_checkin=datetime(2026, 3, 5, 14, 0, tzinfo=ARGENTINA_TZ),
            fecha_checkout=datetime(2026, 3, 8, 10, 0, tzinfo=ARGENTINA_TZ),
            seña=0,
            total_estadia=200000,
            forma_pago="efectivo",
            nombre_huesped="Juan",
            estado="activa",
        )
    )
    # Reserva cancelada: no es ingreso
    test_db.add(
        Reserva(
            cliente_id=1,
            habitacion_id=1,
            fecha_checkin=datetime(2026, 3, 6, 14, 0, tzinfo=ARGENTINA_TZ),
            fecha_checkout=datetime(2026, 3, 7, 10, 0, tzinfo=ARGENTINA_TZ),
            seña=0,
            total_estadia=999999,
            forma_pago="efectivo",
            nombre_huesped="Cancelado",
            estado="cancelada",
        )
    )
    # Pedido normal de la tarde
    test_db.add(
        Pedido(detalle="[]", monto=30000, estado="PAGADO", forma_pago="efectivo",
               fecha=datetime(2026, 3, 10, 21, 0, tzinfo=ARGENTINA_TZ))
    )
    # Pedido de la madrugada: el que caía en el día anterior
    test_db.add(
        Pedido(detalle="[]", monto=15000, estado="PAGADO", forma_pago="efectivo",
               fecha=datetime(2026, 3, 10, 1, 30, tzinfo=ARGENTINA_TZ))
    )
    # Pedido cancelado: no es ingreso
    test_db.add(
        Pedido(detalle="[]", monto=888888, estado="CANCELADO", forma_pago="efectivo",
               fecha=datetime(2026, 3, 11, 12, 0, tzinfo=ARGENTINA_TZ))
    )
    # Cancelado en minúsculas: el estado se escribió desde varios lugares
    test_db.add(
        Pedido(detalle="[]", monto=777777, estado="cancelado", forma_pago="efectivo",
               fecha=datetime(2026, 3, 12, 12, 0, tzinfo=ARGENTINA_TZ))
    )
    test_db.commit()
    return test_db


RESERVAS_ESPERADAS = 200000
PEDIDOS_ESPERADOS = 45000  # 30.000 + 15.000
TOTAL_ESPERADO = RESERVAS_ESPERADAS + PEDIDOS_ESPERADOS


def test_dashboard_no_suma_los_cancelados(datos):
    r = dashboard_analytics(datos, TOKEN)
    assert r["ingresos_reservas"] == RESERVAS_ESPERADAS
    assert r["ingresos_pedidos"] == PEDIDOS_ESPERADOS
    assert r["total_ingresos"] == TOTAL_ESPERADO


def test_detalle_diario_no_suma_los_cancelados(datos):
    r = detalle_diario_analytics("2026-03-01", "2026-03-31", datos, TOKEN)
    assert r["resumen"]["total_ingresos_reservas"] == RESERVAS_ESPERADAS
    assert r["resumen"]["total_ingresos_pedidos"] == PEDIDOS_ESPERADOS


def test_ingresos_por_dia_no_suma_los_cancelados(datos):
    dias = ingresos_por_dia(30, datos, TOKEN)
    assert sum(d["reservas"] for d in dias) == RESERVAS_ESPERADAS
    assert sum(d["pedidos"] for d in dias) == PEDIDOS_ESPERADOS


def test_finanzas_no_suma_los_cancelados(datos, monkeypatch):
    monkeypatch.setattr(hotel, "FINANZAS_API_KEY", "clave-de-test")
    r = listar_ingresos_finanzas("2026-03-01", "2026-03-31", datos, None)
    por_tipo = {}
    for i in r["ingresos"]:
        por_tipo[i["tipo"]] = por_tipo.get(i["tipo"], 0) + i["monto"]
    assert por_tipo.get("reserva", 0) == RESERVAS_ESPERADAS
    assert por_tipo.get("restobar", 0) == PEDIDOS_ESPERADOS


def test_los_cuatro_endpoints_dan_el_mismo_total(datos, monkeypatch):
    """La prueba que importa: el panel tiene que cerrar consigo mismo."""
    monkeypatch.setattr(hotel, "FINANZAS_API_KEY", "clave-de-test")

    dashboard = dashboard_analytics(datos, TOKEN)["total_ingresos"]
    detalle = detalle_diario_analytics("2026-03-01", "2026-03-31", datos, TOKEN)
    detalle_total = detalle["resumen"]["total_ingresos"]
    por_dia = sum(d["total"] for d in ingresos_por_dia(30, datos, TOKEN))
    finanzas = sum(
        i["monto"]
        for i in listar_ingresos_finanzas("2026-03-01", "2026-03-31", datos, None)["ingresos"]
    )

    assert dashboard == detalle_total == por_dia == finanzas == TOTAL_ESPERADO


def test_el_pedido_de_la_madrugada_cae_en_su_propio_dia(datos):
    """Un pedido de las 01:30 del 10 es del 10, no del 9."""
    r = detalle_diario_analytics("2026-03-01", "2026-03-31", datos, TOKEN)
    por_fecha = {d["fecha"]: d for d in r["dias"]}

    assert por_fecha["2026-03-10"]["pedidos"]["monto_total"] == 45000
    assert por_fecha["2026-03-10"]["pedidos"]["cantidad"] == 2
    assert por_fecha["2026-03-09"]["pedidos"]["monto_total"] == 0


def test_la_hora_del_pedido_se_informa_sin_correrla(datos):
    """normalizar_fecha_argentina mostraba las 01:30 como las 22:30."""
    pedido = datos.get(Pedido, 2)
    normalizada = hotel.normalizar_fecha_argentina(pedido.fecha)

    assert normalizada.hour == 1
    assert normalizada.minute == 30
    assert normalizada.date() == datetime(2026, 3, 10).date()
