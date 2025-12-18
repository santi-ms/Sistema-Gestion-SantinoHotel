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
 * Devuelve YYYY-MM-DD para "hoy" en zona horaria de Argentina (sin depender de toISOString()).
 */
export function obtenerHoyArgentinaISO() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date());

  const get = (type) => parts.find(p => p.type === type)?.value;
  const y = get('year');
  const m = get('month');
  const d = get('day');
  if (!y || !m || !d) return new Date().toISOString().slice(0, 10);
  return `${y}-${m}-${d}`;
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
  if (!fecha) return "N/A";
  
  // Si la fecha viene como ISO string
  if (typeof fecha === "string") {
    // Extraer hora directamente del string ISO para evitar problemas de timezone
    // Formato esperado: "2025-12-18T19:09:53.656134-03:00" o "2025-12-18T19:09:53"
    const matchHora = fecha.match(/T(\d{2}):(\d{2}):(\d{2})/);
    if (matchHora) {
      const hora = matchHora[1];
      const minuto = matchHora[2];
      const segundo = matchHora[3];
      
      // Si tiene timezone -03:00, la hora ya está en hora de Argentina, mostrarla tal cual
      if (fecha.includes('-03:00')) {
        return incluirSegundos ? `${hora}:${minuto}:${segundo}` : `${hora}:${minuto}`;
      }
      
      // Si tiene timezone +00:00 o Z (UTC), restar 3 horas para convertir a Argentina
      if (fecha.includes('+00:00') || fecha.endsWith('Z') || (!fecha.match(/[+-]\d{2}:\d{2}$/) && !fecha.includes('-'))) {
        let horaNum = parseInt(hora);
        let minutoNum = parseInt(minuto);
        
        // Restar 3 horas (UTC a Argentina UTC-3)
        horaNum -= 3;
        if (horaNum < 0) {
          horaNum += 24; // Si pasa de medianoche, ajustar
        }
        
        const horaStr = horaNum.toString().padStart(2, '0');
        return incluirSegundos ? `${horaStr}:${minuto}:${segundo}` : `${horaStr}:${minuto}`;
      }
      
      // Si tiene otro timezone, usar conversión con Date
      const fechaObj = new Date(fecha);
      if (!isNaN(fechaObj.getTime())) {
        return fechaObj.toLocaleString('es-AR', {
          timeZone: 'America/Argentina/Buenos_Aires',
          hour: '2-digit',
          minute: '2-digit',
          second: incluirSegundos ? '2-digit' : undefined,
          hour12: false
        });
      }
    }
  }

  // Si es un objeto Date u otro formato, usar la función general
  return formatearFechaArgentina(fecha, {
    hour: '2-digit',
    minute: '2-digit',
    second: incluirSegundos ? '2-digit' : undefined,
    hour12: false
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

