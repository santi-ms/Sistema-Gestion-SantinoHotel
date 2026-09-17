"""
Orden de las rutas de stock.

FastAPI resuelve las rutas en orden de declaración. Con `/stock/{stock_id}`
declarada antes que `/stock/estadisticas`, un GET a la segunda caía en la
primera, "estadisticas" no se podía parsear como entero y el dashboard de
stock recibía un 422 en vez de las estadísticas. Estos tests fijan el orden.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine

from hotel import app, obtener_db, verificar_token, Stock


@pytest.fixture
def test_db():
    """Base en memoria compartida entre hilos.

    El fixture de conftest no sirve acá: el TestClient corre los endpoints
    síncronos en un threadpool, y una conexión SQLite en memoria no puede
    usarse desde otro hilo. StaticPool mantiene UNA conexión para todos.
    """
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        yield session
    SQLModel.metadata.drop_all(engine)


@pytest.fixture
def cliente(test_db: Session):
    """Cliente HTTP contra la base en memoria y sin exigir token real."""
    app.dependency_overrides[obtener_db] = lambda: test_db
    app.dependency_overrides[verificar_token] = lambda: {"sub": "test", "rol": "dueño"}
    # Sin `with`: el startup de la app abre el engine real (hotel.db) y
    # arranca el bucle de check-out, que acá no hacen falta.
    yield TestClient(app)
    app.dependency_overrides.clear()


def test_estadisticas_no_cae_en_stock_id(cliente, test_db):
    test_db.add(Stock(nombre_producto="Coca Cola 350ml", categoria="bebidas", cantidad=0))
    test_db.add(Stock(nombre_producto="Papas fritas", categoria="comidas", cantidad=3))
    test_db.commit()

    respuesta = cliente.get("/stock/estadisticas")

    assert respuesta.status_code == 200, respuesta.text
    resumen = respuesta.json()["resumen"]
    assert resumen["total_productos"] == 2
    assert resumen["productos_agotados"] == 1


def test_stock_por_id_sigue_funcionando(cliente, test_db):
    producto = Stock(nombre_producto="Agua 500ml", categoria="bebidas", cantidad=7)
    test_db.add(producto)
    test_db.commit()
    test_db.refresh(producto)

    respuesta = cliente.get(f"/stock/{producto.id}")

    assert respuesta.status_code == 200
    assert respuesta.json()["nombre_producto"] == "Agua 500ml"
