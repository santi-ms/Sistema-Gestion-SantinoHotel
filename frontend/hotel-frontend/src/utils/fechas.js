/**
 * Utilidades para manejo de fechas en zona horaria de Argentina
 */

/**
 * Convierte una fecha (string o Date) a la zona horaria de Argentina
 * @param {string|Date} fecha - Fecha a convertir
 * @returns {Date} - Fecha en zona horaria de Argentina
 */
export function convertirFechaArgentina(fecha) {
  if (!fecha) return null;
  
  // Si es un objeto Date, usarlo directamente
  if (fecha instanceof Date) {
    return fecha;
  }
  
  // Si es string, parsearlo
  const fechaObj = new Date(fecha);
  
  // Si la fecha es inválida, retornar null
  if (isNaN(fechaObj.getTime())) {
    return null;
  }
  
  return fechaObj;
}

/**
 * Formatea una fecha para mostrar en la zona horaria de Argentina
 * @param {string|Date} fecha - Fecha a formatear
 * @param {object} opciones - Opciones de formato
 * @returns {string} - Fecha formateada
 */
export function formatearFechaArgentina(fecha, opciones = {}) {
  if (!fecha) return "N/A";
  
  const fechaObj = convertirFechaArgentina(fecha);
  if (!fechaObj) return "N/A";
  
  // El backend guarda fechas con timezone de Argentina (UTC-3)
  // Cuando FastAPI serializa a JSON, puede enviar la fecha como ISO string
  // JavaScript parsea correctamente si tiene timezone, pero si no, lo interpreta como UTC
  // Necesitamos forzar que se muestre siempre en hora de Argentina
  
  // Si la fecha viene como string ISO sin timezone o con 'Z' (UTC),
  // necesitamos ajustarla. Si viene con timezone -03:00, está correcta.
  
  // Usar toLocaleString con timezone de Argentina para forzar la conversión
  return fechaObj.toLocaleString('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    ...opciones
  });
}

/**
 * Formatea solo la fecha (sin hora) en zona horaria de Argentina
 */
export function formatearSoloFecha(fecha) {
  return formatearFechaArgentina(fecha, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
}

/**
 * Formatea solo la hora en zona horaria de Argentina
 */
export function formatearSoloHora(fecha, incluirSegundos = false) {
  // Si la fecha viene como ISO string, extraer HH:MM directamente.
  // Esto evita desfasajes cuando el runtime/OS no respeta bien `timeZone` en Intl.
  if (typeof fecha === "string") {
    const match = fecha.match(/T(\d{2}):(\d{2}):(\d{2})/);
    if (match) {
      const hhmm = `${match[1]}:${match[2]}`;
      if (!incluirSegundos) return hhmm;
      return `${hhmm}:${match[3]}`;
    }
  }

  return formatearFechaArgentina(fecha, {
    hour: '2-digit',
    minute: '2-digit',
    second: incluirSegundos ? '2-digit' : undefined
  });
}

/**
 * Formatea fecha y hora en zona horaria de Argentina
 */
export function formatearFechaHora(fecha, incluirSegundos = false) {
  return formatearFechaArgentina(fecha, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: incluirSegundos ? '2-digit' : undefined
  });
}

