"""
Configuración de pytest para tests.
Define fixtures comunes para testing.
"""
import pytest
from sqlmodel import Session, create_engine, SQLModel
from datetime import datetime, timezone, timedelta
import sys
from pathlib import Path

# Agregar el directorio raíz al path
ROOT_DIR = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT_DIR))

from hotel import Habitacion, Reserva, Cliente, ARGENTINA_TZ


@pytest.fixture
def test_db():
    """
    Crea una base de datos en memoria para tests.
    """
    engine = create_engine("sqlite:///:memory:", echo=False)
    SQLModel.metadata.create_all(engine)
    
    with Session(engine) as session:
        yield session
    
    # Limpiar después de los tests
    SQLModel.metadata.drop_all(engine)


@pytest.fixture
def sample_habitaciones(test_db: Session):
    """
    Crea habitaciones de ejemplo para los tests.
    """
    habitaciones = [
        Habitacion(numero=1, tipo="Estándar", capacidad=5, precio=90000, descripcion="Hab 5 personas"),
        Habitacion(numero=2, tipo="Estándar", capacidad=3, precio=65000, descripcion="Hab 3 personas"),
        Habitacion(numero=3, tipo="Estándar", capacidad=4, precio=80000, descripcion="Hab 4 personas"),
    ]
    
    for hab in habitaciones:
        test_db.add(hab)
    test_db.commit()
    
    # Refresh para obtener los IDs
    for hab in habitaciones:
        test_db.refresh(hab)
    
    return habitaciones


@pytest.fixture
def sample_reservas(test_db: Session, sample_habitaciones):
    """
    Crea reservas de ejemplo para tests de solapamiento.
    """
    cliente = Cliente(nombre="Test Cliente", dni="12345678", celular="1234567890")
    test_db.add(cliente)
    test_db.commit()
    test_db.refresh(cliente)
    
    # Reserva del 10 al 12 de febrero
    fecha_checkin = datetime(2025, 2, 10, 0, 0, 0, tzinfo=ARGENTINA_TZ)
    fecha_checkout = datetime(2025, 2, 12, 0, 0, 0, tzinfo=ARGENTINA_TZ)
    
    reserva = Reserva(
        cliente_id=cliente.id,
        habitacion_id=sample_habitaciones[0].id,  # Hab 1
        fecha_checkin=fecha_checkin,
        fecha_checkout=fecha_checkout,
        seña=45000,
        total_estadia=90000,
        forma_pago="CONFIRMADA",
        nombre_huesped="Test Cliente"
    )
    test_db.add(reserva)
    test_db.commit()
    test_db.refresh(reserva)
    
    return [reserva]


