"""
Repository para consultas de disponibilidad de habitaciones.
ÚNICO lugar con SQL crudo. Encapsula todas las queries relacionadas con disponibilidad.
"""
from sqlmodel import Session, text
from typing import List, Optional, Dict, Any
from datetime import datetime
import sys
from pathlib import Path

# Agregar el directorio raíz al path para imports
ROOT_DIR = Path(__file__).parent.parent.parent
sys.path.insert(0, str(ROOT_DIR))

# Importar modelos
from hotel import Habitacion


def list_rooms_with_capacity(
    session: Session, 
    min_capacity: int
) -> List[Habitacion]:
    """
    Lista todas las habitaciones con capacidad >= min_capacity.
    
    Args:
        session: Sesión de base de datos
        min_capacity: Capacidad mínima requerida
        
    Returns:
        Lista de habitaciones que cumplen con la capacidad mínima
    """
    query = text("""
        SELECT id, numero, tipo, precio, capacidad, descripcion
        FROM habitacion
        WHERE capacidad >= :min_capacity
        ORDER BY capacidad ASC, precio ASC, numero ASC
    """)
    
    result = session.execute(query, {"min_capacity": min_capacity})
    rows = result.fetchall()
    
    # Convertir rows a objetos Habitacion
    habitaciones = []
    for row in rows:
        habitacion = Habitacion(
            id=row.id if hasattr(row, 'id') else row[0],
            numero=row.numero if hasattr(row, 'numero') else row[1],
            tipo=row.tipo if hasattr(row, 'tipo') else row[2],
            precio=row.precio if hasattr(row, 'precio') else row[3],
            capacidad=row.capacidad if hasattr(row, 'capacidad') else row[4],
            descripcion=row.descripcion if hasattr(row, 'descripcion') else (row[5] if len(row) > 5 else None)
        )
        habitaciones.append(habitacion)
    
    return habitaciones


def list_available_rooms(
    session: Session,
    checkin: datetime,
    checkout: datetime,
    min_capacity: int,
    blocking_states: Optional[List[str]] = None
) -> List[Habitacion]:
    """
    Lista habitaciones disponibles que:
    - Tienen capacidad >= min_capacity
    - No tienen reservas solapadas en estados bloqueantes
    
    Lógica de solapamiento:
    Una reserva bloquea si: r.checkin < checkout AND r.checkout > checkin
    
    Args:
        session: Sesión de base de datos
        checkin: Fecha de check-in solicitada
        checkout: Fecha de check-out solicitada
        min_capacity: Capacidad mínima requerida
        blocking_states: Estados de reserva que bloquean disponibilidad.
                        Si es None, se usan los estados por defecto.
    
    Returns:
        Lista de habitaciones disponibles
    """
    if blocking_states is None:
        blocking_states = ["PENDIENTE_SEÑA", "CONFIRMADA", "Seña Pendiente", "Seña Recibida"]
    
    # Construir condiciones OR para compatibilidad con SQLite y PostgreSQL
    if len(blocking_states) == 0:
        # Si no hay estados bloqueantes, todas las habitaciones están disponibles
        query = text("""
            SELECT DISTINCT h.id, h.numero, h.tipo, h.precio, h.capacidad, h.descripcion
            FROM habitacion h
            WHERE h.capacidad >= :min_capacity
            ORDER BY h.capacidad ASC, h.precio ASC, h.numero ASC
        """)
        params = {
            "min_capacity": min_capacity
        }
    else:
        # Usar múltiples OR para compatibilidad con ambos motores
        estados_conditions = " OR ".join([f"r.forma_pago = :estado_{i}" for i in range(len(blocking_states))])
        estados_params = {f"estado_{i}": estado for i, estado in enumerate(blocking_states)}
        
        query = text(f"""
            SELECT DISTINCT h.id, h.numero, h.tipo, h.precio, h.capacidad, h.descripcion
            FROM habitacion h
            WHERE h.capacidad >= :min_capacity
            AND h.id NOT IN (
                SELECT DISTINCT r.habitacion_id
                FROM reserva r
                WHERE r.fecha_checkin < :checkout
                AND r.fecha_checkout > :checkin
                AND ({estados_conditions})
            )
            ORDER BY h.capacidad ASC, h.precio ASC, h.numero ASC
        """)
        
        params = {
            "min_capacity": min_capacity,
            "checkin": checkin,
            "checkout": checkout,
            **estados_params
        }
    
    result = session.execute(query, params)
    rows = result.fetchall()
    
    # Convertir rows a objetos Habitacion
    habitaciones = []
    for row in rows:
        # Manejar tanto Row como tupla
        row_id = row.id if hasattr(row, 'id') else row[0]
        row_numero = row.numero if hasattr(row, 'numero') else row[1]
        row_tipo = row.tipo if hasattr(row, 'tipo') else row[2]
        row_precio = row.precio if hasattr(row, 'precio') else (row[3] if len(row) > 3 else None)
        row_capacidad = row.capacidad if hasattr(row, 'capacidad') else (row[4] if len(row) > 4 else None)
        row_descripcion = row.descripcion if hasattr(row, 'descripcion') else (row[5] if len(row) > 5 else None)
        
        habitacion = Habitacion(
            id=row_id,
            numero=row_numero,
            tipo=row_tipo,
            precio=row_precio if row_precio is not None else 0,
            capacidad=row_capacidad,
            descripcion=row_descripcion
        )
        habitaciones.append(habitacion)
    
    return habitaciones


def count_overlapping_reservations(
    session: Session,
    habitacion_id: int,
    checkin: datetime,
    checkout: datetime,
    blocking_states: Optional[List[str]] = None
) -> int:
    """
    Cuenta cuántas reservas bloqueantes se solapan con el rango de fechas dado.
    
    Args:
        session: Sesión de base de datos
        habitacion_id: ID de la habitación
        checkin: Fecha de check-in
        checkout: Fecha de check-out
        blocking_states: Estados que bloquean
        
    Returns:
        Número de reservas bloqueantes que se solapan
    """
    if blocking_states is None:
        blocking_states = ["PENDIENTE_SEÑA", "CONFIRMADA", "Seña Pendiente", "Seña Recibida"]
    
    if len(blocking_states) == 0:
        return 0
    
    # Construir condiciones OR para compatibilidad con SQLite y PostgreSQL
    estados_conditions = " OR ".join([f"forma_pago = :estado_{i}" for i in range(len(blocking_states))])
    estados_params = {f"estado_{i}": estado for i, estado in enumerate(blocking_states)}
    
    query = text(f"""
        SELECT COUNT(*)
        FROM reserva
        WHERE habitacion_id = :habitacion_id
        AND fecha_checkin < :checkout
        AND fecha_checkout > :checkin
        AND ({estados_conditions})
    """)
    
    params = {
        "habitacion_id": habitacion_id,
        "checkin": checkin,
        "checkout": checkout,
        **estados_params
    }
    
    result = session.execute(query, params)
    return result.scalar() or 0

