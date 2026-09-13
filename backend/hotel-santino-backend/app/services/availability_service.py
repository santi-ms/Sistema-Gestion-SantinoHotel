"""
Service de disponibilidad de habitaciones.
Contiene toda la lógica de negocio reutilizable.
"""
from typing import List, Optional, Dict, Any
from datetime import datetime
from sqlmodel import Session
import logging

import sys
from pathlib import Path

# Agregar el directorio raíz al path para imports
ROOT_DIR = Path(__file__).parent.parent.parent
sys.path.insert(0, str(ROOT_DIR))

from app.repositories.availability_repo import list_available_rooms
from hotel import Habitacion

logger = logging.getLogger(__name__)

# Extra por mascota por noche
EXTRA_MASCOTA_POR_NOCHE = 7000


def get_available_rooms(
    session: Session,
    checkin: datetime,
    checkout: datetime,
    personas: int
) -> List[Habitacion]:
    """
    Obtiene habitaciones disponibles para un rango de fechas y número de personas.
    Filtra por r.estado NOT IN ('cancelada','completada') — ver availability_repo.py.
    """
    return list_available_rooms(
        session=session,
        checkin=checkin,
        checkout=checkout,
        min_capacity=personas,
    )


def pick_best_room(
    rooms: List[Habitacion],
    personas: int
) -> Optional[Habitacion]:
    """
    Selecciona la mejor habitación de una lista.
    
    Criterios de selección (en orden):
    1. Menor capacidad posible que cumpla >= personas
    2. Si hay empate, menor precio
    3. Si hay empate, menor número de habitación
    
    Args:
        rooms: Lista de habitaciones disponibles (en cualquier orden)
        personas: Número de personas requeridas
        
    Returns:
        La mejor habitación o None si ninguna cumple la capacidad
    """
    if not rooms:
        return None

    # El criterio se aplica acá y no se confía en el orden que traiga el
    # llamador: antes esta función devolvía rooms[0] asumiendo que venían
    # ordenadas del repositorio. Con una lista armada en otro lado (o un
    # ORDER BY que cambie) el huésped terminaba en una habitación más grande
    # y más cara de la que necesitaba, sin que nada lo indicara.
    candidatas = [
        h for h in rooms
        if h.capacidad is not None and h.capacidad >= personas
    ]
    if not candidatas:
        return None

    return min(
        candidatas,
        key=lambda h: (h.capacidad, h.precio if h.precio is not None else 0, h.numero),
    )


def calculate_pricing(
    habitacion: Habitacion,
    noches: int,
    mascota: bool = False
) -> Dict[str, Any]:
    """
    Calcula el precio total según la habitación y número de noches.
    
    Usa el precio de la habitación desde la base de datos.
    
    Args:
        habitacion: Objeto Habitacion con precio y capacidad
        noches: Número de noches
        mascota: Si incluye mascota
        
    Returns:
        Diccionario con breakdown de precios:
        {
            "precio_por_noche": float,
            "noches": int,
            "precio_base": float,
            "extra_mascota": float,
            "precio_total": float
        }
    """
    precio_por_noche = habitacion.precio if habitacion.precio is not None else 0
    
    if precio_por_noche == 0:
        logger.warning(f"Habitación {habitacion.numero} tiene precio 0 o NULL")
    
    precio_base = precio_por_noche * noches
    extra_mascota = EXTRA_MASCOTA_POR_NOCHE * noches if mascota else 0
    precio_total = precio_base + extra_mascota
    
    return {
        "precio_por_noche": precio_por_noche,
        "noches": noches,
        "precio_base": precio_base,
        "extra_mascota": extra_mascota,
        "precio_total": precio_total
    }


def calculate_nights(checkin: datetime, checkout: datetime) -> int:
    """
    Calcula el número de noches entre checkin y checkout.
    
    Args:
        checkin: Fecha de check-in
        checkout: Fecha de check-out
        
    Returns:
        Número de noches (mínimo 1)
    """
    if checkout <= checkin:
        return 1
    
    noches = (checkout - checkin).days
    return max(1, noches)

