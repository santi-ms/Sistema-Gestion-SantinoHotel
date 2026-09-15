"""
Tests del cierre de estadías (check-out).

La versión anterior hacía lo contrario de lo que debía, y esto lo fija:

  - Escribía en `forma_pago` en vez de `estado`, así que la reserva quedaba
    "activa" y el cierre no cerraba nada.
  - Reescribía `fecha_checkout` con la fecha de hoy: para una reserva vieja
    eso EXTENDÍA la estadía (una de enero pasaba a durar ocho meses).
  - La consulta no tenía límite inferior, así que alcanzaba a todo el
    historial de una sola pasada.
  - Y destruía la forma de pago real al pisarla con "Checkout Automático".
"""
from datetime import datetime, timedelta

import pytest
from sqlmodel import Session, select

from tests.fechas_de_prueba import momento_argentino

import hotel
from hotel import (
    ARGENTINA_TZ,
    Cliente,
    Habitacion,
    Reserva,
    cerrar_estadias_terminadas,
)

# 15/09 a las 11:00 — después de la hora de check-out (10:00).
AHORA = datetime(2026, 9, 15, 11, 0, tzinfo=ARGENTINA_TZ)


@pytest.fixture
def reservas(test_db: Session):
    """Cuatro reservas en los estados que importan."""
    test_db.add(Habitacion(numero=1, tipo="Estándar", capacidad=2, precio=50000))
    test_db.add(Cliente(nombre="Juan", dni="1", celular="1"))
    test_db.commit()

    casos = [
        ("Terminada en enero", (2026, 1, 10), (2026, 1, 15), "efectivo", "activa"),
        ("Salió ayer", (2026, 9, 12), (2026, 9, 14), "transferencia", "activa"),
        ("Sale hoy", (2026, 9, 13), (2026, 9, 15), "efectivo", "activa"),
        ("Sale mañana", (2026, 9, 14), (2026, 9, 16), "efectivo", "activa"),
        ("Cancelada vieja", (2026, 2, 1), (2026, 2, 3), "efectivo", "cancelada"),
    ]
    for nombre, ci, co, forma_pago, estado in casos:
        test_db.add(
            Reserva(
                cliente_id=1,
                habitacion_id=1,
                fecha_checkin=momento_argentino(*ci),
                fecha_checkout=momento_argentino(*co),
                seña=0,
                total_estadia=100000,
                forma_pago=forma_pago,
                nombre_huesped=nombre,
                estado=estado,
            )
        )
    test_db.commit()
    return test_db


def _por_nombre(db, nombre):
    return db.exec(select(Reserva).where(Reserva.nombre_huesped == nombre)).first()


# ─────────── Lo que sí tiene que hacer ───────────

def test_cierra_la_estadia_que_termino_hoy(reservas):
    cerrar_estadias_terminadas(reservas, AHORA)
    assert _por_nombre(reservas, "Sale hoy").estado == "completada"


def test_cierra_las_que_quedaron_abiertas_de_antes(reservas):
    """Si el sistema estuvo caído, se pone al día."""
    cerrar_estadias_terminadas(reservas, AHORA)
    assert _por_nombre(reservas, "Salió ayer").estado == "completada"
    assert _por_nombre(reservas, "Terminada en enero").estado == "completada"


def test_no_toca_la_estadia_en_curso(reservas):
    cerrar_estadias_terminadas(reservas, AHORA)
    assert _por_nombre(reservas, "Sale mañana").estado == "activa"


def test_no_toca_las_canceladas(reservas):
    cerrar_estadias_terminadas(reservas, AHORA)
    assert _por_nombre(reservas, "Cancelada vieja").estado == "cancelada"


def test_informa_lo_que_cerro(reservas):
    r = cerrar_estadias_terminadas(reservas, AHORA)
    assert r["total_cerradas"] == 3
    assert {c["huesped"] for c in r["reservas_cerradas"]} == {
        "Terminada en enero", "Salió ayer", "Sale hoy",
    }


# ─────────── Lo que NO tiene que tocar ───────────

def test_no_reescribe_ninguna_fecha_de_salida(reservas):
    """El bug más caro: la reserva de enero pasaba a tener salida hoy."""
    antes = {
        r.nombre_huesped: hotel.dia_argentina(r.fecha_checkout)
        for r in reservas.exec(select(Reserva)).all()
    }

    cerrar_estadias_terminadas(reservas, AHORA)

    despues = {
        r.nombre_huesped: hotel.dia_argentina(r.fecha_checkout)
        for r in reservas.exec(select(Reserva)).all()
    }
    assert antes == despues
    assert despues["Terminada en enero"] == datetime(2026, 1, 15).date()


def test_no_pisa_la_forma_de_pago(reservas):
    cerrar_estadias_terminadas(reservas, AHORA)

    assert _por_nombre(reservas, "Salió ayer").forma_pago == "transferencia"
    assert _por_nombre(reservas, "Sale hoy").forma_pago == "efectivo"


def test_no_cambia_la_duracion_de_la_estadia(reservas):
    """Una reserva de 5 días sigue siendo de 5 días después de cerrarla."""
    r = _por_nombre(reservas, "Terminada en enero")
    noches_antes = (
        hotel.dia_argentina(r.fecha_checkout) - hotel.dia_argentina(r.fecha_checkin)
    ).days

    cerrar_estadias_terminadas(reservas, AHORA)

    r = _por_nombre(reservas, "Terminada en enero")
    noches_despues = (
        hotel.dia_argentina(r.fecha_checkout) - hotel.dia_argentina(r.fecha_checkin)
    ).days
    assert noches_antes == noches_despues == 5


# ─────────── La hora de check-out ───────────

def test_antes_de_las_10_la_de_hoy_sigue_en_curso(reservas):
    temprano = datetime(2026, 9, 15, 8, 0, tzinfo=ARGENTINA_TZ)

    cerrar_estadias_terminadas(reservas, temprano)

    assert _por_nombre(reservas, "Sale hoy").estado == "activa"
    # Pero las de días anteriores se cierran igual.
    assert _por_nombre(reservas, "Salió ayer").estado == "completada"


def test_a_las_10_en_punto_ya_se_cierra(reservas):
    cerrar_estadias_terminadas(
        reservas, datetime(2026, 9, 15, 10, 0, tzinfo=ARGENTINA_TZ)
    )
    assert _por_nombre(reservas, "Sale hoy").estado == "completada"


# ─────────── Correrlo muchas veces ───────────

def test_correrlo_dos_veces_no_cierra_nada_la_segunda(reservas):
    primera = cerrar_estadias_terminadas(reservas, AHORA)
    segunda = cerrar_estadias_terminadas(reservas, AHORA)

    assert primera["total_cerradas"] == 3
    assert segunda["total_cerradas"] == 0


def test_correrlo_muchas_veces_no_degrada_los_datos(reservas):
    """Con la versión anterior, cada corrida movía las fechas otra vez."""
    for _ in range(5):
        cerrar_estadias_terminadas(reservas, AHORA)

    r = _por_nombre(reservas, "Terminada en enero")
    assert hotel.dia_argentina(r.fecha_checkout) == datetime(2026, 1, 15).date()
    assert r.forma_pago == "efectivo"
    assert r.estado == "completada"


def test_una_base_sin_reservas_vencidas_no_hace_nada(test_db):
    r = cerrar_estadias_terminadas(test_db, AHORA)
    assert r["total_cerradas"] == 0
    assert r["success"] is True


# ─────────── Que el cierre no ensucie el análisis ───────────

def test_checkout_automatico_ya_no_cuenta_como_medio_de_pago(reservas):
    """Las reservas que alcanzó la versión anterior quedaron con
    forma_pago = "Checkout Automático". No es un medio de pago."""
    assert hotel._normalizar_forma_pago("Checkout Automático") == "No especificado"
    assert hotel._normalizar_forma_pago("checkout_manual") == "No especificado"
    assert hotel._normalizar_forma_pago("efectivo") == "efectivo"
