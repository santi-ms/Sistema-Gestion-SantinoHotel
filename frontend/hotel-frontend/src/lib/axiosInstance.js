import axios from "axios";
import { API_BASE_URL, TOKEN_KEY } from "../config";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000, // 15 segundos máximo
});

// Interceptor de REQUEST: agrega token automáticamente
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor de RESPONSE: maneja errores 401 globalmente
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expirado o inválido — limpiar sesión y redirigir
      localStorage.removeItem(TOKEN_KEY);
      window.location.href = "/";
    }
    return Promise.reject(error);
  }
);

export default api;
