"""
Repository para consultas de disponibilidad de habitaciones.
ÚNICO lugar con SQL crudo. Encapsula todas las queries relacionadas con disponibilidad.
"""
from sqlmodel import Session, select, text
from typing import List, Optional, Dict, Any
from datetime import datetime
import sys
from pathlib import Path

# Agregar el directorio raíz al path para imports
ROOT_DIR = Path(__file__).parent.parent.parent
sys.path.insert(0, str(ROOT_DIR))

# Importar modelos
from hotel import Habitacion, Reserva, fecha_para_sql


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
    non_blocking_states: Optional[List[str]] = None,
    blocking_states: Optional[List[str]] = None  # legacy, ignorado
) -> List[Habitacion]:
    """
    Lista habitaciones disponibles que:
    - Tienen capacidad >= min_capacity
    - No tienen reservas solapadas que bloqueen

    Filtra por r.estado, NO por forma_pago. Esto evita el bug donde
    forma_pago='Cancelado' (seña revertida) pero estado='activa' hacía que la
    habitación apareciera disponible cuando no lo estaba.

    Sólo la reserva cancelada libera la habitación — mismo criterio que el
    panel y que POST /reservas-gestion. Antes acá se excluían también las
    'completada', así que el bot podía ofrecer una habitación que el panel
    daba por ocupada. Una reserva completada ya tiene su fecha de salida
    ajustada al día real (ver PATCH /reservas/{id}/checkout), así que el
    solape de fechas alcanza.

    Se usa el ORM y no SQL crudo a propósito: con `text()` los datetime van
    directo al driver y en SQLite terminan comparándose como strings, donde
    "2026-04-10 00:00:00.000000" (guardado) resulta mayor que el parámetro
    "2026-04-10 00:00:00". Con eso, una habitación que se desocupa el mismo
    día que otro huésped entra figuraba ocupada — la rotación más común de un
    hotel. El ORM aplica el mismo formato al guardar y al comparar. Además
    devuelve la habitación completa, con precio_minimo y precio_maximo, que
    `calcular_precio_dinamico` necesita para no caer al precio fijo.
    """
    habitaciones_ocupadas = (
        select(Reserva.habitacion_id)
        .where(
            Reserva.fecha_checkin < checkout,
            Reserva.fecha_checkout > checkin,
            Reserva.estado != "cancelada",
            # Sin esto, una sola fila con habitacion_id NULL haría que el
            # NOT IN no devuelva ninguna habitación.
            Reserva.habitacion_id.is_not(None),
        )
    )

    consulta = (
        select(Habitacion)
        .where(
            Habitacion.capacidad >= min_capacity,
            Habitacion.id.not_in(habitaciones_ocupadas),
        )
        .order_by(Habitacion.capacidad, Habitacion.precio, Habitacion.numero)
    )

    return list(session.exec(consulta).all())


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
        "checkin": fecha_para_sql(checkin),
        "checkout": fecha_para_sql(checkout),
        **estados_params
    }
    
    result = session.execute(query, params)
    return result.scalar() or 0

