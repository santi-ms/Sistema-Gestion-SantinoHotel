"""
Tests unitarios para el service de disponibilidad.
"""
import pytest
from datetime import datetime
from app.services.availability_service import (
    pick_best_room,
    calculate_pricing,
    calculate_nights
)
from hotel import Habitacion, ARGENTINA_TZ


def test_pick_best_room_capacidad_exacta():
    """Test: Si hay habitación con capacidad exacta, la elige"""
    habitaciones = [
        Habitacion(id=1, numero=4, tipo="Estándar", capacidad=4, precio=80000),
        Habitacion(id=2, numero=3, tipo="Estándar", capacidad=3, precio=65000),
    ]
    
    mejor = pick_best_room(habitaciones, personas=3)
    
    assert mejor is not None
    assert mejor.numero == 3  # Debe elegir la de capacidad 3
    assert mejor.capacidad == 3


def test_pick_best_room_capacidad_mayor():
    """Test: Si no hay capacidad exacta, elige la menor que cumpla"""
    habitaciones = [
        Habitacion(id=1, numero=5, tipo="Estándar", capacidad=5, precio=90000),
        Habitacion(id=2, numero=4, tipo="Estándar", capacidad=4, precio=80000),
    ]
    
    mejor = pick_best_room(habitaciones, personas=3)
    
    assert mejor is not None
    assert mejor.numero == 4  # Debe elegir la de capacidad 4 (menor que cumpla)
    assert mejor.capacidad == 4


def test_pick_best_room_lista_vacia():
    """Test: Si la lista está vacía, retorna None"""
    mejor = pick_best_room([], personas=3)
    assert mejor is None


def test_calculate_nights():
    """Test: Calcula correctamente el número de noches"""
    checkin = datetime(2025, 2, 10, 0, 0, 0, tzinfo=ARGENTINA_TZ)
    checkout = datetime(2025, 2, 12, 0, 0, 0, tzinfo=ARGENTINA_TZ)
    
    noches = calculate_nights(checkin, checkout)
    assert noches == 2


def test_calculate_nights_minimo_1():
    """Test: Mínimo 1 noche incluso si las fechas son iguales"""
    fecha = datetime(2025, 2, 10, 0, 0, 0, tzinfo=ARGENTINA_TZ)
    
    noches = calculate_nights(fecha, fecha)
    assert noches == 1


def test_calculate_pricing_sin_mascota():
    """Test: Calcula precio sin mascota"""
    habitacion = Habitacion(
        id=1, numero=3, tipo="Estándar", 
        capacidad=3, precio=65000
    )
    
    precios = calculate_pricing(habitacion, noches=2, mascota=False)
    
    assert precios["precio_por_noche"] == 65000
    assert precios["noches"] == 2
    assert precios["precio_base"] == 130000
    assert precios["extra_mascota"] == 0
    assert precios["precio_total"] == 130000


def test_calculate_pricing_con_mascota():
    """Test: Calcula precio con mascota (+$7000 por noche)"""
    habitacion = Habitacion(
        id=1, numero=3, tipo="Estándar",
        capacidad=3, precio=65000
    )
    
    precios = calculate_pricing(habitacion, noches=2, mascota=True)
    
    assert precios["precio_por_noche"] == 65000
    assert precios["noches"] == 2
    assert precios["precio_base"] == 130000
    assert precios["extra_mascota"] == 14000  # 7000 * 2 noches
    assert precios["precio_total"] == 144000  # 130000 + 14000


def test_calculate_pricing_mascota_una_noche():
    """Test: Mascota suma $7000 por noche"""
    habitacion = Habitacion(
        id=1, numero=3, tipo="Estándar",
        capacidad=3, precio=65000
    )
    
    precios = calculate_pricing(habitacion, noches=1, mascota=True)
    
    assert precios["extra_mascota"] == 7000
    assert precios["precio_total"] == 72000  # 65000 + 7000


