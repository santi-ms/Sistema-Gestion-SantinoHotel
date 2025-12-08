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
  
  // El backend envía fechas con timezone de Argentina, pero JavaScript las interpreta
  // como UTC. Necesitamos ajustar la hora para mostrar correctamente.
  // Si la fecha viene del backend con timezone -03:00, JavaScript la parsea correctamente
  // pero toLocaleString la muestra en la zona horaria del navegador.
  // Forzamos que se muestre en hora de Argentina.
  
  // Obtener la fecha como string en hora de Argentina
  const fechaArgentina = fechaObj.toLocaleString('en-US', {
    timeZone: 'America/Argentina/Buenos_Aires',
    ...opciones
  });
  
  return fechaArgentina;
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

