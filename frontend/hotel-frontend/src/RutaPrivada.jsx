import { Navigate } from "react-router-dom";

export default function RutaPrivada({ children, rol }) {
  const token = localStorage.getItem("token");

  if (!token) return <Navigate to="/" />;

  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    const userRol = payload.rol;
    
    // Verificar si el token ha expirado
    const now = Date.now() / 1000;
    if (payload.exp && payload.exp < now) {
      localStorage.removeItem("token");
      return <Navigate to="/" />;
    }

    // Si no se especifica rol, permitir acceso
    if (!rol) return children;

    // Si rol es un array, verificar si el usuario tiene alguno de esos roles
    if (Array.isArray(rol)) {
      if (!rol.includes(userRol)) {
        return <Navigate to="/" />;
      }
    } else {
      // Si rol es un string, verificar coincidencia exacta
      if (rol !== userRol) {
        return <Navigate to="/" />;
      }
    }

    return children;
  } catch (error) {
    // Token inválido
    localStorage.removeItem("token");
    return <Navigate to="/" />;
  }
}