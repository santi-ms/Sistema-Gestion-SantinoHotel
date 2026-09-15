"""
Tests del diagnóstico y de los errores visibles.

Un "Network Error" en el navegador no dice nada: puede ser el servidor caído,
una columna faltante o un problema de CORS. Eso costó un diagnóstico entero a
ciegas, porque un error no atrapado salía por el manejador de Starlette —
que está por FUERA del middleware de CORS— y el navegador no podía leer la
respuesta.

Acá se fijan las dos cosas que evitan repetirlo: que los errores lleguen al
frontend con sus cabeceras, y que exista una URL que diga qué está roto.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlmodel import Session, SQLModel

import hotel

ORIGEN = "https://hotel-santino-frontend.vercel.app"


@pytest.fixture
def client(tmp_path, monkeypatch):
    engine = create_engine(f"sqlite:///{tmp_path}/diag.db")
    SQLModel.metadata.create_all(engine)
    monkeypatch.setattr(hotel, "engine", engine)

    def _db():
        with Session(engine) as session:
            yield session

    hotel.app.dependency_overrides[hotel.obtener_db] = _db
    yield TestClient(hotel.app, raise_server_exceptions=False)
    hotel.app.dependency_overrides.clear()


# ─────────── Errores visibles ───────────

def test_un_error_inesperado_llega_con_cabeceras_cors(client):
    """Sin esto el navegador no puede leer la respuesta y dice "Network Error"."""

    @hotel.app.get("/_test_explota")
    def _explota():
        raise RuntimeError("algo se rompió")

    r = client.get("/_test_explota", headers={"Origin": ORIGEN})

    assert r.status_code == 500
    assert r.headers.get("access-control-allow-origin") == ORIGEN


def test_el_frontend_recibe_el_error_de_verdad(client):
    @hotel.app.get("/_test_mensaje")
    def _explota():
        raise RuntimeError("column gastoadicional.categoria does not exist")

    r = client.get("/_test_mensaje", headers={"Origin": ORIGEN})

    assert "categoria does not exist" in r.json()["detail"]
    assert r.json()["ruta"] == "/_test_mensaje"


def test_un_origen_desconocido_no_recibe_cabeceras(client):
    @hotel.app.get("/_test_origen")
    def _explota():
        raise RuntimeError("x")

    r = client.get("/_test_origen", headers={"Origin": "https://sitio-ajeno.com"})

    assert r.status_code == 500
    assert "access-control-allow-origin" not in r.headers


# ─────────── Diagnóstico ───────────

def test_el_diagnostico_no_pide_autenticacion(client):
    """Tiene que poder abrirse desde el navegador cuando algo no anda."""
    assert client.get("/diagnostico").status_code == 200


def test_con_todo_sano_informa_ok(client):
    d = client.get("/diagnostico").json()

    assert d["estado"] == "ok"
    assert d["problemas"] == []
    assert d["columnas_faltantes"] == []
    assert d["consultas"]["gastos"] == 0


def test_detecta_una_columna_faltante(client, monkeypatch):
    """El caso real: faltaba gastoadicional.categoria."""
    from sqlalchemy import text

    with hotel.engine.begin() as con:
        con.execute(text("DROP INDEX IF EXISTS ix_gastoadicional_categoria"))
        con.execute(text("ALTER TABLE gastoadicional DROP COLUMN categoria"))

    d = client.get("/diagnostico").json()

    assert d["estado"] == "con problemas"
    assert "gastoadicional.categoria" in d["columnas_faltantes"]
    assert any("Faltan columnas" in p for p in d["problemas"])


def test_una_consulta_rota_no_ensucia_a_las_demas(client):
    """En Postgres un statement fallido aborta la transacción y todo lo que
    sigue falla también. Sin rollback, una sola consulta rota haría parecer
    que están rotas todas — la pista falsa que este endpoint evita."""
    from sqlalchemy import text

    with hotel.engine.begin() as con:
        con.execute(text("DROP INDEX IF EXISTS ix_gastoadicional_categoria"))
        con.execute(text("ALTER TABLE gastoadicional DROP COLUMN categoria"))

    consultas = client.get("/diagnostico").json()["consultas"]

    assert isinstance(consultas["gastos"], str)      # la rota
    assert consultas["reservas"] == 0                # las sanas siguen sanas
    assert consultas["habitaciones"] == 0
    assert consultas["stock"] == 0


def test_informa_el_commit_desplegado(client, monkeypatch):
    """Para saber si el último deploy realmente salió."""
    monkeypatch.setenv("RAILWAY_GIT_COMMIT_SHA", "abc1234567890")
    assert client.get("/diagnostico").json()["commit"] == "abc12345"
