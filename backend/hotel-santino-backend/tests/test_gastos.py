"""
Tests de la sección de gastos.

Los gastos se podían cargar pero no consultar: la pantalla mostraba sólo el día
actual, no había categorías, y el análisis diario informaba lo que entró sin
restar lo que salió.
"""
from datetime import datetime

import pytest
from sqlmodel import Session

from tests.fechas_de_prueba import momento_argentino

import hotel
from hotel import (
    ARGENTINA_TZ,
    CATEGORIAS_GASTO,
    Cliente,
    GastoAdicional,
    Habitacion,
    Pedido,
    Reserva,
    detalle_diario_analytics,
    normalizar_categoria_gasto,
    obtener_todos_los_gastos,
)

TOKEN = {"rol": "dueño"}


@pytest.fixture
def gastos(test_db: Session):
    """Un mes de gastos de varias categorías."""
    filas = [
        ("Proveedor bebidas", 120000, "proveedores", (2026, 5, 3, 10, 0)),
        ("Sueldo mucama", 300000, "sueldos", (2026, 5, 5, 9, 0)),
        ("Luz y gas", 85000, "servicios", (2026, 5, 10, 11, 0)),
        ("Arreglo caldera", 60000, "mantenimiento", (2026, 5, 10, 16, 0)),
        ("Proveedor limpieza", 40000, "proveedores", (2026, 5, 20, 12, 0)),
        ("Gasto del mes pasado", 999999, "servicios", (2026, 4, 15, 12, 0)),
    ]
    for descripcion, monto, categoria, cuando in filas:
        test_db.add(
            GastoAdicional(
                descripcion=descripcion,
                monto=monto,
                categoria=categoria,
                fecha=momento_argentino(*cuando),
            )
        )
    test_db.commit()
    return test_db


# ─────────── Categorías ───────────

def test_las_categorias_conocidas_se_respetan(gastos):
    for categoria in CATEGORIAS_GASTO:
        assert normalizar_categoria_gasto(categoria) == categoria


def test_una_categoria_desconocida_cae_en_otros():
    assert normalizar_categoria_gasto("cualquier cosa") == "otros"
    assert normalizar_categoria_gasto("") == "otros"


def test_los_gastos_viejos_sin_categoria_se_leen_como_otros(test_db):
    """La columna se agregó después: las filas anteriores quedan en NULL."""
    test_db.add(
        GastoAdicional(descripcion="Viejo", monto=1000, categoria=None,
                       fecha=momento_argentino(2026, 5, 4, 10, 0))
    )
    test_db.commit()

    r = obtener_todos_los_gastos(None, None, None, test_db, TOKEN)

    assert r["gastos"][0]["categoria"] == "otros"


def test_se_normaliza_mayusculas_y_espacios():
    assert normalizar_categoria_gasto("  Proveedores ") == "proveedores"


# ─────────── Consulta por período ───────────

def test_sin_filtros_devuelve_todo(gastos):
    r = obtener_todos_los_gastos(None, None, None, gastos, TOKEN)
    assert r["resumen"]["cantidad"] == 6


def test_filtra_por_rango_de_fechas(gastos):
    """Lo que antes no se podía: consultar un mes que no sea hoy."""
    r = obtener_todos_los_gastos("2026-05-01", "2026-05-31", None, gastos, TOKEN)

    assert r["resumen"]["cantidad"] == 5
    assert r["resumen"]["total"] == 605000
    assert "Gasto del mes pasado" not in [g["descripcion"] for g in r["gastos"]]


def test_el_hasta_es_inclusive(gastos):
    """Un gasto del día 10 a las 16:00 tiene que entrar con hasta=2026-05-10."""
    r = obtener_todos_los_gastos("2026-05-10", "2026-05-10", None, gastos, TOKEN)

    assert r["resumen"]["cantidad"] == 2
    assert r["resumen"]["total"] == 145000


def test_filtra_por_categoria(gastos):
    r = obtener_todos_los_gastos("2026-05-01", "2026-05-31", "proveedores", gastos, TOKEN)

    assert r["resumen"]["cantidad"] == 2
    assert r["resumen"]["total"] == 160000


def test_los_totales_por_categoria_vienen_ordenados(gastos):
    r = obtener_todos_los_gastos("2026-05-01", "2026-05-31", None, gastos, TOKEN)
    por_categoria = r["resumen"]["por_categoria"]

    assert por_categoria[0] == {"categoria": "sueldos", "monto": 300000}
    assert {"categoria": "proveedores", "monto": 160000} in por_categoria
    montos = [c["monto"] for c in por_categoria]
    assert montos == sorted(montos, reverse=True)


def test_los_totales_por_categoria_suman_el_total(gastos):
    r = obtener_todos_los_gastos("2026-05-01", "2026-05-31", None, gastos, TOKEN)
    assert sum(c["monto"] for c in r["resumen"]["por_categoria"]) == r["resumen"]["total"]


def test_una_fecha_mal_formada_da_error_claro(gastos):
    with pytest.raises(hotel.HTTPException) as e:
        obtener_todos_los_gastos("03/05/2026", None, None, gastos, TOKEN)
    assert e.value.status_code == 400


def test_un_periodo_sin_gastos_devuelve_vacio_sin_romper(gastos):
    r = obtener_todos_los_gastos("2026-01-01", "2026-01-31", None, gastos, TOKEN)
    assert r["resumen"]["cantidad"] == 0
    assert r["resumen"]["total"] == 0
    assert r["resumen"]["por_categoria"] == []


# ─────────── Gastos en el análisis diario ───────────

@pytest.fixture
def dia_con_movimiento(test_db: Session):
    """Un día con un ingreso y un gasto."""
    test_db.add(Habitacion(numero=1, tipo="Estándar", capacidad=2, precio=50000))
    test_db.add(Cliente(nombre="Juan", dni="1", celular="1"))
    test_db.commit()
    test_db.add(
        Reserva(cliente_id=1, habitacion_id=1,
                fecha_checkin=momento_argentino(2026, 5, 10, 14, 0),
                fecha_checkout=momento_argentino(2026, 5, 12, 10, 0),
                seña=0, total_estadia=200000, forma_pago="efectivo",
                nombre_huesped="Juan", estado="activa")
    )
    test_db.add(
        Pedido(detalle="[]", monto=30000, estado="PAGADO", forma_pago="efectivo",
               fecha=momento_argentino(2026, 5, 10, 21, 0))
    )
    test_db.add(
        GastoAdicional(descripcion="Proveedor", monto=80000, categoria="proveedores",
                       fecha=momento_argentino(2026, 5, 10, 11, 0))
    )
    test_db.commit()
    return test_db


def _dia(resultado, fecha):
    return next(d for d in resultado["dias"] if d["fecha"] == fecha)


def test_el_dia_informa_sus_gastos(dia_con_movimiento):
    r = detalle_diario_analytics("2026-05-01", "2026-05-31", dia_con_movimiento, TOKEN)
    dia = _dia(r, "2026-05-10")

    assert dia["gastos"]["monto_total"] == 80000
    assert dia["gastos"]["cantidad"] == 1
    assert dia["gastos"]["por_categoria"] == [{"categoria": "proveedores", "monto": 80000}]


def test_el_resultado_neto_resta_los_gastos(dia_con_movimiento):
    """Lo que faltaba: la tabla mostraba lo que entró, sin restar lo que salió."""
    r = detalle_diario_analytics("2026-05-01", "2026-05-31", dia_con_movimiento, TOKEN)
    dia = _dia(r, "2026-05-10")

    assert dia["total_dia"] == 230000        # ingreso bruto, como antes
    assert dia["resultado_neto"] == 150000   # 230.000 - 80.000


def test_el_resultado_neto_puede_ser_negativo(test_db):
    test_db.add(
        GastoAdicional(descripcion="Caldera nueva", monto=500000,
                       categoria="mantenimiento",
                       fecha=momento_argentino(2026, 5, 10, 11, 0))
    )
    test_db.commit()

    r = detalle_diario_analytics("2026-05-01", "2026-05-31", test_db, TOKEN)

    assert _dia(r, "2026-05-10")["resultado_neto"] == -500000


def test_el_resumen_del_periodo_trae_los_gastos(dia_con_movimiento):
    r = detalle_diario_analytics("2026-05-01", "2026-05-31", dia_con_movimiento, TOKEN)

    assert r["resumen"]["total_gastos"] == 80000
    assert r["resumen"]["cantidad_gastos"] == 1
    assert r["resumen"]["resultado_neto"] == 150000


def test_un_dia_sin_gastos_informa_cero(dia_con_movimiento):
    r = detalle_diario_analytics("2026-05-01", "2026-05-31", dia_con_movimiento, TOKEN)
    dia = _dia(r, "2026-05-15")

    assert dia["gastos"]["monto_total"] == 0
    assert dia["gastos"]["por_categoria"] == []
    assert dia["resultado_neto"] == 0
