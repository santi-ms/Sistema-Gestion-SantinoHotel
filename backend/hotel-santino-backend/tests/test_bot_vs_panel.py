"""
Tests de coherencia entre el bot de WhatsApp y el panel.

Los dos consultaban disponibilidad y cotizaban precios por caminos separados,
y los caminos habían divergido:

  Disponibilidad — el repositorio del bot excluía las reservas 'completada'
  además de las 'cancelada'. El panel sólo excluye las canceladas. El bot
  podía ofrecer una habitación que el panel daba por ocupada.

  Precio — el SELECT del repositorio no traía precio_minimo/precio_maximo, así
  que `calcular_precio_dinamico` cortaba en su primer `if` y devolvía el precio
  fijo. El panel cotizaba dinámico, el bot fijo, para las mismas fechas.
"""
from datetime import datetime

import pytest
from sqlmodel import Session

from app.repositories.availability_repo import list_available_rooms
from hotel import (
    ARGENTINA_TZ,
    Cliente,
    Habitacion,
    Reserva,
    calcular_precio_dinamico,
    cotizar_estadia,
)

CHECKIN = datetime(2026, 4, 10, tzinfo=ARGENTINA_TZ)
CHECKOUT = datetime(2026, 4, 13, tzinfo=ARGENTINA_TZ)


@pytest.fixture
def hotel_con_precios(test_db: Session):
    """Tres habitaciones, dos con rango de precio dinámico."""
    test_db.add(Habitacion(numero=1, tipo="Estándar", capacidad=2, precio=70000,
                           precio_minimo=60000, precio_maximo=100000))
    test_db.add(Habitacion(numero=2, tipo="Estándar", capacidad=2, precio=70000,
                           precio_minimo=60000, precio_maximo=100000))
    test_db.add(Habitacion(numero=3, tipo="Confort", capacidad=4, precio=90000))
    test_db.add(Cliente(nombre="Juan", dni="1", celular="1"))
    test_db.commit()
    return test_db


def _reservar(db, habitacion_id, estado, checkin=CHECKIN, checkout=CHECKOUT):
    db.add(
        Reserva(
            cliente_id=1,
            habitacion_id=habitacion_id,
            fecha_checkin=checkin,
            fecha_checkout=checkout,
            seña=0,
            total_estadia=100000,
            forma_pago="efectivo",
            nombre_huesped="Ocupante",
            estado=estado,
        )
    )
    db.commit()


def _disponibles(db, personas=2):
    return {h.numero for h in list_available_rooms(
        session=db, checkin=CHECKIN, checkout=CHECKOUT, min_capacity=personas
    )}


# ─────────── Disponibilidad ───────────

def test_una_reserva_activa_bloquea_la_habitacion(hotel_con_precios):
    _reservar(hotel_con_precios, 1, "activa")
    assert 1 not in _disponibles(hotel_con_precios)


def test_una_reserva_completada_tambien_bloquea(hotel_con_precios):
    """El bug: el bot ofrecía la habitación que el panel daba por ocupada."""
    _reservar(hotel_con_precios, 1, "completada")
    assert 1 not in _disponibles(hotel_con_precios)


def test_solo_la_cancelada_libera_la_habitacion(hotel_con_precios):
    _reservar(hotel_con_precios, 1, "cancelada")
    assert 1 in _disponibles(hotel_con_precios)


def test_una_reserva_de_otras_fechas_no_bloquea(hotel_con_precios):
    _reservar(
        hotel_con_precios, 1, "activa",
        checkin=datetime(2026, 4, 20, tzinfo=ARGENTINA_TZ),
        checkout=datetime(2026, 4, 22, tzinfo=ARGENTINA_TZ),
    )
    assert 1 in _disponibles(hotel_con_precios)


def test_la_salida_el_dia_de_la_entrada_de_otro_no_bloquea(hotel_con_precios):
    """Sale el 10, entra otro el 10: la habitación está libre."""
    _reservar(
        hotel_con_precios, 1, "activa",
        checkin=datetime(2026, 4, 7, tzinfo=ARGENTINA_TZ),
        checkout=CHECKIN,
    )
    assert 1 in _disponibles(hotel_con_precios)


# ─────────── Precio ───────────

def test_el_repositorio_trae_el_rango_de_precios(hotel_con_precios):
    """Sin estas columnas, el precio dinámico nunca se aplicaba."""
    habitaciones = list_available_rooms(
        session=hotel_con_precios, checkin=CHECKIN, checkout=CHECKOUT, min_capacity=2
    )
    hab1 = next(h for h in habitaciones if h.numero == 1)
    assert hab1.precio_minimo == 60000
    assert hab1.precio_maximo == 100000


def test_el_bot_cotiza_igual_que_el_panel(hotel_con_precios):
    """Misma habitación y mismas fechas: un solo precio."""
    # Lo que ve el bot: habitación armada por el repositorio
    del_bot = next(
        h for h in list_available_rooms(
            session=hotel_con_precios, checkin=CHECKIN, checkout=CHECKOUT, min_capacity=2
        )
        if h.numero == 1
    )
    # Lo que ve el panel: la habitación completa de la base
    del_panel = hotel_con_precios.get(Habitacion, 1)

    precio_bot = cotizar_estadia(del_bot, CHECKIN, CHECKOUT, False, hotel_con_precios)
    precio_panel = calcular_precio_dinamico(
        del_panel, CHECKIN, CHECKOUT, hotel_con_precios
    )

    assert precio_bot["precio_por_noche"] == precio_panel


def test_el_precio_sube_cuando_el_hotel_se_llena(hotel_con_precios):
    """Con rango configurado, menos disponibilidad = precio más alto."""
    vacio = cotizar_estadia(
        hotel_con_precios.get(Habitacion, 1), CHECKIN, CHECKOUT, False, hotel_con_precios
    )["precio_por_noche"]

    _reservar(hotel_con_precios, 2, "activa")
    _reservar(hotel_con_precios, 3, "activa")

    lleno = cotizar_estadia(
        hotel_con_precios.get(Habitacion, 1), CHECKIN, CHECKOUT, False, hotel_con_precios
    )["precio_por_noche"]

    assert lleno > vacio
    assert 60000 <= vacio <= 100000
    assert 60000 <= lleno <= 100000


def test_sin_rango_configurado_se_usa_el_precio_fijo(hotel_con_precios):
    precios = cotizar_estadia(
        hotel_con_precios.get(Habitacion, 3), CHECKIN, CHECKOUT, False, hotel_con_precios
    )
    assert precios["precio_por_noche"] == 90000
    assert precios["noches"] == 3
    assert precios["precio_total"] == 270000


def test_el_extra_por_mascota_se_cobra_por_noche(hotel_con_precios):
    sin = cotizar_estadia(
        hotel_con_precios.get(Habitacion, 3), CHECKIN, CHECKOUT, False, hotel_con_precios
    )
    con = cotizar_estadia(
        hotel_con_precios.get(Habitacion, 3), CHECKIN, CHECKOUT, True, hotel_con_precios
    )
    assert con["precio_total"] - sin["precio_total"] == con["extra_mascota"]
    assert con["extra_mascota"] == 7000 * 3
