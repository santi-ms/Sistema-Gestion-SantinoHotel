"""
Service para manejar la lógica del bot de WhatsApp.
Maneja el estado de conversación y genera respuestas determinísticas.
"""
from typing import Optional, Tuple
from datetime import datetime
import re
import logging

import sys
from pathlib import Path

# Agregar el directorio raíz al path para imports
ROOT_DIR = Path(__file__).parent.parent.parent
sys.path.insert(0, str(ROOT_DIR))

from hotel import ChatSession, ARGENTINA_TZ

logger = logging.getLogger(__name__)

# Estados soportados
ESTADO_INICIO = "INICIO"
ESTADO_ESPERANDO_CHECKIN = "ESPERANDO_CHECKIN"
ESTADO_ESPERANDO_CHECKOUT = "ESPERANDO_CHECKOUT"
ESTADO_ESPERANDO_PERSONAS = "ESPERANDO_PERSONAS"
ESTADO_ESPERANDO_MASCOTA = "ESPERANDO_MASCOTA"
ESTADO_MOSTRANDO_DISPONIBILIDAD = "MOSTRANDO_DISPONIBILIDAD"
ESTADO_ESPERANDO_CONFIRMACION = "ESPERANDO_CONFIRMACION"
ESTADO_DERIVADO_A_HUMANO = "DERIVADO_A_HUMANO"

# Comandos especiales
PALABRAS_HUMANO = ["humano", "asesor", "persona", "recepción", "recepcion", "hablar con alguien", "atencion humana"]
PALABRAS_RESET = ["reset", "reiniciar", "empezar de nuevo"]
PALABRAS_CONFIRMACION = ["confirmo", "reservá", "reserva", "dale", "ok", "si", "sí", "confirmar"]
PALABRAS_CANCELACION = ["no", "cancelar", "cancelar reserva"]


def parse_date(fecha_str: str) -> Optional[datetime]:
    """
    Intenta parsear una fecha en formato YYYY-MM-DD.
    
    Returns:
        datetime objeto si es válido, None si no
    """
    try:
        fecha = datetime.strptime(fecha_str.strip(), "%Y-%m-%d")
        return fecha.replace(tzinfo=ARGENTINA_TZ)
    except ValueError:
        return None


def parse_int(numero_str: str) -> Optional[int]:
    """
    Intenta parsear un entero.
    
    Returns:
        int si es válido, None si no
    """
    try:
        return int(numero_str.strip())
    except ValueError:
        return None


def parse_bool(texto: str) -> Optional[bool]:
    """
    Parsea si/no a boolean.
    
    Returns:
        bool si es válido, None si no
    """
    texto_lower = texto.lower().strip()
    if texto_lower in ["si", "sí", "yes", "y", "s", "1", "true"]:
        return True
    elif texto_lower in ["no", "n", "0", "false"]:
        return False
    return None


def contiene_palabra(texto: str, palabras: list) -> bool:
    """
    Verifica si el texto contiene alguna de las palabras clave.
    """
    texto_lower = texto.lower()
    return any(palabra.lower() in texto_lower for palabra in palabras)


def procesar_mensaje(
    session: ChatSession,
    texto: str,
    disponibilidad_data: Optional[dict] = None
) -> Tuple[str, str, dict]:
    """
    Procesa un mensaje del usuario y determina la respuesta y nuevo estado.
    
    Args:
        session: Sesión de chat actual
        texto: Texto del mensaje del usuario
        disponibilidad_data: Datos de disponibilidad si ya se consultó
        
    Returns:
        Tuple de (reply, nuevo_estado, datos_adicionales)
        datos_adicionales puede contener: {"necesita_disponibilidad": True, ...}
    """
    texto_lower = texto.lower().strip()
    
    # Si está pausado o derivado a humano, no responder
    if session.bot_pausado or session.estado == ESTADO_DERIVADO_A_HUMANO:
        return None, session.estado, {}
    
    # Comando: Derivar a humano
    if contiene_palabra(texto, PALABRAS_HUMANO):
        return (
            "Perfecto, ahora te atiende una persona 🙂",
            ESTADO_DERIVADO_A_HUMANO,
            {"pausar_bot": True}
        )
    
    # Comando: Reset
    if contiene_palabra(texto, PALABRAS_RESET):
        return (
            "Listo, reiniciamos 😊 ¿Para qué fecha sería el check-in? (AAAA-MM-DD)",
            ESTADO_INICIO,
            {"reset_campos": True}
        )
    
    # Lógica por estado
    if session.estado == ESTADO_INICIO:
        return (
            "¡Hola! 😊 ¿Para qué fecha sería el check-in? (AAAA-MM-DD)",
            ESTADO_ESPERANDO_CHECKIN,
            {}
        )
    
    elif session.estado == ESTADO_ESPERANDO_CHECKIN:
        fecha = parse_date(texto)
        if not fecha:
            return (
                "Por favor, ingresá la fecha en formato AAAA-MM-DD. Ejemplo: 2025-02-15",
                ESTADO_ESPERANDO_CHECKIN,
                {}
            )
        
        # Validar que la fecha no sea en el pasado (opcional, pero recomendado)
        hoy = datetime.now(ARGENTINA_TZ).date()
        if fecha.date() < hoy:
            return (
                "La fecha de check-in no puede ser en el pasado. Por favor, ingresá una fecha válida (AAAA-MM-DD):",
                ESTADO_ESPERANDO_CHECKIN,
                {}
            )
        
        return (
            f"Perfecto, check-in: {fecha.date()}. ¿Cuál sería la fecha de check-out? (AAAA-MM-DD)",
            ESTADO_ESPERANDO_CHECKOUT,
            {"checkin": fecha.date().isoformat()}
        )
    
    elif session.estado == ESTADO_ESPERANDO_CHECKOUT:
        fecha = parse_date(texto)
        if not fecha:
            return (
                "Por favor, ingresá la fecha en formato AAAA-MM-DD. Ejemplo: 2025-02-17",
                ESTADO_ESPERANDO_CHECKOUT,
                {}
            )
        
        # Validar que checkout > checkin
        if session.checkin:
            checkin_date = datetime.strptime(session.checkin, "%Y-%m-%d").date()
            if fecha.date() <= checkin_date:
                return (
                    "La fecha de check-out debe ser posterior a la fecha de check-in. Por favor, ingresá una fecha válida (AAAA-MM-DD):",
                    ESTADO_ESPERANDO_CHECKOUT,
                    {}
                )
        
        return (
            f"Perfecto, check-out: {fecha.date()}. ¿Cuántas personas serían? (1-7)",
            ESTADO_ESPERANDO_PERSONAS,
            {"checkout": fecha.date().isoformat()}
        )
    
    elif session.estado == ESTADO_ESPERANDO_PERSONAS:
        num_personas = parse_int(texto)
        if not num_personas or num_personas < 1 or num_personas > 7:
            return (
                "Por favor, ingresá un número entre 1 y 7:",
                ESTADO_ESPERANDO_PERSONAS,
                {}
            )
        
        return (
            "¿Viajás con mascota pequeña? (si/no)",
            ESTADO_ESPERANDO_MASCOTA,
            {"personas": num_personas}
        )
    
    elif session.estado == ESTADO_ESPERANDO_MASCOTA:
        mascota = parse_bool(texto)
        if mascota is None:
            return (
                "Por favor, respondé 'si' o 'no':",
                ESTADO_ESPERANDO_MASCOTA,
                {}
            )
        
        # Ahora necesitamos consultar disponibilidad
        return (
            None,  # Se generará en el endpoint después de consultar disponibilidad
            ESTADO_MOSTRANDO_DISPONIBILIDAD,
            {"mascota": mascota, "necesita_disponibilidad": True}
        )
    
    elif session.estado == ESTADO_MOSTRANDO_DISPONIBILIDAD:
        # Si ya tenemos datos de disponibilidad, generar respuesta
        if disponibilidad_data:
            if disponibilidad_data.get("disponible"):
                hab = disponibilidad_data["habitacion_seleccionada"]
                precios = disponibilidad_data["precios"]
                
                respuesta = f"""✅ Habitación disponible:

🏨 Habitación {hab['numero']} ({hab['tipo']})
👥 Capacidad: {hab['capacidad']} personas
🌙 Noches: {precios['noches']}
💰 Precio por noche: ${precios['precio_por_noche']:,.0f}
💵 Total estadía: ${precios['precio_base']:,.0f}"""
                
                if precios.get("extra_mascota", 0) > 0:
                    respuesta += f"\n🐾 Extra mascota: ${precios['extra_mascota']:,.0f}"
                
                respuesta += f"\n💳 Total: ${precios['precio_total']:,.0f}"
                respuesta += "\n\n¿Querés que te la reserve? Respondé 'confirmo' para crear la reserva (queda pendiente de seña)."
                
                return (
                    respuesta,
                    ESTADO_ESPERANDO_CONFIRMACION,
                    {"habitacion_id": hab["id"]}
                )
            else:
                mensaje = disponibilidad_data.get("mensaje", "No hay habitaciones disponibles")
                return (
                    f"{mensaje}\n\nSi querés, probamos con otras fechas. ¿Para qué fecha sería el check-in? (AAAA-MM-DD)",
                    ESTADO_ESPERANDO_CHECKIN,
                    {"reset_fechas": True}
                )
        else:
            # Si no hay datos de disponibilidad aún, esperar
            return (
                "Consultando disponibilidad...",
                ESTADO_MOSTRANDO_DISPONIBILIDAD,
                {"necesita_disponibilidad": True}
            )
    
    elif session.estado == ESTADO_ESPERANDO_CONFIRMACION:
        if contiene_palabra(texto, PALABRAS_CONFIRMACION):
            # Confirmación - se procesará en el endpoint
            return (
                None,  # Se generará después de crear la reserva
                "RESERVA_CREADA",
                {"confirmar_reserva": True}
            )
        elif contiene_palabra(texto, PALABRAS_CANCELACION):
            return (
                "No hay problema. Si querés, podés consultar otras fechas. ¿Para qué fecha sería el check-in? (AAAA-MM-DD)",
                ESTADO_INICIO,
                {"reset_campos": True, "limpiar_reserva_id": True}
            )
        else:
            return (
                "Por favor, respondé 'confirmo' para reservar o 'no' para cancelar:",
                ESTADO_ESPERANDO_CONFIRMACION,
                {}
            )
    
    # Estado desconocido
    logger.warning(f"Estado desconocido: {session.estado}")
    return (
        "Hubo un error. Por favor, escribí 'reset' para reiniciar.",
        ESTADO_INICIO,
        {}
    )


def generar_respuesta_confirmacion_reserva(reserva_id: int, seña: float) -> str:
    """
    Genera el mensaje de confirmación después de crear una reserva.
    """
    return f"""✅ Reserva creada correctamente!

Tu reserva está PENDIENTE DE SEÑA (50% del total).

💰 Seña a pagar: ${seña:,.0f}

💳 Datos para transferencia:
Alias: santinocasitas
CVU: 0000003100053095518930
Titular: Susana Mabel Martins

Enviame el comprobante por acá y lo confirmamos. 😊"""

