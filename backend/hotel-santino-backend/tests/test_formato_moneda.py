"""
Tests del formato de moneda que ve el huésped.

El formato por defecto de Python (`f"{x:,.0f}"`) usa la coma como separador de
miles. En Argentina la coma es el separador decimal, así que "$50,000" se lee
como cincuenta pesos: el bot de WhatsApp le estaba mandando al huésped un
número que significa otra cosa.
"""
from hotel import formatear_pesos


def test_separador_de_miles_es_punto():
    assert formatear_pesos(50000) == "$50.000"
    assert formatear_pesos(1500) == "$1.500"
    assert formatear_pesos(1234567) == "$1.234.567"


def test_no_usa_coma_en_ningun_caso():
    for monto in (1000, 50000, 999999, 1000000):
        assert "," not in formatear_pesos(monto)


def test_montos_chicos_y_cero():
    assert formatear_pesos(0) == "$0"
    assert formatear_pesos(999) == "$999"


def test_redondea_a_pesos_enteros():
    assert formatear_pesos(85000.4) == "$85.000"
    assert formatear_pesos(85000.6) == "$85.001"


def test_valores_invalidos_no_rompen_el_mensaje():
    """Un precio nulo no debe tirar abajo la respuesta al huésped."""
    assert formatear_pesos(None) == "$0"
    assert formatear_pesos("no es un número") == "$0"
