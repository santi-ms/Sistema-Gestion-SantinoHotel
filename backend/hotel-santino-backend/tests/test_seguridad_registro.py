"""
Tests del alta de usuarios.

  C1 — /registro era público y aceptaba el rol desde el body.
  C2 — SECRET_KEY tenía un valor por defecto en el código.

(El check-out, C4, se testea aparte en test_checkout.py.)
"""
import pytest
from fastapi.testclient import TestClient
from passlib.context import CryptContext
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine, select

import hotel
from hotel import Usuario

# passlib+bcrypt choca en algunos entornos y no es lo que se está probando acá.
HASHER_DE_TEST = CryptContext(schemes=["pbkdf2_sha256"])


@pytest.fixture
def api(monkeypatch):
    """App con base en memoria. Devuelve (client, engine)."""
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
    with TestClient(hotel.app) as client:
        yield client, engine
    hotel.app.dependency_overrides.clear()


def _alta(client, email, contraseña, rol, token=None):
    headers = {"Authorization": f"Bearer {token}"} if token else {}
    return client.post(
        "/registro",
        json={"email": email, "contraseña": contraseña, "rol": rol},
        headers=headers,
    )


def _login(client, email, contraseña):
    r = client.post("/login", data={"username": email, "password": contraseña})
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


# ─────────── C1: alta de usuarios ───────────

def test_primer_usuario_se_puede_crear_sin_token(api):
    """Bootstrap: con la tabla vacía hay que poder crear la cuenta inicial."""
    client, _ = api
    assert _alta(client, "dueño@santino.com", "secreta", "dueño").status_code == 200


def test_registro_cerrado_una_vez_que_existe_un_usuario(api):
    client, _ = api
    _alta(client, "dueño@santino.com", "secreta", "dueño")

    r = _alta(client, "atacante@test.com", "hack", "dueño")
    assert r.status_code == 401
    assert "dueño" in r.json()["detail"]


def test_un_empleado_no_puede_crear_usuarios(api):
    """El caso que importa: un token válido pero sin rol de dueño."""
    client, _ = api
    _alta(client, "dueño@santino.com", "secreta", "dueño")
    token_dueño = _login(client, "dueño@santino.com", "secreta")
    _alta(client, "empleado@santino.com", "otra", "empleado", token=token_dueño)

    token_empleado = _login(client, "empleado@santino.com", "otra")
    r = _alta(client, "atacante@test.com", "hack", "dueño", token=token_empleado)
    assert r.status_code == 403


def test_token_invalido_no_habilita_el_alta(api):
    client, _ = api
    _alta(client, "dueño@santino.com", "secreta", "dueño")
    r = _alta(client, "atacante@test.com", "hack", "dueño", token="no.es.un.token")
    assert r.status_code == 401


def test_el_dueño_si_puede_crear_usuarios(api):
    client, engine = api
    _alta(client, "dueño@santino.com", "secreta", "dueño")
    token = _login(client, "dueño@santino.com", "secreta")

    assert _alta(client, "empleado@santino.com", "otra", "empleado", token=token).status_code == 200
    with Session(engine) as s:
        assert len(s.exec(select(Usuario)).all()) == 2


def test_email_duplicado_es_rechazado(api):
    client, _ = api
    _alta(client, "dueño@santino.com", "secreta", "dueño")
    token = _login(client, "dueño@santino.com", "secreta")

    r = _alta(client, "DUEÑO@santino.com", "otra", "empleado", token=token)
    assert r.status_code == 409


def test_el_email_no_distingue_mayusculas_al_entrar(api):
    client, _ = api
    _alta(client, "Dueño@Santino.com", "secreta", "dueño")
    assert _login(client, "dueño@santino.com", "secreta")


# ─────────── C2: SECRET_KEY ───────────

def test_el_servidor_no_arranca_sin_secret_key(monkeypatch):
    monkeypatch.setattr(hotel, "SECRET_KEY", None)
    with pytest.raises(RuntimeError, match="SECRET_KEY"):
        hotel.verificar_configuracion_obligatoria()
