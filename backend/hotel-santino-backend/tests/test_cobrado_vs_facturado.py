"""
Tests de cobrado contra facturado.

El panel informaba como ingreso el total de cada reserva no cancelada, sin
importar si esa plata había entrado. En el caso de la auditoría informaba
$900.000 cuando habían entrado $400.000: contaba una reserva del bot que nadie
pagó, y el total de una que sólo había dejado la seña.

Lo mismo con los pedidos: uno PENDIENTE está consumido pero no cobrado, y el
dato estaba en `estado` desde siempre.
"""
import pytest
from sqlmodel import Session

from tests.fechas_de_prueba import momento_argentino

import hotel
from hotel import (
    ARGENTINA_TZ,
    Cliente,
    GastoAdicional,
    Habitacion,
    Pedido,
    Reserva,
    dashboard_analytics,
    detalle_diario_analytics,
    listar_pendiente_de_cobro,
    monto_cobrado_de_pedido,
    monto_cobrado_de_reserva,
)
from datetime import datetime

TOKEN = {"rol": "dueño"}
HOY = datetime(2026, 9, 20, 12, 0, tzinfo=ARGENTINA_TZ)


def _reserva(total, seña, forma_pago, estado="activa", nombre="X"):
    return Reserva(
        cliente_id=1, habitacion_id=1,
        fecha_checkin=momento_argentino(2026, 9, 10, 14, 0),
        fecha_checkout=momento_argentino(2026, 9, 12, 10, 0),
        seña=seña, total_estadia=total, forma_pago=forma_pago,
        nombre_huesped=nombre, estado=estado,
    )


# ─────────── El criterio, caso por caso ───────────

def test_pago_con_un_medio_real_cuenta_como_cobrado_completo():
    assert monto_cobrado_de_reserva(_reserva(200000, 0, "efectivo")) == 200000
    assert monto_cobrado_de_reserva(_reserva(200000, 0, "transferencia")) == 200000


def test_una_reserva_del_bot_sin_pagar_no_cuenta_nada():
    """El caso que más inflaba el número."""
    assert monto_cobrado_de_reserva(_reserva(300000, 0, "PENDIENTE_SEÑA")) == 0


def test_con_la_seña_recibida_cuenta_solo_la_seña():
    assert monto_cobrado_de_reserva(_reserva(400000, 200000, "Seña Recibida")) == 200000


def test_pagado_completo_cuenta_el_total():
    assert monto_cobrado_de_reserva(_reserva(400000, 200000, "Pagado Completo")) == 400000


def test_una_cancelada_no_cuenta_aunque_diga_efectivo():
    assert monto_cobrado_de_reserva(
        _reserva(999999, 0, "efectivo", estado="cancelada")
    ) == 0


def test_sin_forma_de_pago_sólo_cuenta_la_seña():
    """Lo único que consta que entró."""
    assert monto_cobrado_de_reserva(_reserva(400000, 150000, "")) == 150000
    assert monto_cobrado_de_reserva(_reserva(400000, 0, None)) == 0


def test_la_seña_nunca_supera_el_total():
    """Un dato mal cargado no puede inflar lo cobrado."""
    assert monto_cobrado_de_reserva(_reserva(100000, 999999, "Seña Recibida")) == 100000


def test_un_pedido_pagado_cuenta_y_uno_pendiente_no():
    assert monto_cobrado_de_pedido(Pedido(detalle="[]", monto=30000, estado="PAGADO")) == 30000
    assert monto_cobrado_de_pedido(Pedido(detalle="[]", monto=30000, estado="PENDIENTE")) == 0
    assert monto_cobrado_de_pedido(Pedido(detalle="[]", monto=30000, estado="pagado")) == 30000


# ─────────── El caso completo de la auditoría ───────────

@pytest.fixture
def escenario(test_db: Session, monkeypatch):
    """Las cuatro reservas del informe: $900.000 facturados, $400.000 cobrados."""
    monkeypatch.setattr(hotel, "obtener_fecha_argentina", lambda: HOY)
    test_db.add(Habitacion(numero=1, tipo="Estándar", capacidad=2, precio=50000))
    test_db.add(Cliente(nombre="Juan", dni="1", celular="1155667788"))
    test_db.commit()

    test_db.add(_reserva(200000, 0, "efectivo", nombre="Pagó todo"))
    test_db.add(_reserva(300000, 0, "PENDIENTE_SEÑA", nombre="Nunca pagó"))
    test_db.add(_reserva(400000, 200000, "Seña Recibida", nombre="Dejó seña"))
    test_db.add(_reserva(999999, 0, "efectivo", estado="cancelada", nombre="Cancelada"))
    test_db.commit()
    return test_db


def test_el_dashboard_informa_las_dos_cifras(escenario):
    d = dashboard_analytics(escenario, TOKEN)

    assert d["ingresos_reservas"] == 900000   # facturado, como antes
    assert d["cobrado_reservas"] == 400000    # lo que realmente entró
    assert d["pendiente_de_cobro"] == 500000


def test_el_resultado_de_caja_usa_lo_cobrado(escenario):
    escenario.add(
        GastoAdicional(descripcion="Proveedor", monto=100000, categoria="proveedores",
                       fecha=momento_argentino(2026, 9, 11, 10, 0))
    )
    escenario.commit()

    d = dashboard_analytics(escenario, TOKEN)

    assert d["beneficio_neto"] == 800000   # 900.000 facturados − 100.000
    assert d["resultado_caja"] == 300000   # 400.000 cobrados  − 100.000


def test_un_pedido_pendiente_factura_pero_no_entra_a_caja(escenario):
    escenario.add(Pedido(detalle="[]", monto=30000, estado="PAGADO", forma_pago="efectivo",
                         fecha=momento_argentino(2026, 9, 11, 21, 0)))
    escenario.add(Pedido(detalle="[]", monto=45000, estado="PENDIENTE", forma_pago="",
                         fecha=momento_argentino(2026, 9, 11, 22, 0)))
    escenario.commit()

    d = dashboard_analytics(escenario, TOKEN)

    assert d["ingresos_pedidos"] == 75000
    assert d["cobrado_pedidos"] == 30000


def test_el_detalle_diario_informa_cobrado_por_dia(escenario):
    r = detalle_diario_analytics("2026-09-01", "2026-09-30", escenario, TOKEN)
    dia = next(d for d in r["dias"] if d["fecha"] == "2026-09-10")

    assert dia["reservas"]["monto_total"] == 900000
    assert dia["reservas"]["cobrado"] == 400000
    assert dia["cobrado_dia"] == 400000
    assert r["resumen"]["total_cobrado"] == 400000
    assert r["resumen"]["pendiente_de_cobro"] == 500000


# ─────────── Quién debe plata ───────────

def test_lista_lo_que_falta_cobrar(escenario):
    r = listar_pendiente_de_cobro(escenario, TOKEN)

    assert r["total_pendiente"] == 500000
    assert r["cantidad"] == 2
    deudores = {d["huesped"]: d["pendiente"] for d in r["pendientes"]}
    assert deudores == {"Nunca pagó": 300000, "Dejó seña": 200000}


def test_viene_ordenado_por_monto(escenario):
    r = listar_pendiente_de_cobro(escenario, TOKEN)
    montos = [d["pendiente"] for d in r["pendientes"]]
    assert montos == sorted(montos, reverse=True)


def test_trae_el_celular_para_poder_reclamar(escenario):
    r = listar_pendiente_de_cobro(escenario, TOKEN)
    assert r["pendientes"][0]["celular"] == "1155667788"


def test_no_lista_lo_que_ya_se_cobro(escenario):
    r = listar_pendiente_de_cobro(escenario, TOKEN)
    assert "Pagó todo" not in [d["huesped"] for d in r["pendientes"]]


def test_no_lista_las_canceladas(escenario):
    r = listar_pendiente_de_cobro(escenario, TOKEN)
    assert "Cancelada" not in [d["huesped"] for d in r["pendientes"]]


def test_incluye_los_pedidos_sin_cobrar(escenario):
    escenario.add(Pedido(detalle="[]", monto=45000, estado="PENDIENTE", forma_pago="",
                         habitacion_id=1, fecha=momento_argentino(2026, 9, 11, 22, 0)))
    escenario.commit()

    r = listar_pendiente_de_cobro(escenario, TOKEN)

    assert r["por_tipo"]["pedidos"] == 45000
    assert r["por_tipo"]["reservas"] == 500000
    assert r["total_pendiente"] == 545000


def test_sin_deudas_devuelve_vacio(test_db):
    r = listar_pendiente_de_cobro(test_db, TOKEN)
    assert r["total_pendiente"] == 0
    assert r["pendientes"] == []
