import React from "react";
import { useNavigate } from "react-router-dom";
import { TOKEN_KEY } from "./config";
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
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
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

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section personalizada */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border-2 border-orange-100 bg-gradient-to-r from-orange-50 to-amber-50">
          <div className="flex items-center space-x-4">
            <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-r from-orange-400 to-amber-500 rounded-2xl shadow-lg">
              <UserCheck className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">¡Bienvenido al Hotel Santino!</h2>
              <p className="text-orange-700 font-medium">Tu hospitalidad familiar en Santo Tomé</p>
              <p className="text-gray-600 text-sm mt-1">Selecciona una opción para comenzar a trabajar</p>
              <div className="flex items-center mt-2 text-sm text-orange-600 sm:hidden">
                <Clock className="w-4 h-4 mr-1" />
                <span className="font-medium">{getCurrentTime()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Menu Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {menuItems.map((item, index) => (
            <button
              key={index}
              onClick={() => navigate(item.path)}
              className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border-2 border-orange-100 hover:border-orange-200 overflow-hidden text-left"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className={`flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-r ${item.color} ${item.hoverColor} shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    <item.icon className="w-7 h-7 text-white" />
                  </div>
                  <div className="text-orange-400 group-hover:text-orange-600 group-hover:translate-x-1 transition-all duration-200">
                    <ArrowRight className="w-5 h-5" />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-gray-900 group-hover:text-orange-800 transition-colors duration-200">
                    {item.title}
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
              
              {/* Bottom accent bar */}
              <div className={`h-2 bg-gradient-to-r ${item.color} transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left`}></div>
            </button>
          ))}
        </div>

        {/* Quick Actions Section personalizada */}
        <div className="mt-8 bg-white rounded-2xl shadow-lg p-6 border-2 border-orange-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Clock className="w-5 h-5 mr-2 text-orange-500" />
            Accesos Rápidos
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div className="text-center p-4 rounded-xl bg-orange-50 hover:bg-orange-100 transition-colors duration-200 cursor-pointer border border-orange-200 hover:shadow-md"
                 onClick={() => navigate("/reservas-dia")}>
              <Calendar className="w-6 h-6 text-orange-500 mx-auto mb-2" />
              <span className="text-sm font-semibold text-orange-700">Hoy</span>
            </div>
            
            <div className="text-center p-4 rounded-xl bg-amber-50 hover:bg-amber-100 transition-colors duration-200 cursor-pointer border border-amber-200 hover:shadow-md"
                 onClick={() => navigate("/registrar-pedido")}>
              <Utensils className="w-6 h-6 text-amber-600 mx-auto mb-2" />
              <span className="text-sm font-semibold text-amber-700">Pedido</span>
            </div>
            
            <div className="text-center p-4 rounded-xl bg-red-50 hover:bg-red-100 transition-colors duration-200 cursor-pointer border border-red-200 hover:shadow-md"
                 onClick={() => navigate("/configuracion-precios")}>
              <Menu className="w-6 h-6 text-red-500 mx-auto mb-2" />
              <span className="text-sm font-semibold text-red-700">Precios</span>
            </div>
            
            <div className="text-center p-4 rounded-xl bg-orange-50 hover:bg-orange-100 transition-colors duration-200 cursor-pointer border border-orange-200 hover:shadow-md"
                 onClick={() => navigate("/registrar-gasto")}>
              <Receipt className="w-6 h-6 text-orange-600 mx-auto mb-2" />
              <span className="text-sm font-semibold text-orange-700">Gasto</span>
            </div>
            
            <div className="text-center p-4 rounded-xl bg-amber-50 hover:bg-amber-100 transition-colors duration-200 cursor-pointer border border-amber-200 hover:shadow-md"
                 onClick={() => navigate("/ver-reservas")}>
              <Eye className="w-6 h-6 text-amber-600 mx-auto mb-2" />
              <span className="text-sm font-semibold text-amber-700">Ver</span>
            </div>
            
            <div className="text-center p-4 rounded-xl bg-cyan-50 hover:bg-cyan-100 transition-colors duration-200 cursor-pointer border border-cyan-200 hover:shadow-md"
                 onClick={() => navigate("/stock")}>
              <Package className="w-6 h-6 text-cyan-600 mx-auto mb-2" />
              <span className="text-sm font-semibold text-cyan-700">Stock</span>
            </div>
          </div>
        </div>

        {/* Footer personalizado */}
        <div className="mt-8 text-center bg-white rounded-xl p-4 shadow-md border border-orange-100">
          <div className="text-orange-600 font-semibold text-sm mb-1">
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