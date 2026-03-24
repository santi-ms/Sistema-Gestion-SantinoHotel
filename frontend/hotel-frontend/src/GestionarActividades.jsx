import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL, TOKEN_KEY } from "./config";
import { useToast } from "./components/ToastContainer";
import ConfirmModal from "./components/ConfirmModal";
import {
  CheckSquare,
  Plus,
  Save,
  Edit3,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Filter,
  Calendar,
  Flag,
  User,
  Search
} from "lucide-react";
import AppLayout from "./components/Layout/AppLayout";

export default function GestionarActividades() {
  const [actividades, setActividades] = useState([]);
  const [actividadesFiltradas, setActividadesFiltradas] = useState([]);
  const [form, setForm] = useState({
    titulo: "",
    descripcion: "",
    prioridad: "media",
    fecha_vencimiento: "",
    asignado_a: null
  });
  const [editandoId, setEditandoId] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [mostrarConfirmEliminar, setMostrarConfirmEliminar] = useState(false);
  const [actividadAEliminar, setActividadAEliminar] = useState(null);
  const [filtroEstado, setFiltroEstado] = useState("todas");
  const [filtroPrioridad, setFiltroPrioridad] = useState("todas");
  const [busqueda, setBusqueda] = useState("");
  const [userRole, setUserRole] = useState("");
  const { success, error: errorToast } = useToast();
  const navigate = useNavigate();

  const token = localStorage.getItem(TOKEN_KEY);

  // Obtener rol del usuario
  useEffect(() => {
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        setUserRole(payload.rol);
      } catch (error) {
        console.error("Error al decodificar token:", error);
      }
    }
  }, [token]);

  // Cargar actividades
  const cargarActividades = async () => {
    setCargando(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/actividades`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setActividades(res.data);
      setActividadesFiltradas(res.data);
    } catch (err) {
      console.error("Error al cargar actividades:", err);
      errorToast("Error al cargar actividades");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarActividades();
  }, []);

  // Filtrar actividades
  useEffect(() => {
    let filtradas = actividades;

    // Filtro por búsqueda
    if (busqueda) {
      filtradas = filtradas.filter(actividad =>
        actividad.titulo.toLowerCase().includes(busqueda.toLowerCase()) ||
        actividad.descripcion?.toLowerCase().includes(busqueda.toLowerCase())
      );
    }

    // Filtro por estado
    if (filtroEstado !== "todas") {
      filtradas = filtradas.filter(actividad => actividad.estado === filtroEstado);
    }

    // Filtro por prioridad
    if (filtroPrioridad !== "todas") {
      filtradas = filtradas.filter(actividad => actividad.prioridad === filtroPrioridad);
    }

    setActividadesFiltradas(filtradas);
  }, [actividades, busqueda, filtroEstado, filtroPrioridad]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({
      ...form,
      [name]: value
    });
  };

  const handleSubmit = async () => {
    if (!form.titulo.trim()) {
      errorToast("El título es obligatorio");
      return;
    }

    setCargando(true);
    try {
      const payload = {
        titulo: form.titulo.trim(),
        descripcion: form.descripcion.trim() || null,
        prioridad: form.prioridad,
        fecha_vencimiento: form.fecha_vencimiento || null,
        asignado_a: form.asignado_a ? parseInt(form.asignado_a) : null
      };

      if (editandoId) {
        await axios.put(`${API_BASE_URL}/actividades/${editandoId}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        success("Actividad actualizada correctamente");
      } else {
        await axios.post(`${API_BASE_URL}/actividades`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        success("Actividad creada correctamente");
      }

      setForm({
        titulo: "",
        descripcion: "",
        prioridad: "media",
        fecha_vencimiento: "",
        asignado_a: null
      });
      setEditandoId(null);
      setMostrarFormulario(false);
      cargarActividades();
    } catch (err) {
      errorToast(err.response?.data?.detail || "Error al guardar actividad");
    } finally {
      setCargando(false);
    }
  };

  const cargarParaEditar = (actividad) => {
    setForm({
      titulo: actividad.titulo,
      descripcion: actividad.descripcion || "",
      prioridad: actividad.prioridad,
      fecha_vencimiento: actividad.fecha_vencimiento 
        ? new Date(actividad.fecha_vencimiento).toISOString().slice(0, 16)
        : "",
      asignado_a: actividad.asignado_a?.toString() || ""
    });
    setEditandoId(actividad.id);
    setMostrarFormulario(true);
    window.scrollTo(0, 0);
  };

  const cancelarEdicion = () => {
    setForm({
      titulo: "",
      descripcion: "",
      prioridad: "media",
      fecha_vencimiento: "",
      asignado_a: null
    });
    setEditandoId(null);
    setMostrarFormulario(false);
  };

  const cambiarEstado = async (id, nuevoEstado) => {
    try {
      await axios.put(`${API_BASE_URL}/actividades/${id}`, { estado: nuevoEstado }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      success(`Actividad marcada como ${nuevoEstado === "completada" ? "completada" : nuevoEstado}`);
      cargarActividades();
    } catch (err) {
      errorToast("Error al actualizar estado");
    }
  };

  const abrirConfirmEliminar = (id) => {
    setActividadAEliminar(id);
    setMostrarConfirmEliminar(true);
  };

  const eliminarActividad = async () => {
    try {
      await axios.delete(`${API_BASE_URL}/actividades/${actividadAEliminar}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      success("Actividad eliminada correctamente");
      setMostrarConfirmEliminar(false);
      cargarActividades();
    } catch (err) {
      errorToast("Error al eliminar actividad");
    }
  };

  const getEstadoColor = (estado) => {
    switch (estado) {
      case "completada":
        return "bg-green-100 text-green-700 border-green-200";
      case "en_progreso":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "pendiente":
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const getPrioridadColor = (prioridad) => {
    switch (prioridad) {
      case "alta":
        return "bg-red-100 text-red-700 border-red-200";
      case "media":
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "baja":
        return "bg-green-100 text-green-700 border-green-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const getEstadoIcon = (estado) => {
    switch (estado) {
      case "completada":
        return <CheckCircle className="w-4 h-4" />;
      case "en_progreso":
        return <Clock className="w-4 h-4" />;
      case "pendiente":
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const formatearFecha = (fecha) => {
    if (!fecha) return "Sin fecha";
    const fechaObj = new Date(fecha);
    return fechaObj.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <AppLayout
      role="empleado"
      pageTitle="Gestión de Actividades"
      topbarActions={
        <button
          onClick={() => {
            setMostrarFormulario(true);
            cancelarEdicion();
          }}
          className="flex items-center gap-2 px-3 py-2 bg-primary-container hover:bg-primary text-white rounded-xl font-semibold text-sm transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Nueva Actividad
        </button>
      }
    >
      <div className="space-y-6 max-w-7xl mx-auto">

        {/* Filtros */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-slate-200">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar actividades..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="todas">Todas las actividades</option>
              <option value="pendiente">Pendientes</option>
              <option value="en_progreso">En progreso</option>
              <option value="completada">Completadas</option>
            </select>
            <select
              value={filtroPrioridad}
              onChange={(e) => setFiltroPrioridad(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="todas">Todas las prioridades</option>
              <option value="alta">Alta</option>
              <option value="media">Media</option>
              <option value="baja">Baja</option>
            </select>
            <button
              onClick={() => {
                setBusqueda("");
                setFiltroEstado("todas");
                setFiltroPrioridad("todas");
              }}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
            >
              Limpiar filtros
            </button>
          </div>
        </div>

        {/* Formulario */}
        {mostrarFormulario && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-slate-200">
            <h2 className="text-xl font-bold text-slate-800 mb-4">
              {editandoId ? "Editar Actividad" : "Nueva Actividad"}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Título *
                </label>
                <input
                  type="text"
                  name="titulo"
                  value={form.titulo}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ej: Limpiar habitación 5"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Descripción
                </label>
                <textarea
                  name="descripcion"
                  value={form.descripcion}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Detalles adicionales de la actividad..."
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Prioridad
                  </label>
                  <select
                    name="prioridad"
                    value={form.prioridad}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="baja">Baja</option>
                    <option value="media">Media</option>
                    <option value="alta">Alta</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Fecha de vencimiento
                  </label>
                  <input
                    type="datetime-local"
                    name="fecha_vencimiento"
                    value={form.fecha_vencimiento}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleSubmit}
                  disabled={cargando}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {editandoId ? "Actualizar" : "Crear"}
                </button>
                <button
                  onClick={cancelarEdicion}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-6 py-2 rounded-lg font-medium transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Lista de actividades */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200">
          {cargando && actividades.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-slate-600">Cargando actividades...</span>
            </div>
          ) : actividadesFiltradas.length === 0 ? (
            <div className="text-center py-12">
              <CheckSquare className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600">No hay actividades para mostrar</p>
            </div>
          ) : (
            <div className="space-y-4">
              {actividadesFiltradas.map((actividad) => (
                <div
                  key={actividad.id}
                  className="border border-slate-200 rounded-xl p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-start gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-slate-800">
                          {actividad.titulo}
                        </h3>
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getEstadoColor(actividad.estado)}`}>
                          {getEstadoIcon(actividad.estado)}
                          {actividad.estado === "completada" ? "Completada" : actividad.estado === "en_progreso" ? "En progreso" : "Pendiente"}
                        </span>
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getPrioridadColor(actividad.prioridad)}`}>
                          <Flag className="w-3 h-3" />
                          {actividad.prioridad.charAt(0).toUpperCase() + actividad.prioridad.slice(1)}
                        </span>
                      </div>
                      {actividad.descripcion && (
                        <p className="text-slate-600 mb-2">{actividad.descripcion}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          Creada: {formatearFecha(actividad.fecha_creacion)}
                        </div>
                        {actividad.fecha_vencimiento && (
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            Vence: {formatearFecha(actividad.fecha_vencimiento)}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      {actividad.estado !== "completada" && (
                        <button
                          onClick={() => cambiarEstado(actividad.id, actividad.estado === "pendiente" ? "en_progreso" : "completada")}
                          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                        >
                          <CheckCircle className="w-4 h-4" />
                          {actividad.estado === "pendiente" ? "Iniciar" : "Completar"}
                        </button>
                      )}
                      <div className="flex gap-2">
                        <button
                          onClick={() => cargarParaEditar(actividad)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => abrirConfirmEliminar(actividad.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Modal de confirmación */}
      <ConfirmModal
        isOpen={mostrarConfirmEliminar}
        onClose={() => setMostrarConfirmEliminar(false)}
        onConfirm={eliminarActividad}
        title="Eliminar Actividad"
        message="¿Estás seguro de que deseas eliminar esta actividad? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        cancelText="Cancelar"
        type="danger"
      />
    </AppLayout>
  );
}

