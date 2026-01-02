import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL, TOKEN_KEY } from './config';
import { Skeleton, SkeletonStats } from './components/Skeleton';
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
  const [detalleDiario, setDetalleDiario] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [error, setError] = useState(null);
  const [periodoIngresos, setPeriodoIngresos] = useState(30);
  
  // Filtros de fecha para detalle diario
  const [tipoFiltro, setTipoFiltro] = useState('mes'); // 'dia', 'semana', 'mes'
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  
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

  useEffect(() => {
    // Inicializar fechas al cargar
    const hoy = new Date();
    const año = hoy.getFullYear();
    const mes = String(hoy.getMonth() + 1).padStart(2, '0');
    const dia = String(hoy.getDate()).padStart(2, '0');
    
    if (!fechaInicio) {
      // Por defecto, mostrar el mes actual
      const inicioMes = `${año}-${mes}-01`;
      setFechaInicio(inicioMes);
      setFechaFin(`${año}-${mes}-${dia}`);
    }
  }, []);

  useEffect(() => {
    if (fechaInicio && fechaFin) {
      cargarDetalleDiario();
    }
  }, [fechaInicio, fechaFin]);

  const cargarDatosAnalytics = async () => {
    setCargando(true);
    setError(null);
    try {
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      // Dashboard principal
      const dashboardRes = await axios.get(`${API_BASE_URL}/analytics/dashboard`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('Datos del dashboard:', dashboardRes.data);
      setDashboardData(dashboardRes.data);

      // Formas de pago
      const formasPagoRes = await axios.get(`${API_BASE_URL}/analytics/formas-pago`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('Datos de formas de pago:', formasPagoRes.data);
      setFormasPagoData(formasPagoRes.data);

      // Ocupación de habitaciones (último mes)
      const hoy = new Date();
      const hace30Dias = new Date();
      hace30Dias.setDate(hoy.getDate() - 30);
      
      const ocupacionRes = await axios.get(`${API_BASE_URL}/ocupacion-estadisticas`, {
        params: {
          fecha_inicio: hace30Dias.toISOString().split('T')[0],
          fecha_fin: hoy.toISOString().split('T')[0]
        },
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Transformar datos del endpoint a formato esperado por el gráfico
      const datosOcupacion = [];
      if (ocupacionRes.data && ocupacionRes.data.por_tipo) {
        Object.keys(ocupacionRes.data.por_tipo).forEach(tipo => {
          const tipoData = ocupacionRes.data.por_tipo[tipo];
          if (tipoData.habitaciones && Array.isArray(tipoData.habitaciones)) {
            tipoData.habitaciones.forEach(hab => {
              datosOcupacion.push({
                habitacion: hab.numero,
                tipo: tipo,
                capacidad: hab.capacidad || 0,
                precio: hab.precio || 0,
                dias_ocupados: hab.dias_ocupados || 0,
                dias_disponibles: hab.dias_disponibles || 0,
                tasa_ocupacion: hab.tasa_ocupacion || 0,
                total_reservas: hab.total_reservas || 0,
                ingresos: hab.ingresos || 0
              });
            });
          }
        });
      }
      
      console.log('Datos de ocupación transformados:', datosOcupacion);
      console.log('Datos originales del endpoint:', ocupacionRes.data);
      setOcupacionData(datosOcupacion);

    } catch (error) {
      console.error('Error al cargar analytics:', error);
      setError(error.response?.data?.detail || error.message || 'Error al cargar los datos');
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

  const cargarDetalleDiario = async () => {
    if (!fechaInicio || !fechaFin) return;
    
    setCargandoDetalle(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/analytics/detalle-diario`, {
        params: {
          fecha_inicio: fechaInicio,
          fecha_fin: fechaFin
        },
        headers: { Authorization: `Bearer ${token}` }
      });
      setDetalleDiario(res.data);
    } catch (error) {
      console.error('Error al cargar detalle diario:', error);
    } finally {
      setCargandoDetalle(false);
    }
  };

  const aplicarFiltroRapido = (tipo) => {
    const hoy = new Date();
    const año = hoy.getFullYear();
    const mes = String(hoy.getMonth() + 1).padStart(2, '0');
    const dia = String(hoy.getDate()).padStart(2, '0');
    
    setTipoFiltro(tipo);
    
    if (tipo === 'dia') {
      const fechaHoy = `${año}-${mes}-${dia}`;
      setFechaInicio(fechaHoy);
      setFechaFin(fechaHoy);
    } else if (tipo === 'semana') {
      // Últimos 7 días
      const hace7Dias = new Date(hoy);
      hace7Dias.setDate(hoy.getDate() - 6);
      const fechaInicioSem = `${hace7Dias.getFullYear()}-${String(hace7Dias.getMonth() + 1).padStart(2, '0')}-${String(hace7Dias.getDate()).padStart(2, '0')}`;
      const fechaFinSem = `${año}-${mes}-${dia}`;
      setFechaInicio(fechaInicioSem);
      setFechaFin(fechaFinSem);
    } else if (tipo === 'mes') {
      // Mes actual
      const inicioMes = `${año}-${mes}-01`;
      const finMes = `${año}-${mes}-${dia}`;
      setFechaInicio(inicioMes);
      setFechaFin(finMes);
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-slate-200">
            <Skeleton className="h-8 w-64 mb-4" />
            <Skeleton className="h-4 w-96" />
          </div>
          <SkeletonStats />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-red-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-red-100 p-3 rounded-xl">
                <BarChart3 className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-800">Error al cargar Analytics</h1>
                <p className="text-red-600 mt-1">{error}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => cargarDatosAnalytics()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-all duration-200"
              >
                Reintentar
              </button>
              <button
                onClick={() => navigate(-1)}
                className="px-4 py-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-all duration-200"
              >
                Volver
              </button>
            </div>
          </div>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6 border border-slate-200">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm text-slate-600 font-medium">Ingresos Totales</p>
                <p className="text-3xl font-bold text-green-600">
                  {dashboardData ? formatearMoneda(dashboardData.total_ingresos || 0) : '$0'}
                </p>
                {dashboardData && (
                  <p className="text-xs text-slate-500 mt-1">
                    Reservas: {formatearMoneda(dashboardData.ingresos_reservas || 0)} + 
                    Pedidos: {formatearMoneda(dashboardData.ingresos_pedidos || 0)}
                  </p>
                )}
              </div>
              <div className="bg-green-100 p-3 rounded-xl">
                <TrendingUp className="w-8 h-8 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border border-slate-200">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm text-slate-600 font-medium">Beneficio Neto</p>
                <p className={`text-3xl font-bold ${dashboardData && dashboardData.beneficio_neto >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {dashboardData ? formatearMoneda(dashboardData.beneficio_neto || 0) : '$0'}
                </p>
                {dashboardData && (
                  <p className="text-xs text-slate-500 mt-1">
                    Ingresos: {formatearMoneda(dashboardData.total_ingresos || 0)} - 
                    Gastos: {formatearMoneda(dashboardData.total_gastos_monto || 0)}
                  </p>
                )}
              </div>
              <div className={`p-3 rounded-xl ${dashboardData && dashboardData.beneficio_neto >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                {dashboardData && dashboardData.beneficio_neto >= 0 ? 
                  <TrendingUp className="w-8 h-8 text-green-600" /> : 
                  <TrendingDown className="w-8 h-8 text-red-600" />
                }
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border border-slate-200">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm text-slate-600 font-medium">Tasa de Ocupación</p>
                <p className="text-3xl font-bold text-blue-600">
                  {dashboardData ? `${dashboardData.tasa_ocupacion || 0}%` : '0%'}
                </p>
                {dashboardData && (
                  <p className="text-xs text-slate-500 mt-1">
                    {dashboardData.periodo || 'Este mes'}
                  </p>
                )}
              </div>
              <div className="bg-blue-100 p-3 rounded-xl">
                <Home className="w-8 h-8 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border border-slate-200">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm text-slate-600 font-medium">Total Reservas</p>
                <p className="text-3xl font-bold text-purple-600">
                  {dashboardData ? dashboardData.total_reservas || 0 : 0}
                </p>
                {dashboardData && (
                  <p className="text-xs text-slate-500 mt-1">
                    {dashboardData.periodo || 'Este mes'}
                  </p>
                )}
              </div>
              <div className="bg-purple-100 p-3 rounded-xl">
                <Users className="w-8 h-8 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

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
            
            {ingresosData && ingresosData.length > 0 ? (
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
            ) : (
              <div className="flex items-center justify-center h-96 text-slate-500">
                <p>No hay datos de ingresos para el período seleccionado</p>
              </div>
            )}
          </div>

          {/* Gráfico de Formas de Pago */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-slate-200">
            <h3 className="text-lg font-semibold text-slate-800 mb-6">Formas de Pago</h3>
            
            {formasPagoData && formasPagoData.length > 0 ? (
            {formasPagoData && formasPagoData.length > 0 ? (
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
            ) : (
              <div className="flex items-center justify-center h-96 text-slate-500">
                <p>No hay datos de formas de pago disponibles</p>
              </div>
            )}
            ) : (
              <div className="flex items-center justify-center h-96 text-slate-500">
                <p>No hay datos de formas de pago disponibles</p>
              </div>
            )}
          </div>
        </div>

        {/* Ocupación de Habitaciones */}
        {ocupacionData.length > 0 && (
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
                  yAxisId="precio"
                  orientation="left"
                  tickFormatter={(value) => `$${value.toLocaleString()}`}
                />
                <YAxis 
                  yAxisId="ocupacion"
                  orientation="right"
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip 
                  formatter={(value, name) => {
                    if (name === 'Tasa Ocupación') return [`${value}%`, name];
                    if (name === 'Precio') return [`$${value.toLocaleString()}`, name];
                    return [value, name];
                  }}
                />
                <Bar 
                  yAxisId="precio"
                  dataKey="precio" 
                  fill="#10B981" 
                  name="Precio"
                  radius={[4, 4, 0, 0]}
                />
                <Bar 
                  yAxisId="ocupacion"
                  dataKey="tasa_ocupacion" 
                  fill="#8B5CF6" 
                  name="Tasa Ocupación"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

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

        {/* Detalle Diario - Nueva Sección */}
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden mb-8">
          <div className="p-6 border-b border-slate-200">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <h3 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
                <Calendar className="w-6 h-6 text-indigo-600" />
                Detalle Diario de Reservas y Pedidos
              </h3>
              
              {/* Filtros de fecha */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Botones rápidos */}
                <div className="flex gap-2">
                  <button
                    onClick={() => aplicarFiltroRapido('dia')}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      tipoFiltro === 'dia' 
                        ? 'bg-indigo-600 text-white' 
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    Hoy
                  </button>
                  <button
                    onClick={() => aplicarFiltroRapido('semana')}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      tipoFiltro === 'semana' 
                        ? 'bg-indigo-600 text-white' 
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    7 días
                  </button>
                  <button
                    onClick={() => aplicarFiltroRapido('mes')}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      tipoFiltro === 'mes' 
                        ? 'bg-indigo-600 text-white' 
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    Mes
                  </button>
                </div>
                
                {/* Selectores de fecha personalizados */}
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={fechaInicio}
                    onChange={(e) => setFechaInicio(e.target.value)}
                    className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="text-slate-500">a</span>
                  <input
                    type="date"
                    value={fechaFin}
                    onChange={(e) => setFechaFin(e.target.value)}
                    className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Resumen del período */}
          {detalleDiario?.resumen && (
            <div className="p-4 bg-indigo-50 border-b border-slate-200">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                <div>
                  <p className="text-slate-600">Total Reservas</p>
                  <p className="text-lg font-bold text-slate-800">{detalleDiario.resumen.total_reservas}</p>
                </div>
                <div>
                  <p className="text-slate-600">Total Pedidos</p>
                  <p className="text-lg font-bold text-slate-800">{detalleDiario.resumen.total_pedidos}</p>
                </div>
                <div>
                  <p className="text-slate-600">Ingresos Reservas</p>
                  <p className="text-lg font-bold text-green-600">{formatearMoneda(detalleDiario.resumen.total_ingresos_reservas)}</p>
                </div>
                <div>
                  <p className="text-slate-600">Ingresos Pedidos</p>
                  <p className="text-lg font-bold text-green-600">{formatearMoneda(detalleDiario.resumen.total_ingresos_pedidos)}</p>
                </div>
                <div>
                  <p className="text-slate-600">Total Ingresos</p>
                  <p className="text-lg font-bold text-indigo-600">{formatearMoneda(detalleDiario.resumen.total_ingresos)}</p>
                </div>
              </div>
            </div>
          )}

          {/* Tabla detallada día por día */}
          <div className="overflow-x-auto">
            {cargandoDetalle ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                <span className="ml-3 text-slate-600">Cargando detalle diario...</span>
              </div>
            ) : detalleDiario?.dias && detalleDiario.dias.length > 0 ? (
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">Fecha</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">Reservas</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">Hab. Ocupadas</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">Pago Reservas</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">Pedidos</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">Pago Pedidos</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">Total Día</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {detalleDiario.dias.map((dia, index) => (
                    <tr key={dia.fecha} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm font-medium text-slate-900">
                          {new Date(dia.fecha + 'T00:00:00').toLocaleDateString('es-AR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            weekday: 'short'
                          })}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm">
                          <div className="font-medium text-slate-900">{formatearMoneda(dia.reservas.monto_total)}</div>
                          <div className="text-slate-500">{dia.reservas.cantidad} reserva{dia.reservas.cantidad !== 1 ? 's' : ''}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm">
                          <div className="font-medium text-slate-900">{dia.reservas.habitaciones_ocupadas}</div>
                          {dia.reservas.habitaciones_ids.length > 0 && (
                            <div className="text-xs text-slate-500">
                              Hab: {dia.reservas.habitaciones_ids.join(', ')}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm space-y-1">
                          {dia.reservas.formas_pago.length > 0 ? (
                            dia.reservas.formas_pago.map((fp, i) => (
                              <div key={i} className="flex items-center gap-2">
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                                  {fp.forma_pago}
                                </span>
                                <span className="text-slate-600">{formatearMoneda(fp.monto)}</span>
                              </div>
                            ))
                          ) : (
                            <span className="text-slate-400 text-xs">-</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm">
                          <div className="font-medium text-slate-900">{formatearMoneda(dia.pedidos.monto_total)}</div>
                          <div className="text-slate-500">{dia.pedidos.cantidad} pedido{dia.pedidos.cantidad !== 1 ? 's' : ''}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm space-y-1">
                          {dia.pedidos.formas_pago.length > 0 ? (
                            dia.pedidos.formas_pago.map((fp, i) => (
                              <div key={i} className="flex items-center gap-2">
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                  {fp.forma_pago}
                                </span>
                                <span className="text-slate-600">{formatearMoneda(fp.monto)}</span>
                              </div>
                            ))
                          ) : (
                            <span className="text-slate-400 text-xs">-</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-bold text-indigo-600">
                          {formatearMoneda(dia.total_dia)}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-center py-12">
                <p className="text-slate-500">No hay datos para el período seleccionado</p>
              </div>
            )}
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