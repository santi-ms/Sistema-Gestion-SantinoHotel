import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { 
  Calendar, 
  User, 
  Home, 
  ArrowLeft, 
  Search,
  Filter,
  Download,
  Eye,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  CalendarDays,
  MapPin,
  DollarSign
} from "lucide-react";

export default function VerReservas() {
  const [reservas, setReservas] = useState([]);
  const [reservasFiltradas, setReservasFiltradas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [filtroTexto, setFiltroTexto] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("todas");
  const [filtroFecha, setFiltroFecha] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const obtener = async () => {
      setCargando(true);
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get("https://hotel-santino-backend-production.up.railway.app/reservas", {
          headers: { Authorization: `Bearer ${token}` }
        });
        setReservas(res.data);
        setReservasFiltradas(res.data);
      } catch (error) {
        console.error("Error al obtener reservas:", error);
      } finally {
        setCargando(false);
      }
    };
    obtener();
  }, []);

  // Función para determinar el estado de una reserva
  const obtenerEstadoReserva = (reserva) => {
    const hoy = new Date();
    const checkin = new Date(reserva.fecha_checkin);
    const checkout = new Date(reserva.fecha_checkout);
    
    // Normalizar fechas para comparación (solo día, mes, año)
    hoy.setHours(0, 0, 0, 0);
    checkin.setHours(0, 0, 0, 0);
    checkout.setHours(0, 0, 0, 0);

    if (hoy < checkin) return "pendiente";
    if (hoy >= checkin && hoy < checkout) return "activa";
    if (hoy >= checkout) return "finalizada";
    return "pendiente";
  };

  // Función para filtrar reservas
  useEffect(() => {
    let filtradas = reservas;

    // Filtro por texto (cliente o habitación)
    if (filtroTexto) {
      filtradas = filtradas.filter(reserva => 
        reserva.nombre_huesped?.toLowerCase().includes(filtroTexto.toLowerCase()) ||
        reserva.cliente_id?.toString().includes(filtroTexto) ||
        reserva.habitacion_id?.toString().includes(filtroTexto)
      );
    }

    // Filtro por estado
    if (filtroEstado !== "todas") {
      filtradas = filtradas.filter(reserva => 
        obtenerEstadoReserva(reserva) === filtroEstado
      );
    }

    // Filtro por fecha
    if (filtroFecha) {
      filtradas = filtradas.filter(reserva => {
        const fechaReserva = new Date(reserva.fecha_checkin).toISOString().split('T')[0];
        return fechaReserva === filtroFecha;
      });
    }

    setReservasFiltradas(filtradas);
  }, [reservas, filtroTexto, filtroEstado, filtroFecha]);

  const getEstadoColor = (estado) => {
    switch (estado) {
      case "pendiente":
        return "bg-amber-100 text-amber-700 border-amber-200";
      case "activa":
        return "bg-green-100 text-green-700 border-green-200";
      case "finalizada":
        return "bg-slate-100 text-slate-700 border-slate-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const getEstadoIcon = (estado) => {
    switch (estado) {
      case "pendiente":
        return <Clock className="w-4 h-4" />;
      case "activa":
        return <CheckCircle className="w-4 h-4" />;
      case "finalizada":
        return <XCircle className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const exportarCSV = () => {
    const csv = [
      ["ID", "Cliente", "Habitación", "Check-in", "Check-out", "Estado", "Total"],
      ...reservasFiltradas.map(r => [
        r.id,
        r.nombre_huesped || r.cliente_id,
        r.habitacion_id,
        new Date(r.fecha_checkin).toLocaleDateString('es-ES'),
        new Date(r.fecha_checkout).toLocaleDateString('es-ES'),
        obtenerEstadoReserva(r),
        r.total_estadia || "N/A"
      ])
    ].map(row => row.join(",")).join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reservas_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  // Estadísticas rápidas
  const estadisticas = {
    total: reservas.length,
    pendientes: reservas.filter(r => obtenerEstadoReserva(r) === "pendiente").length,
    activas: reservas.filter(r => obtenerEstadoReserva(r) === "activa").length,
    finalizadas: reservas.filter(r => obtenerEstadoReserva(r) === "finalizada").length,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-slate-200">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-3 rounded-xl">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-800">Ver Reservas</h1>
                <p className="text-slate-600">Gestiona todas las reservas del hotel</p>
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-4 border border-slate-200">
            <div className="flex items-center gap-3">
              <Calendar className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-sm text-slate-600 font-medium">Total</p>
                <p className="text-2xl font-bold text-slate-800">{estadisticas.total}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-lg p-4 border border-slate-200">
            <div className="flex items-center gap-3">
              <Clock className="w-8 h-8 text-amber-600" />
              <div>
                <p className="text-sm text-amber-600 font-medium">Pendientes</p>
                <p className="text-2xl font-bold text-amber-700">{estadisticas.pendientes}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-lg p-4 border border-slate-200">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-sm text-green-600 font-medium">Activas</p>
                <p className="text-2xl font-bold text-green-700">{estadisticas.activas}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-lg p-4 border border-slate-200">
            <div className="flex items-center gap-3">
              <XCircle className="w-8 h-8 text-slate-600" />
              <div>
                <p className="text-sm text-slate-600 font-medium">Finalizadas</p>
                <p className="text-2xl font-bold text-slate-700">{estadisticas.finalizadas}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-slate-200">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-slate-600" />
            <h3 className="text-lg font-semibold text-slate-800">Filtros</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Búsqueda por texto */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Buscar por cliente o habitación
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar..."
                  value={filtroTexto}
                  onChange={(e) => setFiltroTexto(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-12 pr-4 py-3 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-slate-400"
                />
              </div>
            </div>

            {/* Filtro por estado */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Estado de la reserva
              </label>
              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="todas">Todas las reservas</option>
                <option value="pendiente">Pendientes</option>
                <option value="activa">Activas</option>
                <option value="finalizada">Finalizadas</option>
              </select>
            </div>

            {/* Filtro por fecha */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Fecha de check-in
              </label>
              <input
                type="date"
                value={filtroFecha}
                onChange={(e) => setFiltroFecha(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Botón limpiar filtros */}
          {(filtroTexto || filtroEstado !== "todas" || filtroFecha) && (
            <button
              onClick={() => {
                setFiltroTexto("");
                setFiltroEstado("todas");
                setFiltroFecha("");
              }}
              className="mt-4 px-4 py-2 text-sm text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-all duration-200"
            >
              Limpiar filtros
            </button>
          )}
        </div>

        {/* Tabla de reservas */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
                <Calendar className="w-6 h-6 text-blue-600" />
                Reservas ({reservasFiltradas.length})
              </h3>
            </div>
          </div>

          {cargando ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-slate-600">Cargando reservas...</p>
            </div>
          ) : reservasFiltradas.length === 0 ? (
            <div className="p-8 text-center">
              <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">No se encontraron reservas con los filtros aplicados</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-medium text-slate-700">ID</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-slate-700">Cliente</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-slate-700">Habitación</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-slate-700">Check-in</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-slate-700">Check-out</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-slate-700">Estado</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-slate-700">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {reservasFiltradas.map((reserva) => {
                    const estado = obtenerEstadoReserva(reserva);
                    return (
                      <tr key={reserva.id} className="hover:bg-slate-50 transition-colors duration-200">
                        <td className="px-6 py-4">
                          <span className="text-sm font-medium text-slate-900">#{reserva.id}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-slate-500" />
                            <span className="text-sm text-slate-900">
                              {reserva.nombre_huesped || `Cliente ${reserva.cliente_id}`}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Home className="w-4 h-4 text-slate-500" />
                            <span className="text-sm font-medium text-slate-900">
                              Habitación {reserva.habitacion_id}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <CalendarDays className="w-4 h-4 text-slate-500" />
                            <span className="text-sm text-slate-700">
                              {new Date(reserva.fecha_checkin).toLocaleDateString('es-ES')}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <CalendarDays className="w-4 h-4 text-slate-500" />
                            <span className="text-sm text-slate-700">
                              {new Date(reserva.fecha_checkout).toLocaleDateString('es-ES')}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border ${getEstadoColor(estado)}`}>
                            {getEstadoIcon(estado)}
                            {estado.charAt(0).toUpperCase() + estado.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {reserva.total_estadia ? (
                            <div className="flex items-center gap-1">
                              <DollarSign className="w-4 h-4 text-green-600" />
                              <span className="text-sm font-semibold text-green-600">
                                ${reserva.total_estadia.toLocaleString()}
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm text-slate-400">N/A</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}