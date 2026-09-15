"""
Tests de sincronización del esquema.

Qué rompió en producción
------------------------
Las migraciones del arranque eran una lista de ALTER TABLE escritos a mano que
compartían UNA transacción. El primero (`ADD COLUMN origen`, sin IF NOT EXISTS)
falla siempre porque la columna ya existe, y en Postgres un statement fallido
aborta la transacción: todo lo que venía después se ignoraba en silencio.

Entonces, al agregar `categoria` al modelo de gastos, la columna nunca llegó a
producción. La app pedía una columna inexistente, la consulta explotaba con
UndefinedColumn, el endpoint devolvía 500 sin cabeceras CORS y el navegador lo
mostraba como "Network Error" en la pantalla de Analytics.

Estos tests fijan lo único que hace falta para que no vuelva a pasar: que lo
que los modelos declaran exista de verdad en la base.
"""
import pytest
from sqlalchemy import create_engine, inspect, text
from sqlmodel import SQLModel

import hotel


@pytest.fixture
def base(tmp_path, monkeypatch):
    """Base con el esquema completo, como la deja create_all()."""
    engine = create_engine(f"sqlite:///{tmp_path}/esquema.db")
    SQLModel.metadata.create_all(engine)
    monkeypatch.setattr(hotel, "engine", engine)
    return engine


def _soltar_columna(con, tabla, columna):
    """SQLite no deja borrar una columna indexada, así que primero va el índice.
    Es sólo para armar el escenario del test; producción es Postgres."""
    con.execute(text(f"DROP INDEX IF EXISTS ix_{tabla}_{columna}"))
    con.execute(text(f"ALTER TABLE {tabla} DROP COLUMN {columna}"))


def _columnas(engine, tabla):
    return {c["name"] for c in inspect(engine).get_columns(tabla)}


def test_no_falta_ninguna_columna_despues_de_create_all(base):
    """Red de seguridad: el esquema y los modelos tienen que coincidir."""
    inspector = inspect(base)
    faltantes = []
    for nombre, tabla in SQLModel.metadata.tables.items():
        if nombre not in inspector.get_table_names():
            continue
        reales = {c["name"] for c in inspector.get_columns(nombre)}
        for columna in tabla.columns:
            if columna.name not in reales:
                faltantes.append(f"{nombre}.{columna.name}")

    assert not faltantes, f"El esquema no tiene estas columnas: {faltantes}"


def test_una_columna_que_falta_se_agrega_sola(base):
    """El caso exacto del incidente: gastoadicional.categoria."""
    with base.begin() as con:
        _soltar_columna(con, "gastoadicional", "categoria")
    assert "categoria" not in _columnas(base, "gastoadicional")

    hotel.sincronizar_columnas_faltantes()

    assert "categoria" in _columnas(base, "gastoadicional")


def test_se_agregan_varias_columnas_de_varias_tablas(base):
    with base.begin() as con:
        _soltar_columna(con, "gastoadicional", "categoria")
        _soltar_columna(con, "gastoadicional", "forma_pago")
        _soltar_columna(con, "movimientostock", "pedido_id")

    hotel.sincronizar_columnas_faltantes()

    assert "categoria" in _columnas(base, "gastoadicional")
    assert "forma_pago" in _columnas(base, "gastoadicional")
    assert "pedido_id" in _columnas(base, "movimientostock")


def test_una_columna_que_falla_no_arrastra_a_las_demas(base, monkeypatch):
    """Lo que causó el incidente: un ALTER fallido cancelaba a los siguientes.

    Cada uno va ahora en su propia transacción, así que el que falla es el
    único que no se aplica.
    """
    with base.begin() as con:
        _soltar_columna(con, "gastoadicional", "categoria")
        _soltar_columna(con, "gastoadicional", "forma_pago")

    original = hotel.text
    fallidas = {"n": 0}

    def text_que_falla_una_vez(sql):
        if "ADD COLUMN categoria" in sql and fallidas["n"] == 0:
            fallidas["n"] += 1
            return original("ESTO NO ES SQL VALIDO")
        return original(sql)

    monkeypatch.setattr(hotel, "text", text_que_falla_una_vez)
    hotel.sincronizar_columnas_faltantes()

    assert fallidas["n"] == 1, "el test no ejercitó el fallo"
    # La que falló no está, pero la siguiente sí: no se arrastraron.
    assert "forma_pago" in _columnas(base, "gastoadicional")


def test_correrlo_dos_veces_no_rompe(base):
    hotel.sincronizar_columnas_faltantes()
    hotel.sincronizar_columnas_faltantes()
    assert "categoria" in _columnas(base, "gastoadicional")


def test_no_rompe_si_la_base_no_tiene_tablas(tmp_path, monkeypatch):
    """create_all() se encarga de las tablas nuevas; esto no debe explotar."""
    engine = create_engine(f"sqlite:///{tmp_path}/vacia.db")
    monkeypatch.setattr(hotel, "engine", engine)

    hotel.sincronizar_columnas_faltantes()  # no debe levantar excepción


def test_no_toca_los_datos_existentes(base):
    with base.begin() as con:
        con.execute(text(
            "INSERT INTO gastoadicional (descripcion, monto, fecha) "
            "VALUES ('Gasto viejo', 50000, '2026-09-10 12:00:00')"
        ))
        _soltar_columna(con, "gastoadicional", "categoria")

    hotel.sincronizar_columnas_faltantes()

    with base.connect() as con:
        fila = con.execute(text(
            "SELECT descripcion, monto, categoria FROM gastoadicional"
        )).first()

    assert fila[0] == "Gasto viejo"
    assert fila[1] == 50000
    assert fila[2] is None  # se agrega vacía; se lee como "otros"
