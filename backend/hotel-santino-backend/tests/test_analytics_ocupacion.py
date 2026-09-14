"""
Tests de ocupación en /analytics/detalle-diario.

Una estadía de varias noches debe figurar ocupando la habitación TODOS los días
que dura, no sólo el día de check-in; y la facturación debe seguir imputándose
íntegra al día de check-in (alineada con /finanzas/ingresos).
"""
from datetime import datetime

import pytest

from tests.fechas_de_prueba import momento_argentino
from sqlmodel import Session

from hotel import ARGENTINA_TZ, Cliente, Reserva, detalle_diario_analytics

TOKEN = {"rol": "dueño"}


def _crear_reserva(db: Session, habitacion_id, checkin, checkout, total=100000):
    cliente = Cliente(nombre="Test", dni="1", celular="1")
    db.add(cliente)
    db.commit()
    db.refresh(cliente)

    reserva = Reserva(
        cliente_id=cliente.id,
        habitacion_id=habitacion_id,
        fecha_checkin=momento_argentino(*checkin),
        fecha_checkout=momento_argentino(*checkout),
        seña=0,
        total_estadia=total,
        forma_pago="efectivo",
        nombre_huesped="Test",
    )
    db.add(reserva)
    db.commit()
    db.refresh(reserva)
    return reserva


def _dias(resultado):
    return {d["fecha"]: d for d in resultado["dias"]}


def test_estadia_larga_ocupa_todas_las_noches(test_db, sample_habitaciones):
    hab = sample_habitaciones[0]
    _crear_reserva(test_db, hab.id, (2025, 3, 10), (2025, 3, 17))

    dias = _dias(detalle_diario_analytics("2025-03-01", "2025-03-31", test_db, TOKEN))

    # Del 10 al 16 inclusive: 7 noches. El 17 (check-out) ya está libre.
    for dia in range(10, 17):
        fecha = f"2025-03-{dia:02d}"
        assert dias[fecha]["reservas"]["habitaciones_ocupadas"] == 1, fecha
        assert dias[fecha]["reservas"]["habitaciones_ids"] == [hab.id]

    assert dias["2025-03-17"]["reservas"]["habitaciones_ocupadas"] == 0
    assert dias["2025-03-09"]["reservas"]["habitaciones_ocupadas"] == 0


def test_facturacion_solo_en_el_dia_de_checkin(test_db, sample_habitaciones):
    _crear_reserva(test_db, sample_habitaciones[0].id, (2025, 3, 10), (2025, 3, 17), total=350000)

    resultado = detalle_diario_analytics("2025-03-01", "2025-03-31", test_db, TOKEN)
    dias = _dias(resultado)

    assert dias["2025-03-10"]["reservas"]["monto_total"] == 350000
    assert dias["2025-03-10"]["reservas"]["cantidad"] == 1
    for dia in range(11, 18):
        assert dias[f"2025-03-{dia:02d}"]["reservas"]["monto_total"] == 0

    # El ingreso no se duplica al repartir la ocupación.
    assert resultado["resumen"]["total_ingresos_reservas"] == 350000
    assert resultado["resumen"]["total_reservas"] == 1


def test_estadia_que_empieza_antes_del_rango(test_db, sample_habitaciones):
    hab = sample_habitaciones[0]
    _crear_reserva(test_db, hab.id, (2025, 2, 26), (2025, 3, 3), total=200000)

    resultado = detalle_diario_analytics("2025-03-01", "2025-03-31", test_db, TOKEN)
    dias = _dias(resultado)

    # Ocupa el 1 y el 2 de marzo aunque el check-in fue en febrero.
    assert dias["2025-03-01"]["reservas"]["habitaciones_ocupadas"] == 1
    assert dias["2025-03-02"]["reservas"]["habitaciones_ocupadas"] == 1
    assert dias["2025-03-03"]["reservas"]["habitaciones_ocupadas"] == 0

    # Pero su plata pertenece a febrero, no al rango consultado.
    assert resultado["resumen"]["total_ingresos_reservas"] == 0
    assert resultado["resumen"]["total_reservas"] == 0


def test_reserva_cancelada_no_ocupa(test_db, sample_habitaciones):
    reserva = _crear_reserva(test_db, sample_habitaciones[0].id, (2025, 3, 10), (2025, 3, 14))
    reserva.estado = "cancelada"
    test_db.add(reserva)
    test_db.commit()

    dias = _dias(detalle_diario_analytics("2025-03-01", "2025-03-31", test_db, TOKEN))
    for dia in range(10, 15):
        assert dias[f"2025-03-{dia:02d}"]["reservas"]["habitaciones_ocupadas"] == 0


def test_varias_habitaciones_la_misma_noche(test_db, sample_habitaciones):
    _crear_reserva(test_db, sample_habitaciones[0].id, (2025, 3, 10), (2025, 3, 13))
    _crear_reserva(test_db, sample_habitaciones[1].id, (2025, 3, 11), (2025, 3, 12))

    dias = _dias(detalle_diario_analytics("2025-03-01", "2025-03-31", test_db, TOKEN))

    assert dias["2025-03-10"]["reservas"]["habitaciones_ocupadas"] == 1
    assert dias["2025-03-11"]["reservas"]["habitaciones_ocupadas"] == 2
    assert dias["2025-03-12"]["reservas"]["habitaciones_ocupadas"] == 1
    assert dias["2025-03-13"]["reservas"]["habitaciones_ocupadas"] == 0
