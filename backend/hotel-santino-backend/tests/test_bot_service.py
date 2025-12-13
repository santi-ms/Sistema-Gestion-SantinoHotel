"""
Tests unitarios para el service del bot de WhatsApp.
"""
import pytest
from datetime import datetime
from app.services.bot_service import (
    procesar_mensaje,
    generar_respuesta_confirmacion_reserva,
    parse_date,
    parse_int,
    parse_bool,
    contiene_palabra,
    ESTADO_INICIO,
    ESTADO_ESPERANDO_CHECKIN,
    ESTADO_ESPERANDO_CHECKOUT,
    ESTADO_ESPERANDO_PERSONAS,
    ESTADO_ESPERANDO_MASCOTA,
    ESTADO_MOSTRANDO_DISPONIBILIDAD,
    ESTADO_ESPERANDO_CONFIRMACION,
    ESTADO_DERIVADO_A_HUMANO
)

# Mock de ChatSession
class MockChatSession:
    def __init__(self):
        self.phone = "5493791234567"
        self.estado = ESTADO_INICIO
        self.checkin = None
        self.checkout = None
        self.personas = None
        self.mascota = None
        self.reserva_id = None
        self.bot_pausado = False


def test_parse_date_valido():
    """Test: Parsea fecha válida"""
    fecha = parse_date("2025-02-15")
    assert fecha is not None
    assert fecha.year == 2025
    assert fecha.month == 2
    assert fecha.day == 15


def test_parse_date_invalido():
    """Test: Rechaza fecha inválida"""
    fecha = parse_date("15/02/2025")
    assert fecha is None


def test_parse_int_valido():
    """Test: Parsea int válido"""
    num = parse_int("5")
    assert num == 5


def test_parse_int_invalido():
    """Test: Rechaza int inválido"""
    num = parse_int("abc")
    assert num is None


def test_parse_bool_si():
    """Test: Parsea 'si' como True"""
    assert parse_bool("si") == True
    assert parse_bool("sí") == True
    assert parse_bool("yes") == True


def test_parse_bool_no():
    """Test: Parsea 'no' como False"""
    assert parse_bool("no") == False
    assert parse_bool("n") == False


def test_contiene_palabra():
    """Test: Detecta palabras clave"""
    assert contiene_palabra("quiero hablar con un humano", ["humano", "persona"]) == True
    assert contiene_palabra("hola", ["humano"]) == False


def test_estado_inicio():
    """Test: Estado INICIO responde con saludo"""
    session = MockChatSession()
    session.estado = ESTADO_INICIO
    
    reply, nuevo_estado, datos = procesar_mensaje(session, "hola")
    
    assert nuevo_estado == ESTADO_ESPERANDO_CHECKIN
    assert "check-in" in reply.lower()


def test_estado_esperando_checkin_fecha_invalida():
    """Test: Fecha inválida repregunta"""
    session = MockChatSession()
    session.estado = ESTADO_ESPERANDO_CHECKIN
    
    reply, nuevo_estado, datos = procesar_mensaje(session, "15/02/2025")
    
    assert nuevo_estado == ESTADO_ESPERANDO_CHECKIN
    assert "formato" in reply.lower()


def test_estado_esperando_checkin_fecha_valida():
    """Test: Fecha válida avanza a checkout"""
    session = MockChatSession()
    session.estado = ESTADO_ESPERANDO_CHECKIN
    
    reply, nuevo_estado, datos = procesar_mensaje(session, "2025-02-15")
    
    assert nuevo_estado == ESTADO_ESPERANDO_CHECKOUT
    assert "check-out" in reply.lower()
    assert datos.get("checkin") == "2025-02-15"


def test_estado_esperando_checkout_invalido():
    """Test: Checkout <= checkin repregunta"""
    session = MockChatSession()
    session.estado = ESTADO_ESPERANDO_CHECKOUT
    session.checkin = "2025-02-20"
    
    reply, nuevo_estado, datos = procesar_mensaje(session, "2025-02-15")
    
    assert nuevo_estado == ESTADO_ESPERANDO_CHECKOUT
    assert "posterior" in reply.lower()


def test_estado_esperando_personas_invalido():
    """Test: Personas fuera de rango repregunta"""
    session = MockChatSession()
    session.estado = ESTADO_ESPERANDO_PERSONAS
    
    reply, nuevo_estado, datos = procesar_mensaje(session, "10")
    
    assert nuevo_estado == ESTADO_ESPERANDO_PERSONAS
    assert "1 y 7" in reply


def test_estado_esperando_personas_valido():
    """Test: Personas válido avanza a mascota"""
    session = MockChatSession()
    session.estado = ESTADO_ESPERANDO_PERSONAS
    
    reply, nuevo_estado, datos = procesar_mensaje(session, "3")
    
    assert nuevo_estado == ESTADO_ESPERANDO_MASCOTA
    assert datos.get("personas") == 3


def test_comando_humano():
    """Test: Comando 'humano' pausa bot"""
    session = MockChatSession()
    
    reply, nuevo_estado, datos = procesar_mensaje(session, "quiero hablar con un humano")
    
    assert nuevo_estado == ESTADO_DERIVADO_A_HUMANO
    assert datos.get("pausar_bot") == True
    assert "persona" in reply.lower()


def test_comando_reset():
    """Test: Comando 'reset' reinicia"""
    session = MockChatSession()
    session.estado = ESTADO_ESPERANDO_PERSONAS
    session.checkin = "2025-02-15"
    session.personas = 3
    
    reply, nuevo_estado, datos = procesar_mensaje(session, "reset")
    
    assert nuevo_estado == ESTADO_INICIO
    assert datos.get("reset_campos") == True
    assert "reiniciamos" in reply.lower()


def test_generar_respuesta_confirmacion():
    """Test: Genera mensaje de confirmación con datos de pago"""
    respuesta = generar_respuesta_confirmacion_reserva(123, 50000.0)
    
    assert "Reserva creada" in respuesta
    assert "50000" in respuesta
    assert "santinocasitas" in respuesta
    assert "CVU" in respuesta


def test_estado_bot_pausado_no_responde():
    """Test: Bot pausado no responde"""
    session = MockChatSession()
    session.bot_pausado = True
    
    reply, nuevo_estado, datos = procesar_mensaje(session, "hola")
    
    assert reply is None
    assert nuevo_estado == ESTADO_INICIO  # No cambia estado


def test_estado_esperando_mascota_valido():
    """Test: Mascota válido solicita disponibilidad"""
    session = MockChatSession()
    session.estado = ESTADO_ESPERANDO_MASCOTA
    
    reply, nuevo_estado, datos = procesar_mensaje(session, "si")
    
    assert nuevo_estado == ESTADO_MOSTRANDO_DISPONIBILIDAD
    assert datos.get("mascota") == True
    assert datos.get("necesita_disponibilidad") == True

