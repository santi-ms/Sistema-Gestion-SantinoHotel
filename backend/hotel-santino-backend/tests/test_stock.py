"""
Tests del circuito de stock.

El stock del sistema se despegaba del real por tres agujeros, todos en la misma
dirección (siempre de menos, nunca de más):

  - Borrar un pedido no reponía lo descontado.
  - Cancelarlo tampoco.
  - Editar los ítems no ajustaba la diferencia.

Y cuando el descuento fallaba o el producto no matcheaba por nombre, se
descartaba en silencio, así que no había forma de saber desde cuándo el conteo
dejó de cuadrar.
"""
import pytest
from sqlmodel import Session, select

from hotel import (
    ItemPedido,
    MovimientoStock,
    Stock,
    reponer_stock_de_pedido,
    sincronizar_stock_de_pedido,
)


@pytest.fixture
def stock(test_db: Session):
    """Heladera con tres productos."""
    test_db.add(Stock(nombre_producto="Coca Cola 350ml", categoria="bebidas", cantidad=24))
    test_db.add(Stock(nombre_producto="Cerveza Quilmes 1L", categoria="bebidas", cantidad=12))
    test_db.add(Stock(nombre_producto="Papas fritas", categoria="comidas", cantidad=10))
    test_db.commit()
    return test_db


def _cantidad(db, nombre):
    return db.exec(
        select(Stock).where(Stock.nombre_producto == nombre)
    ).first().cantidad


def _item(descripcion, cantidad=1, precio=1000):
    return ItemPedido(descripcion=descripcion, cantidad=cantidad, precio=precio)


# ─────────── Descuento ───────────

def test_descuenta_lo_vendido(stock):
    sincronizar_stock_de_pedido([_item("Coca Cola 350ml", 3)], stock, pedido_id=1)
    assert _cantidad(stock, "Coca Cola 350ml") == 21


def test_descuenta_aunque_la_descripcion_traiga_agregados(stock):
    """"Coca Cola 350ml - Fría" tiene que encontrar "Coca Cola 350ml"."""
    sincronizar_stock_de_pedido([_item("Coca Cola 350ml - Fría", 2)], stock, pedido_id=1)
    assert _cantidad(stock, "Coca Cola 350ml") == 22


def test_tambien_descuenta_las_comidas(stock):
    """Antes sólo se miraba la categoría 'bebidas'."""
    sincronizar_stock_de_pedido([_item("Papas fritas", 4)], stock, pedido_id=1)
    assert _cantidad(stock, "Papas fritas") == 6


def test_un_producto_que_no_esta_en_stock_queda_informado(stock):
    """No es un error, pero antes se descartaba en silencio."""
    informe = sincronizar_stock_de_pedido(
        [_item("Milanesa con puré", 1)], stock, pedido_id=1
    )
    assert informe["sin_seguimiento"] == ["Milanesa con puré"]
    assert informe["descontados"] == []


def test_vender_mas_de_lo_que_hay_queda_registrado(stock):
    informe = sincronizar_stock_de_pedido(
        [_item("Cerveza Quilmes 1L", 20)], stock, pedido_id=1
    )
    assert _cantidad(stock, "Cerveza Quilmes 1L") == 0
    assert informe["sin_stock_suficiente"] == [
        {"producto": "Cerveza Quilmes 1L", "faltaban": 8}
    ]


def test_la_coincidencia_exacta_le_gana_a_la_parcial(test_db):
    """Antes los dos criterios convivían en un solo bucle, así que el producto
    que venía primero con coincidencia parcial le ganaba al exacto."""
    test_db.add(Stock(nombre_producto="Cerveza", categoria="bebidas", cantidad=10))
    test_db.add(Stock(nombre_producto="Cerveza Quilmes", categoria="bebidas", cantidad=10))
    test_db.commit()

    sincronizar_stock_de_pedido([_item("Cerveza Quilmes", 3)], test_db, pedido_id=1)

    assert _cantidad(test_db, "Cerveza Quilmes") == 7
    assert _cantidad(test_db, "Cerveza") == 10


# ─────────── Reposición ───────────

def test_reponer_devuelve_lo_descontado(stock):
    sincronizar_stock_de_pedido([_item("Coca Cola 350ml", 5)], stock, pedido_id=1)
    assert _cantidad(stock, "Coca Cola 350ml") == 19

    reponer_stock_de_pedido(1, stock, motivo="pedido cancelado")

    assert _cantidad(stock, "Coca Cola 350ml") == 24


def test_reponer_dos_veces_no_infla_el_stock(stock):
    """Idempotencia: si no, cancelar y borrar el mismo pedido duplicaría."""
    sincronizar_stock_de_pedido([_item("Coca Cola 350ml", 5)], stock, pedido_id=1)

    reponer_stock_de_pedido(1, stock, motivo="cancelado")
    reponer_stock_de_pedido(1, stock, motivo="eliminado")

    assert _cantidad(stock, "Coca Cola 350ml") == 24


def test_reponer_solo_devuelve_lo_que_se_llego_a_descontar(stock):
    """Si sólo había 12 y se vendieron 20, se reponen 12, no 20."""
    sincronizar_stock_de_pedido([_item("Cerveza Quilmes 1L", 20)], stock, pedido_id=1)
    assert _cantidad(stock, "Cerveza Quilmes 1L") == 0

    reponer_stock_de_pedido(1, stock, motivo="cancelado")

    assert _cantidad(stock, "Cerveza Quilmes 1L") == 12


def test_reponer_un_pedido_sin_movimientos_no_hace_nada(stock):
    assert reponer_stock_de_pedido(999, stock, motivo="x") == 0
    assert _cantidad(stock, "Coca Cola 350ml") == 24


def test_reponer_funciona_aunque_el_producto_se_haya_renombrado(stock):
    """Se repone por stock_id, no volviendo a buscar por nombre."""
    sincronizar_stock_de_pedido([_item("Coca Cola 350ml", 5)], stock, pedido_id=1)

    producto = stock.exec(
        select(Stock).where(Stock.nombre_producto == "Coca Cola 350ml")
    ).first()
    producto.nombre_producto = "Coca Cola lata 350"
    stock.add(producto)
    stock.commit()

    reponer_stock_de_pedido(1, stock, motivo="cancelado")

    assert _cantidad(stock, "Coca Cola lata 350") == 24


# ─────────── Edición de un pedido ───────────

def test_editar_hacia_arriba_descuenta_la_diferencia(stock):
    sincronizar_stock_de_pedido([_item("Cerveza Quilmes 1L", 2)], stock, pedido_id=1)
    assert _cantidad(stock, "Cerveza Quilmes 1L") == 10

    sincronizar_stock_de_pedido([_item("Cerveza Quilmes 1L", 10)], stock, pedido_id=1)

    assert _cantidad(stock, "Cerveza Quilmes 1L") == 2


def test_editar_hacia_abajo_devuelve_la_diferencia(stock):
    sincronizar_stock_de_pedido([_item("Coca Cola 350ml", 10)], stock, pedido_id=1)
    sincronizar_stock_de_pedido([_item("Coca Cola 350ml", 2)], stock, pedido_id=1)
    assert _cantidad(stock, "Coca Cola 350ml") == 22


def test_sacar_un_producto_del_pedido_lo_devuelve_entero(stock):
    sincronizar_stock_de_pedido(
        [_item("Coca Cola 350ml", 3), _item("Papas fritas", 2)], stock, pedido_id=1
    )
    assert _cantidad(stock, "Papas fritas") == 8

    sincronizar_stock_de_pedido([_item("Coca Cola 350ml", 3)], stock, pedido_id=1)

    assert _cantidad(stock, "Papas fritas") == 10
    assert _cantidad(stock, "Coca Cola 350ml") == 21


def test_pedidos_distintos_no_se_pisan(stock):
    sincronizar_stock_de_pedido([_item("Coca Cola 350ml", 3)], stock, pedido_id=1)
    sincronizar_stock_de_pedido([_item("Coca Cola 350ml", 4)], stock, pedido_id=2)
    assert _cantidad(stock, "Coca Cola 350ml") == 17

    reponer_stock_de_pedido(1, stock, motivo="cancelado")

    assert _cantidad(stock, "Coca Cola 350ml") == 20  # sólo vuelven las 3


# ─────────── Historial ───────────

def test_cada_movimiento_queda_atado_a_su_pedido(stock):
    sincronizar_stock_de_pedido([_item("Coca Cola 350ml", 3)], stock, pedido_id=7)

    movimientos = stock.exec(
        select(MovimientoStock).where(MovimientoStock.pedido_id == 7)
    ).all()

    assert len(movimientos) == 1
    assert movimientos[0].tipo == "venta"
    assert movimientos[0].diferencia == -3


def test_la_reposicion_deja_su_propio_movimiento(stock):
    sincronizar_stock_de_pedido([_item("Coca Cola 350ml", 3)], stock, pedido_id=7)
    reponer_stock_de_pedido(7, stock, motivo="Pedido #7 eliminado")

    movimientos = stock.exec(
        select(MovimientoStock).where(MovimientoStock.pedido_id == 7)
    ).all()
    devoluciones = [m for m in movimientos if m.tipo == "devolucion"]

    assert len(devoluciones) == 1
    assert devoluciones[0].diferencia == 3
    assert "eliminado" in devoluciones[0].motivo


def test_la_cantidad_cero_no_genera_movimiento(stock):
    informe = sincronizar_stock_de_pedido(
        [_item("Coca Cola 350ml", 0)], stock, pedido_id=1
    )
    assert informe["descontados"] == []
    assert _cantidad(stock, "Coca Cola 350ml") == 24


# ─────────── Los endpoints, de punta a punta ───────────

from fastapi.testclient import TestClient
from passlib.context import CryptContext
from sqlalchemy.pool import StaticPool
from sqlmodel import SQLModel, create_engine

import hotel

HASHER_DE_TEST = CryptContext(schemes=["pbkdf2_sha256"])


@pytest.fixture
def api(monkeypatch):
    monkeypatch.setattr(hotel, "pwd_context", HASHER_DE_TEST)
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(engine)

    def _db():
        with Session(engine) as session:
            yield session

    hotel.app.dependency_overrides[hotel.obtener_db] = _db
    with Session(engine) as s:
        s.add(Stock(nombre_producto="Coca Cola 350ml", categoria="bebidas", cantidad=24))
        s.commit()

    with TestClient(hotel.app) as client:
        client.post("/registro", json={"email": "d@s.com", "contraseña": "x", "rol": "dueño"})
        token = client.post(
            "/login", data={"username": "d@s.com", "password": "x"}
        ).json()["access_token"]
        client.headers["Authorization"] = f"Bearer {token}"
        yield client, engine
    hotel.app.dependency_overrides.clear()


def _stock_actual(engine):
    with Session(engine) as s:
        return _cantidad(s, "Coca Cola 350ml")


def _crear_pedido(client, cantidad=3):
    r = client.post("/pedidos", json={
        "items": [{"descripcion": "Coca Cola 350ml", "cantidad": cantidad, "precio": 2000}],
        "forma_pago": "efectivo",
        "estado": "PAGADO",
    })
    assert r.status_code == 200, r.text
    return r.json()


def test_endpoint_crear_pedido_descuenta_e_informa(api):
    client, engine = api

    cuerpo = _crear_pedido(client, 3)

    assert _stock_actual(engine) == 21
    assert cuerpo["stock"]["descontados"] == [
        {"producto": "Coca Cola 350ml", "cantidad": 3}
    ]


def test_endpoint_eliminar_pedido_repone(api):
    client, engine = api
    pedido_id = _crear_pedido(client, 3)["id"]
    assert _stock_actual(engine) == 21

    r = client.delete(f"/pedidos/{pedido_id}")

    assert r.status_code == 200, r.text
    assert r.json()["productos_repuestos"] == 1
    assert _stock_actual(engine) == 24


def test_endpoint_cancelar_pedido_repone(api):
    client, engine = api
    pedido_id = _crear_pedido(client, 5)["id"]
    assert _stock_actual(engine) == 19

    r = client.put(f"/pedidos/{pedido_id}", json={
        "items": [{"descripcion": "Coca Cola 350ml", "cantidad": 5, "precio": 2000}],
        "estado": "CANCELADO",
    })

    assert r.status_code == 200, r.text
    assert _stock_actual(engine) == 24


def test_endpoint_editar_cantidad_ajusta_la_diferencia(api):
    client, engine = api
    pedido_id = _crear_pedido(client, 2)["id"]
    assert _stock_actual(engine) == 22

    r = client.put(f"/pedidos/{pedido_id}", json={
        "items": [{"descripcion": "Coca Cola 350ml", "cantidad": 6, "precio": 2000}],
        "forma_pago": "efectivo",
        "estado": "PAGADO",
    })

    assert r.status_code == 200, r.text
    assert _stock_actual(engine) == 18


def test_endpoint_cancelar_y_despues_borrar_no_duplica(api):
    """Los dos reponen; entre los dos no pueden devolver el doble."""
    client, engine = api
    pedido_id = _crear_pedido(client, 4)["id"]

    client.put(f"/pedidos/{pedido_id}", json={
        "items": [{"descripcion": "Coca Cola 350ml", "cantidad": 4, "precio": 2000}],
        "estado": "CANCELADO",
    })
    client.delete(f"/pedidos/{pedido_id}")

    assert _stock_actual(engine) == 24
