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
 * CORRECCIÓN: Extrae la fecha directamente del string ISO para evitar problemas de timezone
 */
export function formatearSoloFecha(fecha) {
  if (!fecha) return "N/A";
  
  // Si es string ISO, extraer fecha directamente (ej: "2025-12-22T21:04:00-03:00" → "22/12/2025")
  if (typeof fecha === "string") {
    const match = fecha.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      // Si tiene timezone -03:00, la fecha ya está en hora de Argentina, mostrarla tal cual
      if (fecha.includes('-03:00')) {
        const año = match[1];
        const mes = match[2];
        const dia = match[3];
        return `${dia}/${mes}/${año}`;
      }
      
      // Si viene sin timezone o con Z (UTC), puede estar en UTC
      // En ese caso, necesitamos verificar si al convertir a Argentina cambia el día
      const fechaObj = new Date(fecha);
      if (!isNaN(fechaObj.getTime())) {
        // Usar toLocaleString con timezone de Argentina
        return fechaObj.toLocaleDateString('es-AR', {
          timeZone: 'America/Argentina/Buenos_Aires',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        });
      }
    }
  }

  // Fallback: usar formatearFechaArgentina
  return formatearFechaArgentina(fecha, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
}

/**
 * Formatea solo la hora en zona horaria de Argentina
 * CORRECCIÓN: Si el backend guarda mal (UTC como si fuera AR), restar 3 horas siempre
 */
export function formatearSoloHora(fecha, incluirSegundos = false) {
  if (!fecha) return "N/A";
  
  // Extraer hora del string ISO
  if (typeof fecha === "string") {
    const match = fecha.match(/T(\d{2}):(\d{2})(?::(\d{2}))?/);
    if (match) {
      let horaNum = parseInt(match[1]);
      const minuto = match[2];
      const segundo = match[3] || "00";
      
      // SIEMPRE restar 3 horas porque el backend está guardando UTC como si fuera Argentina
      // Esto es un fix temporal hasta que el backend se despliegue con la corrección
      horaNum = horaNum >= 3 ? horaNum - 3 : horaNum + 21;
      const horaStr = horaNum.toString().padStart(2, '0');
      
      return incluirSegundos ? `${horaStr}:${minuto}:${segundo}` : `${horaStr}:${minuto}`;
    }
  }

  // Fallback
  try {
    const fechaObj = typeof fecha === "string" ? new Date(fecha) : fecha;
    if (fechaObj && !isNaN(fechaObj.getTime())) {
      // Restar 3 horas manualmente
      const horaUTC = fechaObj.getUTCHours();
      const minutoUTC = fechaObj.getUTCMinutes();
      const segundoUTC = fechaObj.getUTCSeconds();
      
      let horaAR = horaUTC >= 3 ? horaUTC - 3 : horaUTC + 21;
      const horaStr = horaAR.toString().padStart(2, '0');
      const minutoStr = minutoUTC.toString().padStart(2, '0');
      const segundoStr = segundoUTC.toString().padStart(2, '0');
      
      return incluirSegundos ? `${horaStr}:${minutoStr}:${segundoStr}` : `${horaStr}:${minutoStr}`;
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

