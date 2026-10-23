"""
Tests del check-out de reservas.

Antes, `PATCH /reservas/{id}/checkout` pisaba `fecha_checkout` con la fecha de
AYER: borraba la salida real del huésped y le descontaba una noche que sí había
dormido. Estos tests fijan el comportamiento correcto.
"""
from datetime import datetime

import pytest

from fastapi.testclient import TestClient
from passlib.context import CryptContext
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine

import hotel
from hotel import ARGENTINA_TZ, Cliente, Habitacion, Reserva
from tests.fechas_de_prueba import momento_argentino

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


def _reserva(engine, checkin, checkout):
    """Guarda las fechas como las guarda producción (en UTC).

    El endpoint decide el nuevo check-out a partir del DÍA del check-in, así
    que el test depende de que el valor guardado se interprete igual que en
    Postgres. Ver tests/fechas_de_prueba.py.
    """
    with Session(engine) as s:
        s.add(Habitacion(numero=1, tipo="Estándar", capacidad=2, precio=50000))
        s.add(Cliente(nombre="Juan", dni="1", celular="1"))
        s.commit()
        r = Reserva(
            cliente_id=1,
            habitacion_id=1,
            fecha_checkin=momento_argentino(*checkin),
            fecha_checkout=momento_argentino(*checkout),
            seña=0,
            total_estadia=350000,
            forma_pago="efectivo",
            nombre_huesped="Juan",
        )
        s.add(r)
        s.commit()
        s.refresh(r)
        return r.id


def _token_dueño(client):
    """Se pide ANTES de congelar el reloj: el `exp` del token se calcula con
    obtener_fecha_argentina(), pero lo valida el reloj real. Si se emite con la
    fecha mockeada, el token nace vencido."""
    _alta(client, "dueño@santino.com", "secreta", "dueño")
    return _login(client, "dueño@santino.com", "secreta")


def _checkout(client, engine, reserva_id, token):
    r = client.patch(
        f"/reservas/{reserva_id}/checkout", headers={"Authorization": f"Bearer {token}"}
    )
    assert r.status_code == 200, r.text
    with Session(engine) as s:
        return r.json(), s.get(Reserva, reserva_id)


def test_checkout_en_fecha_no_toca_la_fecha_de_salida(api, monkeypatch):
    """El bug original: salir el día previsto perdía la última noche."""
    client, engine = api
    token = _token_dueño(client)
    hoy = datetime(2026, 9, 17, 11, 0, tzinfo=ARGENTINA_TZ)  # el reloj, no un valor guardado
    monkeypatch.setattr(hotel, "obtener_fecha_argentina", lambda: hoy)
    rid = _reserva(engine, (2026, 9, 10), (2026, 9, 17))

    cuerpo, reserva = _checkout(client, engine, rid, token)

    assert reserva.fecha_checkout.date() == datetime(2026, 9, 17).date()
    assert reserva.estado == "completada"
    assert cuerpo["salida_anticipada"] is False


def test_checkout_anticipado_acorta_hasta_hoy_no_hasta_ayer(api, monkeypatch):
    client, engine = api
    token = _token_dueño(client)
    hoy = datetime(2026, 9, 12, 11, 0, tzinfo=ARGENTINA_TZ)  # el reloj, no un valor guardado
    monkeypatch.setattr(hotel, "obtener_fecha_argentina", lambda: hoy)
    rid = _reserva(engine, (2026, 9, 10), (2026, 9, 17))

    cuerpo, reserva = _checkout(client, engine, rid, token)

    # Durmió las noches del 10 y del 11; la habitación queda libre desde el 12.
    assert reserva.fecha_checkout.date() == datetime(2026, 9, 12).date()
    assert cuerpo["salida_anticipada"] is True


def test_checkout_el_mismo_dia_del_checkin_deja_una_noche(api, monkeypatch):
    """Nunca cero noches: antes esto dejaba salida ANTERIOR a la entrada."""
    client, engine = api
    token = _token_dueño(client)
    hoy = datetime(2026, 9, 10, 20, 0, tzinfo=ARGENTINA_TZ)  # el reloj, no un valor guardado
    monkeypatch.setattr(hotel, "obtener_fecha_argentina", lambda: hoy)
    rid = _reserva(engine, (2026, 9, 10), (2026, 9, 17))

    _, reserva = _checkout(client, engine, rid, token)

    assert reserva.fecha_checkout.date() == datetime(2026, 9, 11).date()


def test_checkout_tardio_no_extiende_la_reserva(api, monkeypatch):
    client, engine = api
    token = _token_dueño(client)
    hoy = datetime(2026, 9, 20, 11, 0, tzinfo=ARGENTINA_TZ)  # el reloj, no un valor guardado
    monkeypatch.setattr(hotel, "obtener_fecha_argentina", lambda: hoy)
    rid = _reserva(engine, (2026, 9, 10), (2026, 9, 17))

    _, reserva = _checkout(client, engine, rid, token)

    assert reserva.fecha_checkout.date() == datetime(2026, 9, 17).date()


def test_no_se_hace_checkout_de_una_reserva_cancelada(api, monkeypatch):
    client, engine = api
    token = _token_dueño(client)
    hoy = datetime(2026, 9, 12, 11, 0, tzinfo=ARGENTINA_TZ)  # el reloj, no un valor guardado
    monkeypatch.setattr(hotel, "obtener_fecha_argentina", lambda: hoy)
    rid = _reserva(engine, (2026, 9, 10), (2026, 9, 17))
    with Session(engine) as s:
        r = s.get(Reserva, rid)
        r.estado = "cancelada"
        s.add(r)
        s.commit()

    resp = client.patch(
        f"/reservas/{rid}/checkout", headers={"Authorization": f"Bearer {token}"}
    )
    assert resp.status_code == 400


# ─────────── Check-out de una estadía que todavía no empezó ───────────
# Un empleado cargó una reserva con la fecha equivocada y, para deshacerla, le
# dio al botón Checkout (el único que tiene: cancelar es sólo del dueño). El
# check-out marcaba la reserva "completada" pero NO tocaba las fechas, porque
# el piso `max(hoy, checkin + 1 noche)` queda por delante de la salida cuando
# la estadía ni siquiera empezó. La reserva seguía ocupando esas fechas y nada
# volvía a liberarlas: todo el sistema da por hecho que una reserva completada
# ya tiene su salida en el pasado (ver availability_repo.listar_disponibles).
# Resultado: la habitación quedaba bloqueada para siempre en esos días.


def test_no_se_hace_checkout_de_una_estadia_que_no_empezo(api, monkeypatch):
    client, engine = api
    token = _token_dueño(client)
    # Hoy es 22; la reserva entra mañana 23 y sale el 24.
    monkeypatch.setattr(
        hotel, "obtener_fecha_argentina", lambda: datetime(2026, 10, 22, 18, 0, tzinfo=ARGENTINA_TZ)
    )
    rid = _reserva(engine, (2026, 10, 23), (2026, 10, 24))

    r = client.patch(
        f"/reservas/{rid}/checkout", headers={"Authorization": f"Bearer {token}"}
    )

    assert r.status_code == 400
    with Session(engine) as s:
        reserva = s.get(Reserva, rid)
    # La reserva queda intacta: ni se cierra, ni cambia de fechas.
    assert reserva.estado == "activa"
    assert reserva.fecha_checkout.date() == datetime(2026, 10, 24).date()


def test_el_checkout_nunca_deja_una_reserva_cerrada_con_salida_futura(api, monkeypatch):
    """El invariante que el resto del sistema da por cierto."""
    client, engine = api
    token = _token_dueño(client)
    hoy = datetime(2026, 10, 22, 18, 0, tzinfo=ARGENTINA_TZ)
    monkeypatch.setattr(hotel, "obtener_fecha_argentina", lambda: hoy)
    rid = _reserva(engine, (2026, 10, 20), (2026, 10, 25))  # se va antes de tiempo

    _cuerpo, reserva = _checkout(client, engine, rid, token)

    assert reserva.estado == "completada"
    assert reserva.fecha_checkout.date() <= hoy.date()


# ─────────── Cancelar: el camino correcto para deshacer una carga ───────────


def _reserva_gestion(client, token, habitacion_id, ingreso, egreso):
    return client.post(
        "/reservas-gestion",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "nombre_completo": "Huésped Nuevo",
            "dni": "99999999",
            "celular": "3755000000",
            "cantidad_personas": 2,
            "habitacion_id": habitacion_id,
            "fecha_ingreso": ingreso,
            "fecha_egreso": egreso,
            "precio_total": 90000,
            "seña": 0,
            "forma_pago": "efectivo",
        },
    )


def test_el_empleado_puede_cancelar_una_reserva(api, monkeypatch):
    """Cancelar es lo que hay que hacer con una reserva cargada por error, y
    quien la carga es el empleado. Antes le daba 403 y usaba el check-out."""
    client, engine = api
    _alta(client, "empleado@santino.com", "secreta", "empleado")
    token = _login(client, "empleado@santino.com", "secreta")
    monkeypatch.setattr(
        hotel, "obtener_fecha_argentina", lambda: datetime(2026, 10, 22, 18, 0, tzinfo=ARGENTINA_TZ)
    )
    rid = _reserva(engine, (2026, 10, 23), (2026, 10, 24))

    r = client.delete(f"/reservas/{rid}", headers={"Authorization": f"Bearer {token}"})

    assert r.status_code == 200, r.text
    with Session(engine) as s:
        assert s.get(Reserva, rid).estado == "cancelada"


def test_cancelar_libera_la_habitacion_en_esas_fechas(api, monkeypatch):
    """El caso entero del empleado: cargó mal una fecha y necesita esa misma
    habitación, esos mismos días, para otro huésped."""
    client, engine = api
    _alta(client, "empleado2@santino.com", "secreta", "empleado")
    token = _login(client, "empleado2@santino.com", "secreta")
    monkeypatch.setattr(
        hotel, "obtener_fecha_argentina", lambda: datetime(2026, 10, 22, 18, 0, tzinfo=ARGENTINA_TZ)
    )
    rid = _reserva(engine, (2026, 10, 23), (2026, 10, 24))

    # Con la reserva equivocada viva, la habitación está ocupada.
    assert _reserva_gestion(client, token, 1, "23/10/2026", "24/10/2026").status_code == 400

    client.delete(f"/reservas/{rid}", headers={"Authorization": f"Bearer {token}"})

    # Cancelada, la habitación vuelve a estar disponible esos mismos días.
    assert _reserva_gestion(client, token, 1, "23/10/2026", "24/10/2026").status_code == 200
