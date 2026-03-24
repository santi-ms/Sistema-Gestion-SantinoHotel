import { TOKEN_KEY } from "../config";

/**
 * Decodifica el JWT del localStorage de forma segura.
 * Retorna { token, payload, rol } o null si hay algún error.
 */
export function getAuthPayload() {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return null;

    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const payload = JSON.parse(atob(parts[1]));

    // Verificar expiración
    const now = Date.now() / 1000;
    if (payload.exp && payload.exp < now) {
      localStorage.removeItem(TOKEN_KEY);
      return null;
    }

    return { token, payload, rol: payload.rol };
  } catch {
    localStorage.removeItem(TOKEN_KEY);
    return null;
  }
}

/**
 * Retorna el token JWT o null si no existe / está expirado.
 */
export function getToken() {
  return getAuthPayload()?.token ?? null;
}

/**
 * Retorna el rol del usuario o null.
 */
export function getUserRole() {
  return getAuthPayload()?.rol ?? null;
}
