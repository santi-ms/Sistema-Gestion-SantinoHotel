import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL, TOKEN_KEY } from "./config";
import { 
  Coffee, 
  DollarSign, 
  Home, 
  ArrowLeft, 
  Search,
  Filter,
  Download,
  Calendar,
  Clock,
  ExternalLink,
  CreditCard,
  TrendingUp,
  BarChart3,
  PieChart,
  Users,
  MapPin
} from "lucide-react";

export default function VerPedidos() {
  const [pedidos, setPedidos] = useState([]);
  const [pedidosFiltrados, setPedidosFiltrados] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [filtroTexto, setFiltroTexto] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [filtroPago, setFiltroPago] = useState("todos");
  const [filtroFecha, setFiltroFecha] = useState("");
  const [filtroMes, setFiltroMes] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const obtenerPedidos = async () => {
      setCargando(true);
      try {
        const token = localStorage.getItem(TOKEN_KEY);
        const res = await axios.get(`${API_BASE_URL}/pedidos`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setPedidos(res.data);
        setPedidosFiltrados(res.data);
      } catch (error) {
        console.error("Error al obtener pedidos:", error);
      } finally {
        setCargando(false);
      }
    };
    obtenerPedidos();
  }, []);

  // Función para filtrar pedidos
  useEffect(() => {
    let filtrados = pedidos;

    // Filtro por texto (detalle)
    if (filtroTexto) {
      filtrados = filtrados.filter(pedido => 
        pedido.detalle?.toLowerCase().includes(filtroTexto.toLowerCase()) ||
        pedido.habitacion_id?.toString().includes(filtroTexto)
      );
    }

    // Filtro por tipo (interno/externo)
    if (filtroTipo !== "todos") {
      filtrados = filtrados.filter(pedido => 
        filtroTipo === "externos" ? pedido.externo : !pedido.externo
      );
    }

    // Filtro por forma de pago
    if (filtroPago !== "todos") {
      filtrados = filtrados.filter(pedido => 
        pedido.forma_pago?.toLowerCase() === filtroPago.toLowerCase()
      );
    }

    // Filtro por fecha específica
    if (filtroFecha) {
      filtrados = filtrados.filter(pedido => {
        const fechaPedido = new Date(pedido.fecha).toISOString().split('T')[0];
        return fechaPedido === filtroFecha;
      });
    }

    // Filtro por mes
    if (filtroMes) {
      filtrados = filtrados.filter(pedido => {
        const fechaPedido = new Date(pedido.fecha);
        const mesAno = `${fechaPedido.getFullYear()}-${String(fechaPedido.getMonth() + 1).padStart(2, '0')}`;
        return mesAno === filtroMes;
      });
    }

    setPedidosFiltrados(filtrados);
  }, [pedidos, filtroTexto, filtroTipo, filtroPago, filtroFecha, filtroMes]);

  const exportarCSV = () => {
    const csv = [
      ["ID", "Detalle", "Monto", "Habitación", "Tipo", "Forma de Pago", "Fecha"],
      ...pedidosFiltrados.map(p => [
        p.id,
        p.detalle,
        p.monto,
        p.habitacion_id || "N/A",
        p.externo ? "Externo" : "Interno",
        p.forma_pago || "N/A",
        new Date(p.fecha).toLocaleString('es-ES')
      ])
    ].map(row => row.join(",")).join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pedidos_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const getPaymentIcon = (formaPago) => {
    if (formaPago?.toLowerCase().includes("efectivo")) return <DollarSign className="w-4 h-4" />;
    if (formaPago?.toLowerCase().includes("tarjeta")) return <CreditCard className="w-4 h-4" />;
    return <Clock className="w-4 h-4" />;
  };

  // Estadísticas
  const estadisticas = {
    total: pedidos.length,
    totalMonto: pedidos.reduce((sum, p) => sum + p.monto, 0),
    internos: pedidos.filter(p => !p.externo).length,
    externos: pedidos.filter(p => p.externo).length,
    efectivo: pedidos.filter(p => p.forma_pago?.toLowerCase().includes("efectivo")).length,
    tarjeta: pedidos.filter(p => p.forma_pago?.toLowerCase().includes("tarjeta")).length,
    promedioMonto: pedidos.length > 0 ? pedidos.reduce((sum, p) => sum + p.monto, 0) / pedidos.length : 0
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-slate-200">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-purple-600 p-3 rounded-xl">
                <Coffee className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-800">Ver Pedidos</h1>
                <p className="text-slate-600">Análisis completo de pedidos gastronómicos</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={exportarCSV}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
              >
                <Download className="w-4 h-4" />
                Exportar CSV
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

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-4 border border-slate-200">
            <div className="flex items-center gap-3">
              <Coffee className="w-8 h-8 text-purple-600" />
              <div>
                <p className="text-sm text-slate-600 font-medium">Total Pedidos</p>
                <p className="text-2xl font-bold text-slate-800">{estadisticas.total}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-lg p-4 border border-slate-200">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-sm text-green-600 font-medium">Ingresos Totales</p>
                <p className="text-2xl font-bold text-green-700">${estadisticas.totalMonto.toLocaleString()}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-lg p-4 border border-slate-200">
            <div className="flex items-center gap-3">
              <BarChart3 className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-sm text-blue-600 font-medium">Promedio</p>
                <p className="text-2xl font-bold text-blue-700">${estadisticas.promedioMonto.toLocaleString()}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-lg p-4 border border-slate-200">
            <div className="flex items-center gap-3">
              <PieChart className="w-8 h-8 text-orange-600" />
              <div>
                <p className="text-sm text-orange-600 font-medium">Externos</p>
                <p className="text-2xl font-bold text-orange-700">{estadisticas.externos}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Métricas adicionales */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6 border border-slate-200">
            <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-purple-600" />
              Distribución por Ubicación
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <Home className="w-6 h-6 text-purple-600 mx-auto mb-2" />
                <p className="text-sm text-purple-600 font-medium">Internos</p>
                <p className="text-xl font-bold text-purple-700">{estadisticas.internos}</p>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <ExternalLink className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                <p className="text-sm text-blue-600 font-medium">Externos</p>
                <p className="text-xl font-bold text-blue-700">{estadisticas.externos}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border border-slate-200">
            <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-green-600" />
              Formas de Pago
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <DollarSign className="w-6 h-6 text-green-600 mx-auto mb-2" />
                <p className="text-sm text-green-600 font-medium">Efectivo</p>
                <p className="text-xl font-bold text-green-700">{estadisticas.efectivo}</p>
              </div>
              <div className="text-center p-3 bg-amber-50 rounded-lg">
                <CreditCard className="w-6 h-6 text-amber-600 mx-auto mb-2" />
                <p className="text-sm text-amber-600 font-medium">Tarjeta</p>
                <p className="text-xl font-bold text-amber-700">{estadisticas.tarjeta}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-slate-200">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-slate-600" />
            <h3 className="text-lg font-semibold text-slate-800">Filtros Avanzados</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Búsqueda por texto */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Buscar pedido
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar..."
                  value={filtroTexto}
                  onChange={(e) => setFiltroTexto(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-12 pr-4 py-3 text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent placeholder-slate-400"
                />
              </div>
            </div>

            {/* Filtro por tipo */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Tipo de pedido
              </label>
              <select
                value={filtroTipo}
                onChange={(e) => setFiltroTipo(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="todos">Todos</option>
                <option value="internos">Internos</option>
                <option value="externos">Externos</option>
              </select>
            </div>

            {/* Filtro por forma de pago */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Forma de pago
              </label>
              <select
                value={filtroPago}
                onChange={(e) => setFiltroPago(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="todos">Todas</option>
                <option value="efectivo">Efectivo</option>
                <option value="tarjeta">Tarjeta</option>
                <option value="transferencia">Transferencia</option>
                <option value="pendiente">Pendiente</option>
              </select>
            </div>

            {/* Filtro por fecha específica */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Fecha específica
              </label>
              <input
                type="date"
                value={filtroFecha}
                onChange={(e) => setFiltroFecha(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            {/* Filtro por mes */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Mes
              </label>
              <input
                type="month"
                value={filtroMes}
                onChange={(e) => setFiltroMes(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Botón limpiar filtros */}
          {(filtroTexto || filtroTipo !== "todos" || filtroPago !== "todos" || filtroFecha || filtroMes) && (
            <button
              onClick={() => {
                setFiltroTexto("");
                setFiltroTipo("todos");
                setFiltroPago("todos");
                setFiltroFecha("");
                setFiltroMes("");
              }}
              className="mt-4 px-4 py-2 text-sm text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-all duration-200"
            >
              Limpiar todos los filtros
            </button>
          )}
        </div>

        {/* Tabla de pedidos */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-200">
            <h3 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
              <Coffee className="w-6 h-6 text-purple-600" />
              Pedidos Registrados ({pedidosFiltrados.length})
            </h3>
          </div>

          {cargando ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
              <p className="text-slate-600">Cargando pedidos...</p>
            </div>
          ) : pedidosFiltrados.length === 0 ? (
            <div className="p-8 text-center">
              <Coffee className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">No se encontraron pedidos con los filtros aplicados</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-medium text-slate-700">ID</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-slate-700">Detalle</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-slate-700">Monto</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-slate-700">Habitación</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-slate-700">Tipo</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-slate-700">Forma de Pago</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-slate-700">Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {pedidosFiltrados.map((pedido) => (
                    <tr key={pedido.id} className="hover:bg-slate-50 transition-colors duration-200">
                      <td className="px-6 py-4">
                        <span className="text-sm font-medium text-slate-900">#{pedido.id}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-slate-900 max-w-xs">
                          {pedido.detalle}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-semibold text-green-600">
                          ${pedido.monto.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {pedido.habitacion_id ? (
                          <div className="flex items-center gap-1 text-sm text-slate-600">
                            <Home className="w-4 h-4" />
                            {pedido.habitacion_id}
                          </div>
                        ) : (
                          <span className="text-sm text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {pedido.externo ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                            <ExternalLink className="w-3 h-3" />
                            Externo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                            <Home className="w-3 h-3" />
                            Interno
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {getPaymentIcon(pedido.forma_pago)}
                          <span className="text-sm text-slate-700 capitalize">
                            {pedido.forma_pago || "No especificado"}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-slate-500" />
                          <span className="text-sm text-slate-700">
                            {new Date(pedido.fecha).toLocaleDateString('es-ES')}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          {new Date(pedido.fecha).toLocaleTimeString('es-ES')}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}