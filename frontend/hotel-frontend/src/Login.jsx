import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL, TOKEN_KEY } from "./config";
import { useToast } from "./components/ToastContainer";

export default function Login() {
  const [email, setEmail] = useState("");
  const [contraseña, setContraseña] = useState("");
  const [mostrarContraseña, setMostrarContraseña] = useState(false);
  const [cargando, setCargando] = useState(false);
  const { success, error: errorToast } = useToast();
  const navigate = useNavigate();

  const handleLogin = async () => {
    setCargando(true);
    try {
      const data = new URLSearchParams();
      data.append("username", email);
      data.append("password", contraseña);

      const response = await axios.post(`${API_BASE_URL}/login`, data, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" }
      });

      const token = response.data.access_token;
      localStorage.setItem(TOKEN_KEY, token);
      success("Bienvenido al Hotel Santino");

      const payload = JSON.parse(atob(token.split(".")[1]));
      setTimeout(() => {
        if (payload.rol === "empleado") navigate("/empleado");
        else if (payload.rol === "dueño") navigate("/dueno");
      }, 500);
    } catch (error) {
      const errorMsg = error.response?.data?.detail || error.message || "Credenciales incorrectas";
      errorToast(errorMsg);
    } finally {
      setCargando(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") handleLogin();
  };

  return (
    <div className="min-h-screen flex">
      {/* Panel izquierdo oscuro */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#0f172a] flex-col items-center justify-center p-12 relative overflow-hidden">
        {/* Decoración de fondo */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-primary-container opacity-10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-500 opacity-5 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />

        <div className="relative z-10 text-center">
          {/* Logo */}
          <div className="w-20 h-20 bg-primary-container rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-2xl">
            <span className="text-white font-extrabold text-3xl tracking-tighter">HS</span>
          </div>
          <h1 className="text-4xl font-extrabold text-white tracking-tight mb-3">Hotel Santino</h1>
          <p className="text-slate-400 text-lg mb-12">Santo Tomé, Corrientes</p>

          {/* Features */}
          <div className="space-y-4 text-left max-w-xs mx-auto">
            {[
              { icon: "hotel", text: "Gestión de reservas en tiempo real" },
              { icon: "restaurant", text: "Control de pedidos del restobar" },
              { icon: "bar_chart", text: "Analytics y reportes financieros" },
            ].map((f) => (
              <div key={f.icon} className="flex items-center gap-3 text-slate-300">
                <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-[18px] text-blue-400">{f.icon}</span>
                </div>
                <span className="text-sm">{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="absolute bottom-8 text-slate-600 text-xs">Santo Tomé, Corrientes · © 2025</p>
      </div>

      {/* Panel derecho blanco */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-surface-container-lowest">
        <div className="w-full max-w-sm">
          {/* Logo mobile */}
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="w-10 h-10 bg-primary-container rounded-xl flex items-center justify-center">
              <span className="text-white font-extrabold text-sm">HS</span>
            </div>
            <span className="font-bold text-on-surface text-lg">Hotel Santino</span>
          </div>

          <h2 className="text-2xl font-extrabold text-on-surface tracking-tight mb-1">Iniciar sesión</h2>
          <p className="text-on-surface-variant text-sm mb-8">Ingresá tus credenciales para continuar</p>

          {/* Email */}
          <div className="mb-4">
            <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-2">
              Correo electrónico
            </label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">mail</span>
              <input
                type="email"
                placeholder="usuario@hotel.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyPress={handleKeyPress}
                className="w-full pl-10 pr-4 py-3 bg-surface-container-low border border-outline-variant rounded-xl text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all placeholder:text-outline"
              />
            </div>
          </div>

          {/* Password */}
          <div className="mb-6">
            <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-2">
              Contraseña
            </label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">lock</span>
              <input
                type={mostrarContraseña ? "text" : "password"}
                placeholder="••••••••"
                value={contraseña}
                onChange={(e) => setContraseña(e.target.value)}
                onKeyPress={handleKeyPress}
                className="w-full pl-10 pr-12 py-3 bg-surface-container-low border border-outline-variant rounded-xl text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all placeholder:text-outline"
              />
              <button
                type="button"
                onClick={() => setMostrarContraseña(!mostrarContraseña)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">
                  {mostrarContraseña ? "visibility_off" : "visibility"}
                </span>
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            onClick={handleLogin}
            disabled={cargando || !email || !contraseña}
            className="w-full bg-primary-container hover:bg-primary text-white font-bold py-3 px-6 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm shadow-lg shadow-blue-900/20"
          >
            {cargando ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Verificando...
              </>
            ) : (
              <>
                Ingresar al sistema
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </>
            )}
          </button>

          <p className="text-center text-xs text-outline mt-8">
            Hotel Santino · Santo Tomé, Corrientes
          </p>
        </div>
      </div>
    </div>
  );
}
