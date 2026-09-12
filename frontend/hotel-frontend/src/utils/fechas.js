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
 * Devuelve el día calendario argentino (YYYY-MM-DD) de una fecha del backend.
 *
 * El backend guarda los timestamps en columnas sin timezone, con la hora de
 * pared de Argentina. Por eso un string SIN offset explícito ya está en hora
 * argentina y hay que tomarlo literal: reinterpretarlo como UTC (lo que hace
 * `new Date(...).toISOString()`) corre el día para los horarios cercanos a
 * medianoche. Si el string sí trae offset (o Z), se convierte a Argentina.
 *
 * @param {string|Date} fecha
 * @returns {string|null} - "YYYY-MM-DD" o null si la fecha es inválida
 */
export function obtenerFechaISOArgentina(fecha) {
  if (!fecha) return null;

  if (typeof fecha === "string") {
    const tieneOffset = /(?:Z|[+-]\d{2}:?\d{2})$/.test(fecha.trim());
    const soloFecha = fecha.match(/^(\d{4}-\d{2}-\d{2})/);
    if (!tieneOffset && soloFecha) {
      return soloFecha[1];
    }
  }

  const fechaObj = typeof fecha === "string" ? new Date(fecha) : fecha;
  if (!fechaObj || isNaN(fechaObj.getTime())) return null;

  // en-CA produce directamente YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(fechaObj);
}

/**
 * Formatea solo la fecha (sin hora) como DD/MM/AAAA en día calendario argentino.
 * Comparte la lógica de `obtenerFechaISOArgentina`, así lo que se muestra y lo
 * que se filtra nunca pueden diferir en un día.
 */
export function formatearSoloFecha(fecha) {
  const iso = obtenerFechaISOArgentina(fecha);
  if (!iso) return "N/A";
  const [anio, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${anio}`;
}

/**
 * Formatea la fecha en formato largo ("viernes, 12 de septiembre de 2026")
 * usando el día calendario argentino.
 */
export function formatearFechaLarga(fecha) {
  const iso = obtenerFechaISOArgentina(fecha);
  if (!iso) return "N/A";
  const [anio, mes, dia] = iso.split('-').map(Number);
  // Se construye con componentes locales al mediodía: así ningún offset
  // horario puede correr el día al formatear.
  return new Date(anio, mes - 1, dia, 12).toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
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

