"""
Tests de la detección automática de zona horaria.

`migrar_fechas_a_timestamptz()` convierte las columnas de fecha, pero sólo si
puede PROBAR en qué zona están medidos los valores guardados. Migrar con la
zona equivocada corre todos los datos 3 horas, así que ante la duda no toca
nada.

El razonamiento es por descarte: una columna de evento (cuándo se cargó un
pedido, cuándo se pagó) nunca puede tener fecha futura. Si el valor más nuevo
es posterior a la hora argentina actual, no puede estar medido en hora
argentina — sería del futuro. Sólo queda UTC.
"""
from datetime import datetime, timedelta

import pytest

from hotel import decidir_si_migrar

# now() del servidor, en las dos lecturas posibles. Argentina va 3 horas atrás.
AHORA_UTC = datetime(2026, 9, 14, 0, 27)
AHORA_AR = datetime(2026, 9, 13, 21, 27)


def test_un_registro_reciente_prueba_que_es_utc():
    """El caso normal: alguien cargó un pedido hace un rato."""
    max_evento = datetime(2026, 9, 14, 0, 20)  # 21:20 argentina

    migrar, motivo = decidir_si_migrar(max_evento, AHORA_UTC, AHORA_AR)

    assert migrar is True
    assert "UTC" in motivo


def test_el_limite_justo_de_las_tres_horas():
    """Un minuto después de la hora argentina actual ya es prueba suficiente."""
    migrar, _ = decidir_si_migrar(AHORA_AR + timedelta(minutes=1), AHORA_UTC, AHORA_AR)
    assert migrar is True


def test_sin_actividad_reciente_no_se_migra():
    """Hace 5 horas que no pasa nada: no se puede probar nada. No se toca."""
    max_evento = datetime(2026, 9, 13, 19, 0)

    migrar, motivo = decidir_si_migrar(max_evento, AHORA_UTC, AHORA_AR)

    assert migrar is False
    assert "actividad" in motivo
    assert "próximo arranque" in motivo


def test_una_base_de_ayer_no_se_migra():
    migrar, _ = decidir_si_migrar(datetime(2026, 9, 12, 22, 0), AHORA_UTC, AHORA_AR)
    assert migrar is False


def test_una_base_vacia_no_se_migra():
    migrar, motivo = decidir_si_migrar(None, AHORA_UTC, AHORA_AR)
    assert migrar is False
    assert "no hay registros" in motivo


def test_fechas_en_el_futuro_abortan_la_decision():
    """Si hay fechas futuras en columnas de evento, el supuesto no vale."""
    max_evento = AHORA_UTC + timedelta(days=1)

    migrar, motivo = decidir_si_migrar(max_evento, AHORA_UTC, AHORA_AR)

    assert migrar is False
    assert "futuro" in motivo


def test_un_desfasaje_chico_de_reloj_se_tolera():
    """Unos segundos de diferencia entre la escritura y el now() no abortan."""
    migrar, _ = decidir_si_migrar(
        AHORA_UTC + timedelta(minutes=2), AHORA_UTC, AHORA_AR
    )
    assert migrar is True


def test_datos_en_hora_argentina_nunca_se_migran_como_utc():
    """El caso que la detección tiene que evitar.

    Si los valores estuvieran en hora argentina, el más nuevo sería como mucho
    la hora argentina actual — nunca posterior. La detección no puede dar
    'migrar como UTC' para ningún valor así.
    """
    for minutos_atras in (0, 1, 30, 120, 60 * 24):
        max_evento = AHORA_AR - timedelta(minutes=minutos_atras)
        migrar, _ = decidir_si_migrar(max_evento, AHORA_UTC, AHORA_AR)
        assert migrar is False, f"no debería migrar con {max_evento}"


def test_las_columnas_de_evento_no_incluyen_fechas_de_reserva():
    """Una reserva puede ser para el mes que viene: rompería la detección."""
    from hotel import COLUMNAS_DE_EVENTO

    tablas_columnas = set(COLUMNAS_DE_EVENTO)
    assert ("reserva", "fecha_checkin") not in tablas_columnas
    assert ("reserva", "fecha_checkout") not in tablas_columnas
    assert ("actividad", "fecha_vencimiento") not in tablas_columnas
    assert ("pedido", "fecha") in tablas_columnas
