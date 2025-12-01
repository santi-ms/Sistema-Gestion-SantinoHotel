import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, MapPin, ArrowRight, Coffee } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [contraseña, setContraseña] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [mostrarContraseña, setMostrarContraseña] = useState(false);
  const [cargando, setCargando] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async () => {
    setCargando(true);
    try {
      const data = new URLSearchParams();
      data.append("username", email);
      data.append("password", contraseña);

      const response = await axios.post("https://hotel-santino-backend-production.up.railway.app/login", data, {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        }
      });

      const token = response.data.access_token;
      localStorage.setItem("token", token);
      setMensaje("✅ Bienvenido al Hotel Santino");

      // Decodificar el token para obtener el rol
      const payload = JSON.parse(atob(token.split(".")[1]));

      setTimeout(() => {
        if (payload.rol === "empleado") {
          navigate("/empleado");
        } else if (payload.rol === "dueño") {
          navigate("/dueno");
        }
      }, 500);
    } catch {
      setMensaje("❌ Error al iniciar sesión");
    } finally {
      setCargando(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleLogin();
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Fondo personalizado con colores cálidos */}
      <div className="absolute inset-0 bg-gradient-to-br from-amber-900 via-orange-900 to-red-900">
        <div className="absolute inset-0 bg-black bg-opacity-30"></div>
        
        {/* Círculos animados con colores del hotel */}
        <div className="absolute top-0 left-0 w-72 h-72 bg-orange-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute top-0 right-0 w-72 h-72 bg-amber-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse animation-delay-2000"></div>
        <div className="absolute bottom-0 left-1/2 w-72 h-72 bg-yellow-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse animation-delay-4000"></div>
      </div>

      {/* Contenido principal */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Logo y título del Hotel Santino */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-orange-500 to-amber-600 rounded-3xl mb-6 shadow-2xl border-2 border-amber-400 border-opacity-30">
              <div className="text-white font-bold text-2xl">HS</div>
            </div>
            <h1 className="text-4xl font-bold text-white mb-2 font-serif">Hotel Santino</h1>
            <div className="flex items-center justify-center gap-2 text-amber-200 mb-2">
              <Coffee className="w-4 h-4" />
              <span className="text-lg font-medium">Restobar</span>
            </div>
            <div className="flex items-center justify-center gap-1 text-orange-200">
              <MapPin className="w-4 h-4" />
              <span className="text-sm">Santo Tomé, Corrientes</span>
            </div>
            <div className="mt-4 w-20 h-1 bg-gradient-to-r from-orange-400 to-amber-400 mx-auto rounded-full"></div>
          </div>

          {/* Formulario de login */}
          <div className="backdrop-blur-lg bg-white bg-opacity-15 rounded-3xl p-8 shadow-2xl border border-amber-200 border-opacity-20">
            <h2 className="text-2xl font-semibold text-white text-center mb-2">Sistema de Gestión</h2>
            <p className="text-amber-200 text-center mb-8 text-sm">Acceso al panel administrativo</p>
            
            {/* Campo de email */}
            <div className="relative mb-6">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-amber-300" />
              </div>
              <input
                type="email"
                placeholder="Correo electrónico"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyPress={handleKeyPress}
                className="w-full pl-12 pr-4 py-4 bg-white bg-opacity-10 border border-amber-300 border-opacity-30 rounded-xl text-white placeholder-amber-200 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all duration-300 hover:bg-opacity-20"
              />
            </div>

            {/* Campo de contraseña */}
            <div className="relative mb-6">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-amber-300" />
              </div>
              <input
                type={mostrarContraseña ? "text" : "password"}
                placeholder="Contraseña"
                value={contraseña}
                onChange={(e) => setContraseña(e.target.value)}
                onKeyPress={handleKeyPress}
                className="w-full pl-12 pr-12 py-4 bg-white bg-opacity-10 border border-amber-300 border-opacity-30 rounded-xl text-white placeholder-amber-200 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all duration-300 hover:bg-opacity-20"
              />
              <button
                type="button"
                onClick={() => setMostrarContraseña(!mostrarContraseña)}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-amber-300 hover:text-white transition-colors duration-200"
              >
                {mostrarContraseña ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>

            {/* Botón de login */}
            <button
              onClick={handleLogin}
              disabled={cargando || !email || !contraseña}
              className="w-full bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center group shadow-lg"
            >
              {cargando ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Verificando acceso...
                </div>
              ) : (
                <div className="flex items-center">
                  Ingresar al Sistema
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
                </div>
              )}
            </button>

            {/* Mensaje de estado */}
            {mensaje && (
              <div className={`mt-6 p-4 rounded-xl text-center font-medium transition-all duration-300 ${
                mensaje.includes('✅') 
                  ? 'bg-green-500 bg-opacity-20 text-green-300 border border-green-400 border-opacity-30' 
                  : 'bg-red-500 bg-opacity-20 text-red-300 border border-red-400 border-opacity-30'
              }`}>
                {mensaje}
              </div>
            )}
          </div>

          {/* Footer personalizado */}
          <div className="text-center mt-8">
            <div className="text-amber-200 text-sm font-medium mb-2">
              Hotel Santino - Restobar
            </div>
            <div className="text-orange-300 text-xs">
              Santo Tomé, Corrientes • Sistema de Gestión Hotelera
            </div>
            <div className="text-amber-400 text-xs mt-2">
              © 2025 - Hospitalidad familiar desde el corazón de Corrientes
            </div>
          </div>
        </div>
      </div>

      {/* Efectos visuales adicionales */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black to-transparent opacity-50"></div>
      
      {/* Estilos CSS adicionales para animaciones */}
      <style jsx>{`
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}