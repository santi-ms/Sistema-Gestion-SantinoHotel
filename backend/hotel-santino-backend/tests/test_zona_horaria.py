"""
Tests del contrato de zona horaria.

Después de la migración 003_timestamptz, Postgres devuelve siempre datetimes
CON zona horaria. Estos tests fijan que convertirlos sea exacto — incluidos los
horarios cercanos a medianoche, que son los que corrían el día.

El caso que rompió producción: un pedido cargado el 13/09 a las 21:27 en
Argentina (= 14/09 00:27 UTC) se informaba como del 14/09, así que no aparecía
entre los de hoy.
"""
from datetime import datetime, timedelta, timezone

import pytest

from hotel import ARGENTINA_TZ, dia_argentina, normalizar_fecha_argentina

UTC = timezone.utc


# ─────────── Lo que devuelve Postgres con timestamptz ───────────

def test_un_instante_en_utc_se_convierte_exacto():
    """21:27 del 13/09 en Argentina se guarda como 00:27 del 14/09 en UTC."""
    de_la_base = datetime(2026, 9, 14, 0, 27, tzinfo=UTC)

    resultado = normalizar_fecha_argentina(de_la_base)

    assert resultado.day == 13
    assert resultado.hour == 21
    assert resultado.minute == 27
    assert dia_argentina(de_la_base) == datetime(2026, 9, 13).date()


def test_el_pedido_de_la_madrugada_no_retrocede_de_dia():
    """01:30 del 10/03 en Argentina = 04:30 del 10/03 en UTC."""
    de_la_base = datetime(2026, 3, 10, 4, 30, tzinfo=UTC)

    resultado = normalizar_fecha_argentina(de_la_base)

    assert resultado.hour == 1
    assert resultado.minute == 30
    assert dia_argentina(de_la_base) == datetime(2026, 3, 10).date()


@pytest.mark.parametrize(
    "hora_argentina",
    [(2026, 9, 13, 0, 0), (2026, 9, 13, 3, 0), (2026, 9, 13, 12, 0),
     (2026, 9, 13, 20, 59), (2026, 9, 13, 21, 0), (2026, 9, 13, 23, 59)],
)
def test_todo_el_dia_cae_en_el_mismo_dia(hora_argentina):
    """Las 24 horas del 13/09 tienen que contabilizarse el 13/09.

    Las de después de las 21:00 son las que se iban al día siguiente, porque
    en UTC ya pertenecen a la fecha de mañana.
    """
    momento = datetime(*hora_argentina, tzinfo=ARGENTINA_TZ)
    guardado_en_utc = momento.astimezone(UTC)

    assert dia_argentina(guardado_en_utc) == datetime(2026, 9, 13).date()
    assert normalizar_fecha_argentina(guardado_en_utc).hour == momento.hour


def test_una_fecha_que_ya_viene_en_argentina_no_se_toca():
    momento = datetime(2026, 9, 13, 21, 27, tzinfo=ARGENTINA_TZ)

    resultado = normalizar_fecha_argentina(momento)

    assert resultado == momento
    assert resultado.hour == 21


def test_no_importa_en_que_zona_venga_el_instante():
    """El mismo instante expresado en tres zonas da el mismo resultado."""
    instante = datetime(2026, 9, 14, 0, 27, tzinfo=UTC)
    en_otra_zona = instante.astimezone(timezone(timedelta(hours=9)))  # Tokio

    assert normalizar_fecha_argentina(instante) == normalizar_fecha_argentina(en_otra_zona)
    assert dia_argentina(en_otra_zona) == datetime(2026, 9, 13).date()


# ─────────── Fallback para SQLite y filas viejas ───────────

def test_una_fecha_sin_zona_se_lee_como_utc():
    """SQLite ignora el flag de zona, y las filas anteriores a la migración
    están en UTC. En producción con Postgres esta rama no se usa."""
    de_sqlite = datetime(2026, 9, 14, 0, 27)

    resultado = normalizar_fecha_argentina(de_sqlite)

    assert resultado.day == 13
    assert resultado.hour == 21


def test_none_no_rompe():
    assert normalizar_fecha_argentina(None) is None
    assert dia_argentina(None) is None


# ─────────── El modelo declara la zona ───────────

def test_las_columnas_de_fecha_declaran_zona_horaria():
    """Si alguien agrega una columna de fecha sin zona, esto lo detecta."""
    from hotel import (
        Actividad, ChatSession, GastoAdicional, MovimientoStock,
        Pedido, Reserva, Stock,
    )

    sin_zona = []
    for modelo in (Reserva, Pedido, GastoAdicional, Actividad, Stock,
                   ChatSession, MovimientoStock):
        for columna in modelo.__table__.columns:
            tipo = columna.type
            if tipo.__class__.__name__ == "DateTime" and not tipo.timezone:
                sin_zona.append(f"{modelo.__tablename__}.{columna.name}")

    assert not sin_zona, (
        "Estas columnas de fecha no declaran zona horaria: "
        + ", ".join(sin_zona)
        + ". Usá columna_fecha() — ver migración 003_timestamptz."
    )
