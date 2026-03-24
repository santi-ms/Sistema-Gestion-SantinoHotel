/**
 * Utilidades centralizadas para formateo de moneda en pesos argentinos.
 */

const formatoARS = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const formatoARSDecimal = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Formatea un número como moneda ARS. Ej: 1500 → "$1.500"
 * @param {number|string|null} valor
 * @returns {string}
 */
export function formatARS(valor) {
  const num = Number(valor ?? 0);
  if (isNaN(num)) return '$0';
  return formatoARS.format(num);
}

/**
 * Formatea un número como moneda ARS con decimales. Ej: 1500.5 → "$1.500,50"
 * @param {number|string|null} valor
 * @returns {string}
 */
export function formatARSDecimal(valor) {
  const num = Number(valor ?? 0);
  if (isNaN(num)) return '$0,00';
  return formatoARSDecimal.format(num);
}

/**
 * Formatea para uso en gráficos (sin símbolo, solo número). Ej: 1500 → "1.500"
 * @param {number|string|null} valor
 * @returns {string}
 */
export function formatNumero(valor) {
  const num = Number(valor ?? 0);
  if (isNaN(num)) return '0';
  return new Intl.NumberFormat('es-AR').format(num);
}
