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
 * SOLUCIÓN: Extraer fecha directamente del string ISO y usar Date local para evitar timezone issues
 */
export function formatearSoloFecha(fecha) {
  if (!fecha) return "N/A";
  
  // Si es string ISO, extraer fecha directamente
  if (typeof fecha === "string") {
    const match = fecha.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const año = match[1];
      const mes = match[2];
      const dia = match[3];
      
      // Extraer también la hora para verificar si es temprano y podría estar en día anterior
      const matchHora = fecha.match(/T(\d{2}):(\d{2})/);
      
      // Si tiene timezone -03:00, la fecha está en hora de Argentina
      // PERO JavaScript puede estar parseándola como UTC, causando que aparezca 1 día adelantado
      if (fecha.includes('-03:00') || fecha.includes('+03:00')) {
        // Usar la fecha directamente del string (ya está correcta)
        return `${dia}/${mes}/${año}`;
      }
      
      // Si viene sin timezone o con Z, puede estar en UTC
      // Crear Date en UTC y luego convertir a hora local de Argentina
      if (fecha.includes('Z') || !fecha.match(/[+-]\d{2}:\d{2}$/)) {
        // Parsear como UTC
        const fechaUTC = new Date(fecha + (fecha.includes('Z') ? '' : 'Z'));
        // Convertir a hora de Argentina (UTC-3) usando toLocaleDateString
        return fechaUTC.toLocaleDateString('es-AR', {
          timeZone: 'America/Argentina/Buenos_Aires',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        });
      }
      
      // Si tiene otro timezone, extraer directamente
      return `${dia}/${mes}/${año}`;
    }
  }

  // Fallback: convertir a Date y formatear
  try {
    const fechaObj = typeof fecha === "string" ? new Date(fecha) : fecha;
    if (fechaObj && !isNaN(fechaObj.getTime())) {
      return fechaObj.toLocaleDateString('es-AR', {
        timeZone: 'America/Argentina/Buenos_Aires',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    }
  } catch (e) {
    console.error("Error formateando fecha:", e);
  }
  
  return "N/A";
}

/**
 * Formatea solo la hora en zona horaria de Argentina
 * CORRECCIÓN: Si el backend envía con timezone -03:00, la hora ya está correcta
 */
export function formatearSoloHora(fecha, incluirSegundos = false) {
  if (!fecha) return "N/A";
  
  // Extraer hora directamente del string ISO (más confiable que usar Date)
  if (typeof fecha === "string") {
    // Buscar patrón de hora: THH:MM:SS o THH:MM
    const match = fecha.match(/T(\d{2}):(\d{2})(?::(\d{2}))?/);
    if (match) {
      const hora = match[1];
      const minuto = match[2];
      const segundo = match[3] || "00";
      
      // Si tiene timezone -03:00, la hora ya está en hora de Argentina (el backend la normalizó)
      // Extraer y mostrar directamente sin conversión
      if (fecha.includes('-03:00') || fecha.includes('+03:00')) {
        return incluirSegundos ? `${hora}:${minuto}:${segundo}` : `${hora}:${minuto}`;
      }
      
      // Si tiene timezone +00:00 o Z (UTC), convertir a Argentina (restar 3 horas)
      if (fecha.includes('+00:00') || fecha.includes('Z') || fecha.match(/[+-]\d{2}:\d{2}$/)) {
        let horaNum = parseInt(hora);
        // Restar 3 horas para convertir UTC a Argentina (UTC-3)
        horaNum = horaNum >= 3 ? horaNum - 3 : (horaNum + 24 - 3) % 24;
        const horaStr = horaNum.toString().padStart(2, '0');
        return incluirSegundos ? `${horaStr}:${minuto}:${segundo}` : `${horaStr}:${minuto}`;
      }
      
      // Si no tiene timezone explícito, asumir que ya está en hora local de Argentina
      return incluirSegundos ? `${hora}:${minuto}:${segundo}` : `${hora}:${minuto}`;
    }
  }

  // Fallback: usar Date y formatear con timezone de Argentina
  try {
    const fechaObj = typeof fecha === "string" ? new Date(fecha) : fecha;
    if (fechaObj && !isNaN(fechaObj.getTime())) {
      // Forzar conversión a timezone de Argentina
      return fechaObj.toLocaleString('es-AR', {
        timeZone: 'America/Argentina/Buenos_Aires',
        hour: '2-digit',
        minute: '2-digit',
        second: incluirSegundos ? '2-digit' : undefined,
        hour12: false
      });
    }
  } catch (e) {
    console.error("Error formateando hora:", e);
  }
  
  return "N/A";
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

