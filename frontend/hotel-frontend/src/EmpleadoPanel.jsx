import React from "react";
import { useNavigate } from "react-router-dom";
import { TOKEN_KEY } from "./config";
// Updated: 2025-12-03 - Sistema de Stock agregado
import { 
  Calendar, 
  ShoppingCart, 
  DollarSign, 
  Eye, 
  LogOut,
  UserCheck,
  Clock,
  ArrowRight,
  Coffee,
  Bed,
  Receipt,
  Menu,
  MapPin,
  Utensils,
  CheckSquare,
  Package
} from 'lucide-react';

export default function EmpleadoPanel() {
  const navigate = useNavigate();

  const cerrarSesion = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem("rol");
    navigate("/");
  };

  const menuItems = [
    {
      title: "Reservas del Día",
      description: "Ver y gestionar reservas de hoy",
      icon: Calendar,
      color: "from-orange-500 to-amber-600",
      hoverColor: "hover:from-orange-600 hover:to-amber-700",
      path: "/reservas-dia",
      bgColor: "bg-orange-50",
      borderColor: "border-orange-200"
    },
    {
      title: "Registrar Pedido",
      description: "Añadir pedidos del restobar",
      icon: Utensils,
      color: "from-amber-500 to-yellow-600",
      hoverColor: "hover:from-amber-600 hover:to-yellow-700",
      path: "/registrar-pedido",
      bgColor: "bg-amber-50",
      borderColor: "border-amber-200"
    },
    {
      title: "Lista de Precios",
      description: "Consultar precios de comidas y bebidas",
      icon: Menu,
      color: "from-red-500 to-orange-600",
      hoverColor: "hover:from-red-600 hover:to-orange-700",
      path: "/configuracion-precios",
      bgColor: "bg-red-50",
      borderColor: "border-red-200"
    },
    {
      title: "Registrar Gasto",
      description: "Registrar gastos operativos",
      icon: Receipt,
      color: "from-orange-600 to-red-600",
      hoverColor: "hover:from-orange-700 hover:to-red-700",
      path: "/registrar-gasto",
      bgColor: "bg-orange-50",
      borderColor: "border-orange-200"
    },
    {
      title: "Ver Reservas",
      description: "Consultar todas las reservas del hotel",
      icon: Bed,
      color: "from-amber-600 to-orange-600",
      hoverColor: "hover:from-amber-700 hover:to-orange-700",
      path: "/ver-reservas",
      bgColor: "bg-amber-50",
      borderColor: "border-amber-200"
    },
    {
      title: "Actividades",
      description: "Gestionar tareas y actividades",
      icon: CheckSquare,
      color: "from-indigo-500 to-purple-600",
      hoverColor: "hover:from-indigo-600 hover:to-purple-700",
      path: "/actividades",
      bgColor: "bg-indigo-50",
      borderColor: "border-indigo-200"
    },
    {
      title: "Control de Stock",
      description: "Gestionar inventario de bebidas",
      icon: Package,
      color: "from-cyan-500 to-blue-600",
      hoverColor: "hover:from-cyan-600 hover:to-blue-700",
      path: "/stock",
      bgColor: "bg-cyan-50",
      borderColor: "border-cyan-200"
    }
  ];

  const getCurrentTime = () => {
    return new Date().toLocaleString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50">
      {/* Header personalizado Hotel Santino */}
      <div className="bg-white shadow-xl border-b-2 border-orange-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              {/* Logo Hotel Santino */}
              <div className="flex items-center justify-center w-14 h-14 bg-gradient-to-r from-orange-500 to-amber-600 rounded-2xl shadow-lg border-2 border-orange-300">
                <div className="text-white font-bold text-lg">HS</div>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 font-serif">Hotel Santino</h1>
                <div className="flex items-center gap-2 text-orange-600">
                  <Coffee className="w-4 h-4" />
                  <span className="text-sm font-medium">Panel del Empleado - Restobar</span>
                </div>
                <div className="flex items-center gap-1 text-gray-500 text-xs mt-1">
                  <MapPin className="w-3 h-3" />
                  <span>Santo Tomé, Corrientes</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="hidden sm:flex items-center space-x-2 text-sm text-orange-700 bg-orange-50 px-4 py-2 rounded-xl border border-orange-200">
                <Clock className="w-4 h-4" />
                <span className="capitalize font-medium">{getCurrentTime()}</span>
              </div>
              
              <button
                onClick={cerrarSesion}
                className="flex items-center px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <LogOut className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline font-medium">Cerrar Sesión</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Welcome Section personalizada - Más compacta */}
        <div className="bg-white rounded-xl shadow-lg p-4 mb-6 border-2 border-orange-100 bg-gradient-to-r from-orange-50 to-amber-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-r from-orange-400 to-amber-500 rounded-xl shadow-lg">
                <UserCheck className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">¡Bienvenido al Hotel Santino!</h2>
                <p className="text-orange-700 text-sm font-medium">Tu hospitalidad familiar en Santo Tomé</p>
              </div>
            </div>
            <div className="hidden md:flex items-center text-sm text-orange-600">
              <Clock className="w-4 h-4 mr-2" />
              <span className="font-medium">{getCurrentTime()}</span>
            </div>
            <div className="flex items-center md:hidden text-sm text-orange-600">
              <Clock className="w-4 h-4 mr-1" />
              <span className="font-medium text-xs">{new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>
        </div>

        {/* Menu Grid - Más columnas en pantallas grandes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {menuItems.map((item, index) => (
            <button
              key={index}
              onClick={() => navigate(item.path)}
              className="group bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border-2 border-orange-100 hover:border-orange-200 overflow-hidden text-left h-full"
            >
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className={`flex items-center justify-center w-12 h-12 rounded-lg bg-gradient-to-r ${item.color} ${item.hoverColor} shadow-md group-hover:scale-110 transition-transform duration-300`}>
                    <item.icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-orange-400 group-hover:text-orange-600 group-hover:translate-x-1 transition-all duration-200">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
                
                <div className="space-y-1">
                  <h3 className="text-base font-semibold text-gray-900 group-hover:text-orange-800 transition-colors duration-200">
                    {item.title}
                  </h3>
                  <p className="text-gray-600 text-xs leading-snug">
                    {item.description}
                  </p>
                </div>
              </div>
              
              {/* Bottom accent bar */}
              <div className={`h-1.5 bg-gradient-to-r ${item.color} transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left`}></div>
            </button>
          ))}
        </div>

        {/* Quick Actions Section personalizada - Más compacta */}
        <div className="mt-6 bg-white rounded-xl shadow-lg p-4 border-2 border-orange-100">
          <h3 className="text-base font-semibold text-gray-900 mb-3 flex items-center">
            <Clock className="w-4 h-4 mr-2 text-orange-500" />
            Accesos Rápidos
          </h3>
          
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 gap-3">
            <div className="text-center p-3 rounded-lg bg-orange-50 hover:bg-orange-100 transition-colors duration-200 cursor-pointer border border-orange-200 hover:shadow-md"
                 onClick={() => navigate("/reservas-dia")}>
              <Calendar className="w-5 h-5 text-orange-500 mx-auto mb-1" />
              <span className="text-xs font-semibold text-orange-700">Hoy</span>
            </div>
            
            <div className="text-center p-3 rounded-lg bg-amber-50 hover:bg-amber-100 transition-colors duration-200 cursor-pointer border border-amber-200 hover:shadow-md"
                 onClick={() => navigate("/registrar-pedido")}>
              <Utensils className="w-5 h-5 text-amber-600 mx-auto mb-1" />
              <span className="text-xs font-semibold text-amber-700">Pedido</span>
            </div>
            
            <div className="text-center p-3 rounded-lg bg-red-50 hover:bg-red-100 transition-colors duration-200 cursor-pointer border border-red-200 hover:shadow-md"
                 onClick={() => navigate("/configuracion-precios")}>
              <Menu className="w-5 h-5 text-red-500 mx-auto mb-1" />
              <span className="text-xs font-semibold text-red-700">Precios</span>
            </div>
            
            <div className="text-center p-3 rounded-lg bg-orange-50 hover:bg-orange-100 transition-colors duration-200 cursor-pointer border border-orange-200 hover:shadow-md"
                 onClick={() => navigate("/registrar-gasto")}>
              <Receipt className="w-5 h-5 text-orange-600 mx-auto mb-1" />
              <span className="text-xs font-semibold text-orange-700">Gasto</span>
            </div>
            
            <div className="text-center p-3 rounded-lg bg-amber-50 hover:bg-amber-100 transition-colors duration-200 cursor-pointer border border-amber-200 hover:shadow-md"
                 onClick={() => navigate("/ver-reservas")}>
              <Eye className="w-5 h-5 text-amber-600 mx-auto mb-1" />
              <span className="text-xs font-semibold text-amber-700">Ver</span>
            </div>
            
            <div className="text-center p-3 rounded-lg bg-cyan-50 hover:bg-cyan-100 transition-colors duration-200 cursor-pointer border border-cyan-200 hover:shadow-md"
                 onClick={() => navigate("/stock")}>
              <Package className="w-5 h-5 text-cyan-600 mx-auto mb-1" />
              <span className="text-xs font-semibold text-cyan-700">Stock</span>
            </div>
            
            <div className="text-center p-3 rounded-lg bg-indigo-50 hover:bg-indigo-100 transition-colors duration-200 cursor-pointer border border-indigo-200 hover:shadow-md"
                 onClick={() => navigate("/actividades")}>
              <CheckSquare className="w-5 h-5 text-indigo-600 mx-auto mb-1" />
              <span className="text-xs font-semibold text-indigo-700">Actividades</span>
            </div>
          </div>
        </div>

        {/* Footer personalizado - Más compacto */}
        <div className="mt-6 text-center bg-white rounded-lg p-3 shadow-md border border-orange-100">
          <div className="text-orange-600 font-semibold text-xs mb-1">
            Hotel Santino - Restobar
          </div>
          <div className="text-gray-500 text-xs">
            Santo Tomé, Corrientes • Hospitalidad familiar desde el corazón de Corrientes
          </div>
          <div className="text-orange-500 text-xs mt-1">
            © 2025 - Sistema de Gestión Hotelera
          </div>
        </div>
      </div>
    </div>
  );
}