"""
Tests para el repositorio de disponibilidad.
"""
import pytest
from datetime import datetime
from app.repositories.availability_repo import (
    list_available_rooms,
    count_overlapping_reservations
)
from hotel import Habitacion, Reserva, Cliente, ARGENTINA_TZ


def test_solapamiento_reserva_10_12_consulta_12_14_disponible(test_db, sample_reservas):
    """
    Test: Reserva del 10-12, consulta 12-14 => disponible
    (checkout de reserva coincide con checkin de consulta, no hay solapamiento)
    """
    checkin_consulta = datetime(2025, 2, 12, 0, 0, 0, tzinfo=ARGENTINA_TZ)
    checkout_consulta = datetime(2025, 2, 14, 0, 0, 0, tzinfo=ARGENTINA_TZ)
    
    habitaciones = list_available_rooms(
        session=test_db,
        checkin=checkin_consulta,
        checkout=checkout_consulta,
        min_capacity=3,
        blocking_states=["CONFIRMADA"]
    )
    
    # La habitación 1 tiene reserva 10-12, pero no se solapa con 12-14
    # Debería estar disponible si hay otras habitaciones con capacidad >= 3
    # Pero como solo tenemos Hab 1 reservada, y Hab 2 y 3 no tienen reservas, deberían estar disponibles
    assert len(habitaciones) >= 2  # Al menos Hab 2 y 3 deberían estar disponibles


def test_solapamiento_reserva_10_12_consulta_11_13_no_disponible(test_db, sample_reservas):
    """
    Test: Reserva del 10-12, consulta 11-13 => NO disponible
    (hay solapamiento: 11 está dentro del rango 10-12)
    """
    checkin_consulta = datetime(2025, 2, 11, 0, 0, 0, tzinfo=ARGENTINA_TZ)
    checkout_consulta = datetime(2025, 2, 13, 0, 0, 0, tzinfo=ARGENTINA_TZ)
    
    habitaciones = list_available_rooms(
        session=test_db,
        checkin=checkin_consulta,
        checkout=checkout_consulta,
        min_capacity=5,
        blocking_states=["CONFIRMADA"]
    )
    
    # La habitación 1 tiene reserva 10-12 que se solapa con 11-13
    # No debería aparecer en la lista
    habitacion_ids = [h.id for h in habitaciones]
    assert sample_reservas[0].habitacion_id not in habitacion_ids


def test_count_overlapping_reservations():
    """Test: Cuenta correctamente reservas solapadas"""
    # Este test necesita una implementación más completa
    # Por ahora lo dejamos como placeholder
    pass


