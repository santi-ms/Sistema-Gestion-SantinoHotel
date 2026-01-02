import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL, TOKEN_KEY } from './config';
import { 
  Calendar, 
  Bed, 
  DollarSign, 
  Settings, 
  Search,
  Bell,
  Menu,
  X,
  Eye,
  Edit,
  Trash2,
  Filter,
  Download,
  User,
  LogOut,
  ArrowLeft,
  BarChart3,
  ShoppingCart,
  Activity,
  ClipboardList,
  Coffee,
  MapPin,
  Crown,
  TrendingUp,
  CheckSquare,
  Package
} from 'lucide-react';

export default function DuenoPanel() {
  const navigate = useNavigate();
  const [resumen, setResumen] = useState({
    total_reservas: 0,
    total_pedidos: 0,
    total_gastos: 0,
    balance: 0,
  });
  const [fecha, setFecha] = useState(new Date().toLocaleDateString('fr-CA'));
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const obtenerResumen = async () => {
      const token = localStorage.getItem(TOKEN_KEY);
      try {
        const res = await axios.get(`${API_BASE_URL}/resumen-dia?fecha=${fecha}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setResumen(res.data);
      } catch (err) {
        console.error("Error al obtener resumen:", err);
      } finally {
        setCargando(false);
      }
    };

    obtenerResumen();
  }, [fecha]);

  const handleLogout = () => {
    localStorage.removeItem(TOKEN_KEY);
    navigate('/');
  };

  const statsCards = [
    {
      title: "Ingresos por Reservas",
      value: resumen.total_reservas,
      icon: Bed,
      color: "from-amber-500 to-orange-500",
      bgColor: "bg-amber-50",
      textColor: "text-amber-600"
    },
    {
      title: "Ingresos por Restobar",
      value: resumen.total_pedidos,
      icon: Coffee,
      color: "from-orange-500 to-red-500",
      bgColor: "bg-orange-50",
      textColor: "text-orange-600"
    },
    {
      title: "Gastos Operativos",
      value: resumen.total_gastos,
      icon: DollarSign,
      color: "from-red-500 to-pink-500",
      bgColor: "bg-red-50",
      textColor: "text-red-600"
    },
    {
      title: "Balance del Día",
      value: resumen.balance,
      icon: resumen.balance >= 0 ? TrendingUp : DollarSign,
      color: resumen.balance >= 0 ? "from-green-500 to-emerald-500" : "from-red-500 to-pink-500",
      bgColor: resumen.balance >= 0 ? "bg-green-50" : "bg-red-50",
      textColor: resumen.balance >= 0 ? "text-green-600" : "text-red-600"
    }
  ];

  const actionButtons = [
    {
      title: "Ver Analytics",
      description: "Dashboard con reportes y gráficos de rendimiento",
      icon: BarChart3,
      color: "from-purple-500 to-indigo-600",
      hoverColor: "hover:from-purple-600 hover:to-indigo-700",
      path: "/analytics"
    },
    {
      title: "Configurar Precios",
      description: "Gestionar carta del restobar y tarifas",
      icon: ClipboardList,
      color: "from-orange-500 to-amber-600",
      hoverColor: "hover:from-orange-600 hover:to-amber-700",
      path: "/configuracion-precios"
    },
    {
      title: "Ver Reservas",
      description: "Gestionar reservas del hotel",
      icon: Eye,
      color: "from-blue-500 to-cyan-600",
      hoverColor: "hover:from-blue-600 hover:to-cyan-700",
      path: "/ver-reservas"
    },
    {
      title: "Ver Pedidos",
      description: "Pedidos del restobar y room service",
      icon: Coffee,
      color: "from-amber-500 to-orange-600",
      hoverColor: "hover:from-amber-600 hover:to-orange-700",
      path: "/ver-pedidos"
    },
    {
      title: "Registrar Gasto",
      description: "Controlar gastos operativos",
      icon: DollarSign,
      color: "from-red-500 to-pink-600",
      hoverColor: "hover:from-red-600 hover:to-pink-700",
      path: "/registrar-gasto"
    },
    {
      title: "Actividades",
      description: "Gestionar tareas y actividades del hotel",
      icon: CheckSquare,
      color: "from-indigo-500 to-purple-600",
      hoverColor: "hover:from-indigo-600 hover:to-purple-700",
      path: "/actividades"
    },
    {
      title: "Control de Stock",
      description: "Gestionar inventario de bebidas y productos",
      icon: Package,
      color: "from-cyan-500 to-blue-600",
      hoverColor: "hover:from-cyan-600 hover:to-blue-700",
      path: "/stock"
    },
    {
      title: "Dashboard de Stock",
      description: "Estadísticas y análisis del inventario",
      icon: BarChart3,
      color: "from-purple-500 to-indigo-600",
      hoverColor: "hover:from-purple-600 hover:to-indigo-700",
      path: "/dashboard-stock"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50">
      {/* Header Ejecutivo */}
      <div className="bg-white shadow-xl border-b-2 border-orange-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              {/* Logo ejecutivo Hotel Santino */}
              <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-r from-orange-500 to-amber-600 rounded-2xl shadow-xl border-2 border-orange-300">
                <div className="text-white font-bold text-xl">HS</div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold text-gray-900 font-serif">Hotel Santino</h1>
                  <Crown className="w-5 h-5 text-orange-500" />
                </div>
                <div className="flex items-center gap-2 text-orange-600">
                  <Coffee className="w-4 h-4" />
                  <span className="text-sm font-medium">Panel de Administración - Restobar</span>
                </div>
                <div className="flex items-center gap-1 text-gray-500 text-xs mt-1">
                  <MapPin className="w-3 h-3" />
                  <span>Santo Tomé, Corrientes</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate(-1)}
                className="flex items-center px-4 py-2 text-orange-600 hover:text-orange-800 hover:bg-orange-50 rounded-xl transition-all duration-200 border border-orange-200"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                <span className="font-medium">Volver</span>
              </button>
              
              <button
                onClick={handleLogout}
                className="flex items-center px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <LogOut className="w-4 h-4 mr-2" />
                <span className="font-medium">Cerrar Sesión</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Selector de Fecha personalizado */}
        <div className="mb-8">
          <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-orange-100">
            <div className="flex items-center space-x-4">
              <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-r from-orange-500 to-amber-600 rounded-xl shadow-lg">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-semibold text-orange-700 mb-2">
                  📊 Resumen Financiero del Día
                </label>
                <input
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  className="px-4 py-3 border-2 border-orange-200 rounded-xl focus:ring-2 focus:ring-orange-400 focus:border-orange-400 transition-all duration-200 bg-white shadow-sm font-medium"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Cards de Estadísticas mejoradas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statsCards.map((card, index) => (
            <div
              key={index}
              className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border-2 border-orange-100 overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-600 mb-2">{card.title}</p>
                    {cargando ? (
                      <div className="space-y-2">
                        <div className="h-8 bg-slate-200 rounded-lg animate-pulse w-32"></div>
                        <div className="h-4 bg-slate-200 rounded animate-pulse w-24"></div>
                      </div>
                    ) : (
                      <p className={`text-3xl font-bold ${card.textColor} transition-all duration-300`}>
                        ${card.value.toLocaleString()}
                      </p>
                    )}
                  </div>
                  <div className={`flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-r ${card.color} shadow-lg`}>
                    <card.icon className="w-7 h-7 text-white" />
                  </div>
                </div>
              </div>
              <div className={`h-3 bg-gradient-to-r ${card.color}`}></div>
            </div>
          ))}
        </div>

        {/* Botones de Acción mejorados */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {actionButtons.map((button, index) => (
            <button
              key={index}
              onClick={() => navigate(button.path)}
              className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 hover:scale-[1.02] active:scale-100 border-2 border-orange-100 hover:border-orange-200 overflow-hidden focus-ring"
            >
              <div className="p-6">
                <div className="flex items-center space-x-4">
                  <div className={`flex items-center justify-center w-16 h-16 rounded-xl bg-gradient-to-r ${button.color} ${button.hoverColor} shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    <button.icon className="w-8 h-8 text-white" />
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="text-lg font-bold text-gray-900 group-hover:text-orange-800 transition-colors duration-200 mb-1">
                      {button.title}
                    </h3>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      {button.description}
                    </p>
                  </div>
                  <div className="text-orange-400 group-hover:text-orange-600 group-hover:translate-x-2 transition-all duration-200">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
              <div className={`h-2 bg-gradient-to-r ${button.color} transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left`}></div>
            </button>
          ))}
        </div>

        {/* Footer ejecutivo personalizado */}
        <div className="mt-8 bg-white rounded-2xl shadow-lg p-6 border-2 border-orange-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <Activity className="w-5 h-5 text-orange-500" />
              <span className="text-gray-600 font-medium">
                Última actualización: {new Date().toLocaleString('es-ES')}
              </span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-orange-600 font-medium">
              <BarChart3 className="w-4 h-4" />
              <span>Datos del {new Date(fecha).toLocaleDateString('es-ES')}</span>
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t border-orange-100">
            <div className="text-center">
              <div className="text-orange-600 font-bold text-base mb-1">
                Hotel Santino - Restobar
              </div>
              <div className="text-gray-500 text-sm">
                Santo Tomé, Corrientes • Panel de Control Ejecutivo
              </div>
              <div className="text-orange-500 text-xs mt-1 font-medium">
                © 2025 - Hospitalidad familiar desde el corazón de Corrientes
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}