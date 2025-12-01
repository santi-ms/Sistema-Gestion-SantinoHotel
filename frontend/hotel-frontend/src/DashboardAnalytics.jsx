import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL, TOKEN_KEY } from './config';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Home,
  Users,
  ArrowLeft,
  Download,
  RefreshCw,
  Eye,
  PieChart as PieChartIcon
} from 'lucide-react';

export default function DashboardAnalytics() {
  const [dashboardData, setDashboardData] = useState(null);
  const [ingresosData, setIngresosData] = useState([]);
  const [ocupacionData, setOcupacionData] = useState([]);
  const [formasPagoData, setFormasPagoData] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [periodoIngresos, setPeriodoIngresos] = useState(30);
  const navigate = useNavigate();

  const token = localStorage.getItem(TOKEN_KEY);

  // Colores para los gráficos
  const colores = [
    '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#3B82F6', 
    '#8B5A2C', '#EC4899', '#6B7280', '#84CC16', '#F97316'
  ];

  useEffect(() => {
    cargarDatosAnalytics();
  }, []);

  useEffect(() => {
    cargarIngresosData();
  }, [periodoIngresos]);

  const cargarDatosAnalytics = async () => {
    setCargando(true);
    try {
      // Dashboard principal
      const dashboardRes = await axios.get(`${API_BASE_URL}/analytics/dashboard`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDashboardData(dashboardRes.data);

      // Formas de pago
      const formasPagoRes = await axios.get(`${API_BASE_URL}/analytics/formas-pago`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFormasPagoData(formasPagoRes.data);

      // Ocupación de habitaciones (último mes)
      const hoy = new Date();
      const hace30Dias = new Date();
      hace30Dias.setDate(hoy.getDate() - 30);
      
      const ocupacionRes = await axios.get(`${API_BASE_URL}/analytics/ocupacion-habitaciones`, {
        params: {
          fecha_inicio: hace30Dias.toISOString().split('T')[0],
          fecha_fin: hoy.toISOString().split('T')[0]
        },
        headers: { Authorization: `Bearer ${token}` }
      });
      setOcupacionData(ocupacionRes.data);

    } catch (error) {
      console.error('Error al cargar analytics:', error);
    } finally {
      setCargando(false);
    }
  };

  const cargarIngresosData = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/analytics/ingresos-por-dia`, {
        params: { dias: periodoIngresos },
        headers: { Authorization: `Bearer ${token}` }
      });
      setIngresosData(res.data);
    } catch (error) {
      console.error('Error al cargar ingresos:', error);
    }
  };

  const formatearMoneda = (valor) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0
    }).format(valor);
  };

  const formatearFecha = (fecha) => {
    return new Date(fecha).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit'
    });
  };

  const exportarReporte = async () => {
    try {
      const hoy = new Date();
      const mes = hoy.getMonth() + 1;
      const año = hoy.getFullYear();
      
      const res = await axios.get(`${API_BASE_URL}/analytics/reporte-mensual`, {
        params: { mes, año },
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Crear CSV
      const csv = [
        ['Reporte Mensual', res.data.periodo],
        [''],
        ['RESUMEN'],
        ['Total Reservas', res.data.resumen.total_reservas],
        ['Total Pedidos', res.data.resumen.total_pedidos],
        ['Ingresos Reservas', formatearMoneda(res.data.resumen.ingresos_reservas)],
        ['Ingresos Pedidos', formatearMoneda(res.data.resumen.ingresos_pedidos)],
        ['Total Gastos', formatearMoneda(res.data.resumen.total_gastos_monto)],
        ['Beneficio Neto', formatearMoneda(res.data.resumen.beneficio_neto)],
        ['Tasa Ocupación', `${res.data.resumen.tasa_ocupacion}%`],
      ].map(row => row.join(',')).join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reporte_${mes}_${año}.csv`;
      a.click();
    } catch (error) {
      console.error('Error al exportar:', error);
    }
  };

  if (cargando) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Cargando analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-slate-200">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-600 p-3 rounded-xl">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-800">Dashboard Analytics</h1>
                <p className="text-slate-600">Análisis completo del rendimiento del hotel</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => cargarDatosAnalytics()}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-all duration-200"
              >
                <RefreshCw className="w-4 h-4" />
                Actualizar
              </button>
              <button
                onClick={exportarReporte}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all duration-200"
              >
                <Download className="w-4 h-4" />
                Exportar
              </button>
              <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-all duration-200"
              >
                <ArrowLeft className="w-4 h-4" />
                Volver
              </button>
            </div>
          </div>
        </div>

        {/* Métricas Principales */}
        {dashboardData && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-lg p-6 border border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 font-medium">Ingresos Totales</p>
                  <p className="text-3xl font-bold text-green-600">
                    {formatearMoneda(dashboardData.total_ingresos)}
                  </p>
                </div>
                <div className="bg-green-100 p-3 rounded-xl">
                  <TrendingUp className="w-8 h-8 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 border border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 font-medium">Beneficio Neto</p>
                  <p className={`text-3xl font-bold ${dashboardData.beneficio_neto >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatearMoneda(dashboardData.beneficio_neto)}
                  </p>
                </div>
                <div className={`p-3 rounded-xl ${dashboardData.beneficio_neto >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                  {dashboardData.beneficio_neto >= 0 ? 
                    <TrendingUp className="w-8 h-8 text-green-600" /> : 
                    <TrendingDown className="w-8 h-8 text-red-600" />
                  }
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 border border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 font-medium">Tasa de Ocupación</p>
                  <p className="text-3xl font-bold text-blue-600">
                    {dashboardData.tasa_ocupacion}%
                  </p>
                </div>
                <div className="bg-blue-100 p-3 rounded-xl">
                  <Home className="w-8 h-8 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 border border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 font-medium">Total Reservas</p>
                  <p className="text-3xl font-bold text-purple-600">
                    {dashboardData.total_reservas}
                  </p>
                </div>
                <div className="bg-purple-100 p-3 rounded-xl">
                  <Users className="w-8 h-8 text-purple-600" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Gráfico de Ingresos */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-slate-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-slate-800">Ingresos Diarios</h3>
              <select
                value={periodoIngresos}
                onChange={(e) => setPeriodoIngresos(parseInt(e.target.value))}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
              >
                <option value={7}>7 días</option>
                <option value={15}>15 días</option>
                <option value={30}>30 días</option>
                <option value={60}>60 días</option>
              </select>
            </div>
            
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={ingresosData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="fecha" tickFormatter={formatearFecha} />
                <YAxis tickFormatter={(value) => `$${value.toLocaleString()}`} />
                <Tooltip 
                  formatter={(value, name) => [`$${value.toLocaleString()}`, name]}
                  labelFormatter={(fecha) => formatearFecha(fecha)}
                />
                <Line type="monotone" dataKey="reservas" stroke="#8B5CF6" strokeWidth={2} name="Reservas" />
                <Line type="monotone" dataKey="pedidos" stroke="#10B981" strokeWidth={2} name="Pedidos" />
                <Line type="monotone" dataKey="total" stroke="#3B82F6" strokeWidth={3} name="Total" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Gráfico de Formas de Pago */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-slate-200">
            <h3 className="text-lg font-semibold text-slate-800 mb-6">Formas de Pago</h3>
            
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={formasPagoData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ forma_pago, percent }) => `${forma_pago} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="monto"
                >
                  {formasPagoData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={colores[index % colores.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`$${value.toLocaleString()}`, 'Monto']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Ocupación de Habitaciones */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-slate-200 mb-8">
          <h3 className="text-lg font-semibold text-slate-800 mb-6">Ocupación por Habitación (Últimos 30 días)</h3>
          
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={ocupacionData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="habitacion" 
                tickFormatter={(value) => `Hab. ${value}`}
              />
              <YAxis 
                yAxisId="ocupacion"
                orientation="left"
                tickFormatter={(value) => `${value}%`}
              />
              <YAxis 
                yAxisId="ingresos"
                orientation="right"
                tickFormatter={(value) => `${value.toLocaleString()}`}
              />
              <Tooltip 
                formatter={([value, name]) => {
                  if (name === 'Tasa Ocupación') return [`${value}%`, name];
                  if (name === 'Ingresos') return [`${value.toLocaleString()}`, name];
                  return [value, name];
                }}
              />
              <Bar 
                yAxisId="ocupacion"
                dataKey="tasa_ocupacion" 
                fill="#8B5CF6" 
                name="Tasa Ocupación"
                radius={[4, 4, 0, 0]}
              />
              <Bar 
                yAxisId="ingresos"
                dataKey="ingresos" 
                fill="#10B981" 
                name="Ingresos"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Tabla Detallada de Ocupación */}
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-200">
            <h3 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
              <Eye className="w-6 h-6 text-indigo-600" />
              Detalles de Ocupación por Habitación
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-medium text-slate-700">Habitación</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-slate-700">Tipo</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-slate-700">Días Ocupados</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-slate-700">Tasa Ocupación</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-slate-700">Total Reservas</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-slate-700">Ingresos</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-slate-700">Rendimiento</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {ocupacionData.map((habitacion) => (
                  <tr key={habitacion.habitacion} className="hover:bg-slate-50 transition-colors duration-200">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Home className="w-4 h-4 text-slate-500" />
                        <span className="text-sm font-medium text-slate-900">
                          Habitación {habitacion.habitacion}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                        {habitacion.tipo}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-700">
                        {habitacion.dias_ocupados} / {habitacion.dias_disponibles}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-slate-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              habitacion.tasa_ocupacion >= 80 ? 'bg-green-500' :
                              habitacion.tasa_ocupacion >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${Math.min(habitacion.tasa_ocupacion, 100)}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium text-slate-700 min-w-[50px]">
                          {habitacion.tasa_ocupacion}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-700">
                        {habitacion.total_reservas}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-semibold text-green-600">
                        {formatearMoneda(habitacion.ingresos)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        habitacion.tasa_ocupacion >= 80 ? 'bg-green-100 text-green-800' :
                        habitacion.tasa_ocupacion >= 50 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {habitacion.tasa_ocupacion >= 80 ? 'Excelente' :
                         habitacion.tasa_ocupacion >= 50 ? 'Bueno' : 'Bajo'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer con información */}
        <div className="mt-8 bg-white rounded-xl shadow-lg p-6 border border-slate-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <PieChartIcon className="w-5 h-5 text-indigo-500" />
              <span className="text-slate-600">
                Datos actualizados: {new Date().toLocaleString('es-ES')}
              </span>
            </div>
            <div className="text-sm text-slate-500">
              Período analizado: {dashboardData?.periodo}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}