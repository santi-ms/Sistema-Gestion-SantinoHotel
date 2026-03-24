import { useState, useEffect } from "react";

/**
 * Retrasa la actualización de un valor hasta que el usuario deja de escribir.
 * @param {any} value - El valor a debouncear
 * @param {number} delay - Milisegundos de espera (default 300ms)
 * @returns {any} - El valor debounceado
 */
export function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
