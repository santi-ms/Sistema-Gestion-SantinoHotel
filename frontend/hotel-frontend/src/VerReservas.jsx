import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL, TOKEN_KEY } from "./config";
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
  DollarSign,
  Trash2,
  X,
  RefreshCw,
  MessageCircle
} from "lucide-react";
import ConfirmModal from "./components/ConfirmModal";
import Modal from "./components/Modal";
import { SkeletonTable, SkeletonStats } from "./components/Skeleton";
import { EmptyState } from "./components/EmptyState";

export default function VerReservas() {
  const [reservas, setReservas] = useState([]);
  const [reservasFiltradas, setReservasFiltradas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [filtroTexto, setFiltroTexto] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("todas");
  const [filtroFecha, setFiltroFecha] = useState("");
  const [mostrarConfirmEliminar, setMostrarConfirmEliminar] = useState(false);
  const [reservaEliminarId, setReservaEliminarId] = useState(null);
  const [usuarioRol, setUsuarioRol] = useState(null);
  const [mostrarDetalles, setMostrarDetalles] = useState(false);
  const [reservaDetalle, setReservaDetalle] = useState(null);
  const [mostrarCambiarHabitacion, setMostrarCambiarHabitacion] = useState(false);
  const [reservaCambiarHabitacion, setReservaCambiarHabitacion] = useState(null);
  const [nuevaHabitacion, setNuevaHabitacion] = useState("");
  const [habitaciones, setHabitaciones] = useState([]);
  const [cargandoHabitaciones, setCargandoHabitaciones] = useState(false);
  const navigate = useNavigate();

  // Obtener rol del usuario desde el token
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        setUsuarioRol(payload.rol);
      } catch (err) {
        console.error("Error al decodificar token:", err);
      }
    }
  }, []);

  useEffect(() => {
    const obtener = async () => {
      setCargando(true);
      try {
        const token = localStorage.getItem(TOKEN_KEY);
        const res = await axios.get(`${API_BASE_URL}/reservas`, {
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
    obtenerHabitaciones();
  }, []);

  const obtenerHabitaciones = async () => {
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      const res = await axios.get(`${API_BASE_URL}/habitaciones`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log("🏨 [VerReservas] Habitaciones cargadas:", res.data.map(h => ({ id: h.id, numero: h.numero })));
      setHabitaciones(res.data);
    } catch (error) {
      console.error("Error al obtener habitaciones:", error);
    }
  };

  // Función para determinar el estado de una reserva
  const obtenerEstadoReserva = (reserva) => {
    // Si está cancelada, siempre retornar cancelada
    if (reserva.estado === "cancelada") {
      return "cancelada";
    }
    
    // Calcular estado basado en fechas primero
    const hoy = new Date();
    const checkin = new Date(reserva.fecha_checkin);
    const checkout = new Date(reserva.fecha_checkout);
    
    // Normalizar fechas para comparación (solo día, mes, año)
    hoy.setHours(0, 0, 0, 0);
    checkin.setHours(0, 0, 0, 0);
    checkout.setHours(0, 0, 0, 0);

    // Si ya pasó la fecha de checkout, debe ser completada o finalizada
    if (hoy >= checkout) {
      // Si tiene estado "completada" en BD, usar ese
      if (reserva.estado === "completada") {
        return "completada";
      }
      // Si no, retornar "finalizada" (reservas antiguas sin estado)
      return "finalizada";
    }
    
    // Si aún no ha llegado el check-in, es pendiente
    if (hoy < checkin) {
      return "pendiente";
    }
    
    // Si estamos entre check-in y check-out, es activa
    if (hoy >= checkin && hoy < checkout) {
      // Si tiene estado en BD y no es cancelada, usarlo
      if (reserva.estado && reserva.estado !== "cancelada") {
        return reserva.estado;
      }
      return "activa";
    }
    
    // Fallback
    return "pendiente";
  };

  // Función para cancelar/eliminar reserva
  const abrirConfirmEliminar = (id) => {
    setReservaEliminarId(id);
    setMostrarConfirmEliminar(true);
  };

  const abrirDetalles = (reserva) => {
    setReservaDetalle(reserva);
    setMostrarDetalles(true);
  };

  const abrirCambiarHabitacion = (reserva) => {
    setReservaCambiarHabitacion(reserva);
    setNuevaHabitacion("");
    setMostrarCambiarHabitacion(true);
  };

  const cambiarHabitacion = async () => {
    if (!nuevaHabitacion || nuevaHabitacion === reservaCambiarHabitacion.habitacion_id.toString()) {
      alert("Por favor selecciona una habitación diferente");
      return;
    }

    // Verificar que la habitación seleccionada existe
    const habitacionSeleccionada = habitaciones.find(h => h.id.toString() === nuevaHabitacion);
    if (!habitacionSeleccionada) {
      alert("Error: Habitación seleccionada no encontrada");
      return;
    }

    console.log("🔄 [Cambiar Habitación]", {
      reserva_id: reservaCambiarHabitacion.id,
      habitacion_actual_id: reservaCambiarHabitacion.habitacion_id,
      nueva_habitacion_id: parseInt(nuevaHabitacion),
      nueva_habitacion_numero: habitacionSeleccionada.numero,
      habitacion_seleccionada: habitacionSeleccionada
    });

    setCargandoHabitaciones(true);
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      const habitacionIdFinal = parseInt(nuevaHabitacion);
      
      console.log("📤 [Cambiar Habitación] Enviando al backend:", {
        reserva_id: reservaCambiarHabitacion.id,
        habitacion_id: habitacionIdFinal
      });
      
      const response = await axios.put(`${API_BASE_URL}/reservas/${reservaCambiarHabitacion.id}`, {
        habitacion_id: habitacionIdFinal
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log("✅ [Cambiar Habitación] Respuesta del backend:", response.data);
      console.log(`   Nueva habitación: ID=${response.data.habitacion_id}, Número=${response.data.habitacion_numero}`);

      // Recargar las reservas desde el backend para obtener los datos actualizados
      const res = await axios.get(`${API_BASE_URL}/reservas`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setReservas(res.data);
      setReservasFiltradas(res.data);
      
      setMostrarCambiarHabitacion(false);
      setReservaCambiarHabitacion(null);
      setNuevaHabitacion("");
      alert("Habitación cambiada correctamente");
    } catch (error) {
      console.error("Error al cambiar habitación:", error);
      const mensaje = error.response?.data?.detail || error.message;
      alert("Error al cambiar habitación: " + mensaje);
    } finally {
      setCargandoHabitaciones(false);
    }
  };

  const eliminarReserva = async () => {
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      await axios.delete(`${API_BASE_URL}/reservas/${reservaEliminarId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Actualizar el estado local
      const nuevasReservas = reservas.filter(r => r.id !== reservaEliminarId);
      setReservas(nuevasReservas);
      setReservasFiltradas(nuevasReservas);
      
      setMostrarConfirmEliminar(false);
      setReservaEliminarId(null);
      
      alert("Reserva cancelada correctamente");
    } catch (error) {
      console.error("Error al eliminar reserva:", error);
      const mensaje = error.response?.data?.detail || error.message;
      alert("Error al cancelar la reserva: " + mensaje);
    }
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
      filtradas = filtradas.filter(reserva => {
        const estado = obtenerEstadoReserva(reserva);
        // Si se filtra por "completada", incluir también "finalizada"
        if (filtroEstado === "completada") {
          return estado === "completada" || estado === "finalizada";
        }
        return estado === filtroEstado;
      });
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
        return "bg-gradient-to-r from-amber-50 to-amber-100 text-amber-800 border-amber-300 shadow-sm";
      case "activa":
        return "bg-gradient-to-r from-blue-50 to-blue-100 text-blue-800 border-blue-300 shadow-sm";
      case "completada":
      case "finalizada":
        return "bg-gradient-to-r from-green-50 to-green-100 text-green-800 border-green-300 shadow-sm";
      case "cancelada":
        return "bg-gradient-to-r from-red-50 to-red-100 text-red-800 border-red-300 shadow-sm";
      default:
        return "bg-gradient-to-r from-slate-50 to-slate-100 text-slate-800 border-slate-300 shadow-sm";
    }
  };

  const getEstadoIcon = (estado) => {
    switch (estado) {
      case "pendiente":
        return <Clock className="w-4 h-4" />;
      case "activa":
        return <CheckCircle className="w-4 h-4" />;
      case "completada":
      case "finalizada":
        return <CheckCircle className="w-4 h-4" />;
      case "cancelada":
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
        r.habitacion_numero || r.habitacion_id,
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
    completadas: reservas.filter(r => {
      const estado = obtenerEstadoReserva(r);
      return estado === "completada" || estado === "finalizada";
    }).length,
    canceladas: reservas.filter(r => obtenerEstadoReserva(r) === "cancelada").length,
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
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all duration-200 shadow-md hover:shadow-lg hover:scale-105 active:scale-95"
              >
                <Download className="w-4 h-4" />
                Exportar CSV
              </button>
              <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95"
              >
                <ArrowLeft className="w-4 h-4" />
                Volver
              </button>
            </div>
          </div>
        </div>

        {/* Estadísticas */}
        {cargando ? (
          <div className="mb-8">
            <SkeletonStats />
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-xl shadow-lg p-4 border border-slate-200 hover:shadow-xl transition-shadow duration-200">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <Calendar className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-600 font-medium">Total</p>
                  <p className="text-2xl font-bold text-slate-800">{estadisticas.total}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-lg p-4 border border-slate-200 hover:shadow-xl transition-shadow duration-200">
              <div className="flex items-center gap-3">
                <div className="bg-amber-100 p-2 rounded-lg">
                  <Clock className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-amber-600 font-medium">Pendientes</p>
                  <p className="text-2xl font-bold text-amber-700">{estadisticas.pendientes}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-lg p-4 border border-slate-200 hover:shadow-xl transition-shadow duration-200">
              <div className="flex items-center gap-3">
                <div className="bg-green-100 p-2 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-green-600 font-medium">Activas</p>
                  <p className="text-2xl font-bold text-green-700">{estadisticas.activas}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-lg p-4 border border-slate-200 hover:shadow-xl transition-shadow duration-200">
              <div className="flex items-center gap-3">
                <div className="bg-green-100 p-2 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-green-600 font-medium">Completadas</p>
                  <p className="text-2xl font-bold text-green-700">{estadisticas.completadas}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-lg p-4 border border-slate-200 hover:shadow-xl transition-shadow duration-200">
              <div className="flex items-center gap-3">
                <div className="bg-red-100 p-2 rounded-lg">
                  <XCircle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-red-600 font-medium">Canceladas</p>
                  <p className="text-2xl font-bold text-red-700">{estadisticas.canceladas}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filtros */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-slate-200 animate-slide-up">
          <div className="flex items-center gap-2 mb-4">
            <div className="bg-blue-100 p-2 rounded-lg">
              <Filter className="w-5 h-5 text-blue-600" />
            </div>
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
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-12 pr-4 py-3 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-slate-400 transition-all duration-200 hover:border-slate-400"
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
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 hover:border-slate-400 cursor-pointer"
              >
                <option value="todas">Todas las reservas</option>
                <option value="pendiente">Pendientes</option>
                <option value="activa">Activas</option>
                <option value="completada">Completadas</option>
                <option value="cancelada">Canceladas</option>
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
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 hover:border-slate-400 cursor-pointer"
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
            <div className="p-8">
              <SkeletonTable rows={5} columns={8} />
            </div>
          ) : reservasFiltradas.length === 0 ? (
            <EmptyState
              icon={Calendar}
              title="No se encontraron reservas"
              description={filtroTexto || filtroEstado !== "todas" || filtroFecha 
                ? "Intenta ajustar los filtros para ver más resultados"
                : "Aún no hay reservas registradas en el sistema"}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-slate-50 to-slate-100 border-b-2 border-slate-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">ID</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Cliente</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Habitación</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Check-in</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Check-out</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Estado</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Total</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Acciones</th>
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
                              Habitación {reserva.habitacion_numero || reserva.habitacion_id}
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
                          <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border shadow-sm transition-all duration-200 hover:scale-105 ${getEstadoColor(estado)}`}>
                            {getEstadoIcon(estado)}
                            {estado === "finalizada" ? "Completada" : estado.charAt(0).toUpperCase() + estado.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {reserva.total_estadia ? (
                            <div className="flex items-center gap-1.5">
                              <div className="bg-green-100 p-1.5 rounded-lg">
                                <DollarSign className="w-4 h-4 text-green-600" />
                              </div>
                              <span className="text-sm font-bold text-green-700">
                                ${reserva.total_estadia.toLocaleString()}
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm text-slate-400">N/A</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => abrirDetalles(reserva)}
                              className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-lg transition-all duration-200 hover:scale-110 active:scale-95"
                              title="Ver detalles completos"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => abrirCambiarHabitacion(reserva)}
                              className="p-2 text-green-600 hover:text-green-800 hover:bg-green-100 rounded-lg transition-all duration-200 hover:scale-110 active:scale-95"
                              title="Cambiar habitación"
                            >
                              <RefreshCw className="w-4 h-4" />
                            </button>
                            {usuarioRol === "dueño" && estado !== "cancelada" && (
                              <button
                                onClick={() => abrirConfirmEliminar(reserva.id)}
                                className="p-2 text-red-600 hover:text-red-800 hover:bg-red-100 rounded-lg transition-all duration-200 hover:scale-110 active:scale-95"
                                title="Cancelar reserva"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                            {estado === "cancelada" && usuarioRol === "dueño" && (
                              <span className="text-xs text-red-600 font-medium">Cancelada</span>
                            )}
                          </div>
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

      {/* Modal de confirmación para eliminar/cancelar reserva */}
      <ConfirmModal
        isOpen={mostrarConfirmEliminar}
        onClose={() => {
          setMostrarConfirmEliminar(false);
          setReservaEliminarId(null);
        }}
        onConfirm={eliminarReserva}
        title="Cancelar/Eliminar Reserva"
        message="¿Estás seguro de que deseas cancelar y eliminar esta reserva? Esta acción no se puede deshacer."
        confirmText="Sí, cancelar"
        cancelText="No, mantener"
        type="danger"
      />

      {/* Modal de detalles de la reserva */}
      <Modal
        isOpen={mostrarDetalles}
        onClose={() => {
          setMostrarDetalles(false);
          setReservaDetalle(null);
        }}
        title={`Detalles de la Reserva #${reservaDetalle?.id}`}
        size="lg"
      >
        {reservaDetalle && (
          <div className="space-y-6">
            {/* Información básica */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <User className="w-5 h-5 text-blue-600" />
                    <h3 className="text-sm font-semibold text-blue-700">Cliente</h3>
                  </div>
                  {reservaDetalle.cliente_celular && (
                    <a
                      href={`https://wa.me/${reservaDetalle.cliente_celular.replace(/\D/g, '')}?text=Hola%20${encodeURIComponent(reservaDetalle.cliente_nombre || reservaDetalle.nombre_huesped || '')}%2C%20te%20contacto%20por%20tu%20reserva%20%23${reservaDetalle.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-all duration-200 shadow-sm hover:shadow-md"
                      title="Abrir WhatsApp"
                    >
                      <MessageCircle className="w-4 h-4" />
                      WhatsApp
                    </a>
                  )}
                </div>
                <p className="text-lg font-medium text-slate-900">
                  {reservaDetalle.nombre_huesped || reservaDetalle.cliente_nombre || `Cliente #${reservaDetalle.cliente_id}`}
                </p>
                {reservaDetalle.cliente_id && (
                  <p className="text-sm text-slate-600 mt-1">ID Cliente: {reservaDetalle.cliente_id}</p>
                )}
                {reservaDetalle.cliente_celular && (
                  <p className="text-sm text-slate-600 mt-1">Tel: {reservaDetalle.cliente_celular}</p>
                )}
              </div>

              <div className="bg-green-50 p-4 rounded-xl border border-green-200">
                <div className="flex items-center gap-2 mb-2">
                  <Home className="w-5 h-5 text-green-600" />
                  <h3 className="text-sm font-semibold text-green-700">Habitación</h3>
                </div>
                <p className="text-lg font-medium text-slate-900">
                  Habitación {reservaDetalle.habitacion_numero || reservaDetalle.habitacion_id}
                </p>
              </div>
            </div>

            {/* Fechas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-purple-50 p-4 rounded-xl border border-purple-200">
                <div className="flex items-center gap-2 mb-2">
                  <CalendarDays className="w-5 h-5 text-purple-600" />
                  <h3 className="text-sm font-semibold text-purple-700">Check-in</h3>
                </div>
                <p className="text-lg font-medium text-slate-900">
                  {new Date(reservaDetalle.fecha_checkin).toLocaleDateString('es-ES', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
                <p className="text-sm text-slate-600 mt-1">
                  {new Date(reservaDetalle.fecha_checkin).toLocaleTimeString('es-ES', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>

              <div className="bg-orange-50 p-4 rounded-xl border border-orange-200">
                <div className="flex items-center gap-2 mb-2">
                  <CalendarDays className="w-5 h-5 text-orange-600" />
                  <h3 className="text-sm font-semibold text-orange-700">Check-out</h3>
                </div>
                <p className="text-lg font-medium text-slate-900">
                  {new Date(reservaDetalle.fecha_checkout).toLocaleDateString('es-ES', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
                <p className="text-sm text-slate-600 mt-1">
                  {new Date(reservaDetalle.fecha_checkout).toLocaleTimeString('es-ES', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>

            {/* Estado y origen */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <h3 className="text-sm font-semibold text-slate-700 mb-2">Estado</h3>
                <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium border ${getEstadoColor(obtenerEstadoReserva(reservaDetalle))}`}>
                  {getEstadoIcon(obtenerEstadoReserva(reservaDetalle))}
                  {obtenerEstadoReserva(reservaDetalle) === "finalizada" ? "Completada" : obtenerEstadoReserva(reservaDetalle).charAt(0).toUpperCase() + obtenerEstadoReserva(reservaDetalle).slice(1)}
                </span>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <h3 className="text-sm font-semibold text-slate-700 mb-2">Origen</h3>
                <p className="text-base font-medium text-slate-900">
                  {reservaDetalle.origen ? (
                    <span className="capitalize">{reservaDetalle.origen}</span>
                  ) : (
                    <span className="text-slate-400">No especificado</span>
                  )}
                </p>
              </div>
            </div>

            {/* Información financiera */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-xl border-2 border-green-200">
              <h3 className="text-lg font-bold text-green-800 mb-4 flex items-center gap-2">
                <DollarSign className="w-6 h-6" />
                Información Financiera
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-green-700 font-medium mb-1">Seña</p>
                  <p className="text-2xl font-bold text-green-800">
                    ${reservaDetalle.seña?.toLocaleString() || "0"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-green-700 font-medium mb-1">Total Estadía</p>
                  <p className="text-2xl font-bold text-green-800">
                    ${reservaDetalle.total_estadia?.toLocaleString() || "0"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-green-700 font-medium mb-1">Forma de Pago</p>
                  <p className="text-lg font-semibold text-green-800 capitalize">
                    {reservaDetalle.forma_pago || "No especificado"}
                  </p>
                </div>
              </div>
              {reservaDetalle.total_estadia && reservaDetalle.seña && (
                <div className="mt-4 pt-4 border-t border-green-200">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-green-700 font-medium">Saldo Pendiente</span>
                    <span className="text-xl font-bold text-green-800">
                      ${(reservaDetalle.total_estadia - reservaDetalle.seña).toLocaleString()}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Información adicional si existe */}
            {(reservaDetalle.origen === "web" || reservaDetalle.origen === "whatsapp") && (
              <div className="bg-amber-50 p-4 rounded-xl border border-amber-200">
                <h3 className="text-sm font-semibold text-amber-700 mb-2">Notas Adicionales</h3>
                <p className="text-sm text-slate-700">
                  Esta reserva fue creada desde {reservaDetalle.origen === "web" ? "la página web" : "WhatsApp"}.
                  {reservaDetalle.origen === "web" && " Puede contener información adicional como email, teléfono, mascotas, etc."}
                </p>
              </div>
            )}

            {/* Botón para cambiar habitación */}
            {obtenerEstadoReserva(reservaDetalle) !== "cancelada" && (
              <div className="pt-4 border-t border-slate-200">
                <button
                  onClick={() => {
                    setMostrarDetalles(false);
                    abrirCambiarHabitacion(reservaDetalle);
                  }}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  <RefreshCw className="w-5 h-5" />
                  Cambiar Habitación
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Modal para cambiar habitación */}
      <Modal
        isOpen={mostrarCambiarHabitacion}
        onClose={() => {
          setMostrarCambiarHabitacion(false);
          setReservaCambiarHabitacion(null);
          setNuevaHabitacion("");
        }}
        title="Cambiar Habitación"
        size="md"
      >
        {reservaCambiarHabitacion && (
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
              <p className="text-sm text-blue-700 font-medium mb-2">Reserva #{reservaCambiarHabitacion.id}</p>
              <p className="text-base text-slate-900">
                <strong>Cliente:</strong> {reservaCambiarHabitacion.nombre_huesped || `Cliente ${reservaCambiarHabitacion.cliente_id}`}
              </p>
              <p className="text-sm text-slate-600 mt-1">
                <strong>Habitación actual:</strong> {
                  (() => {
                    const habActual = habitaciones.find(h => h.id === reservaCambiarHabitacion.habitacion_id);
                    return habActual ? `Habitación ${habActual.numero}` : `ID ${reservaCambiarHabitacion.habitacion_id}`;
                  })()
                }
              </p>
              <p className="text-sm text-slate-600">
                <strong>Fechas:</strong> {new Date(reservaCambiarHabitacion.fecha_checkin).toLocaleDateString('es-ES')} - {new Date(reservaCambiarHabitacion.fecha_checkout).toLocaleDateString('es-ES')}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Nueva Habitación *
              </label>
              <div className="relative">
                <Home className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <select
                  value={nuevaHabitacion}
                  onChange={(e) => setNuevaHabitacion(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-12 pr-4 py-3 text-slate-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="">Selecciona una habitación</option>
                  {(() => {
                    // Filtrar habitaciones disponibles (excluir la actual y verificar disponibilidad)
                    const habitacionActualId = reservaCambiarHabitacion.habitacion_id;
                    const fechaCheckin = new Date(reservaCambiarHabitacion.fecha_checkin);
                    const fechaCheckout = new Date(reservaCambiarHabitacion.fecha_checkout);
                    
                    const habitacionesDisponibles = habitaciones
                      .filter(h => {
                        // Excluir la habitación actual
                        if (h.id === habitacionActualId) return false;
                        
                        // Verificar que la habitación no esté ocupada en esas fechas
                        const estaOcupada = reservas.some(r => 
                          r.habitacion_id === h.id &&
                          r.id !== reservaCambiarHabitacion.id &&
                          r.estado !== "cancelada" &&
                          new Date(r.fecha_checkin) < fechaCheckout &&
                          new Date(r.fecha_checkout) > fechaCheckin
                        );
                        
                        return !estaOcupada;
                      })
                      .sort((a, b) => a.numero - b.numero);
                    
                    console.log("📋 [Cambiar Habitación] Habitaciones disponibles:", habitacionesDisponibles.map(h => ({ id: h.id, numero: h.numero })));
                    console.log("📋 [Cambiar Habitación] Todas las habitaciones:", habitaciones.map(h => ({ id: h.id, numero: h.numero })));
                    
                    return habitacionesDisponibles.map(habitacion => (
                      <option key={habitacion.id} value={habitacion.id}>
                        Habitación {habitacion.numero} - {habitacion.tipo} (Capacidad: {habitacion.capacidad} personas)
                      </option>
                    ));
                  })()}
                </select>
              </div>
              <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                Se validará automáticamente que la habitación esté disponible en las fechas de la reserva
              </p>
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t border-slate-200">
              <button
                onClick={() => {
                  setMostrarCambiarHabitacion(false);
                  setReservaCambiarHabitacion(null);
                  setNuevaHabitacion("");
                }}
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={cambiarHabitacion}
                disabled={!nuevaHabitacion || cargandoHabitaciones}
                className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {cargandoHabitaciones ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Cambiando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    Cambiar Habitación
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}