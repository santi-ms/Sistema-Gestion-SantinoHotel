import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL, TOKEN_KEY } from "./config";
import { useToast } from "./components/ToastContainer";
import ConfirmModal from "./components/ConfirmModal";
import { SkeletonTable } from "./components/Skeleton";
import { EmptyState } from "./components/EmptyState";
import { 
  Receipt, 
  DollarSign, 
  Home, 
  ArrowLeft, 
  Save,
  Edit3,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  TrendingDown,
  FileText
} from "lucide-react";

export default function RegistrarGasto() {
  const [form, setForm] = useState({
    habitacion_id: "",  // Opcional: solo para gastos específicos de habitación
    descripcion: "",
    monto: ""
  });
  const [mensaje, setMensaje] = useState("");
  const [gastosHoy, setGastosHoy] = useState([]);
  const [editandoId, setEditandoId] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [mostrarConfirmEliminar, setMostrarConfirmEliminar] = useState(false);
  const [gastoAEliminar, setGastoAEliminar] = useState(null);
  const { success, error: errorToast } = useToast();
  const [userRole, setUserRole] = useState("");
  const navigate = useNavigate();

  const token = localStorage.getItem(TOKEN_KEY);

  // Obtener rol del usuario desde el token
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

  const obtenerGastosHoy = async () => {
    setCargando(true);
    const hoy = new Date().toISOString().split("T")[0];
    try {
      const res = await axios.get(`${API_BASE_URL}/gastos-dia?fecha=${hoy}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setGastosHoy(res.data);
    } catch (err) {
      console.error("Error al obtener gastos del día", err);
      errorToast("Error al cargar gastos del día");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    obtenerGastosHoy();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({
      ...form,
      [name]: value
    });
  };

  const handleSubmit = async () => {
    if (!form.descripcion || !form.monto) {
      errorToast("La descripción y el monto son obligatorios");
      return;
    }

    // Validar monto
    const montoNum = parseFloat(form.monto);
    if (isNaN(montoNum) || montoNum <= 0) {
      errorToast("El monto debe ser un número positivo");
      return;
    }

    setCargando(true);
    const payload = {
      descripcion: form.descripcion.trim(),
      monto: montoNum,
      habitacion_id: form.habitacion_id && form.habitacion_id.trim() !== "" 
        ? parseInt(form.habitacion_id) 
        : null
    };
    
    try {
      if (editandoId) {
        await axios.put(`${API_BASE_URL}/gastos/${editandoId}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        success("Gasto actualizado correctamente");
      } else {
        await axios.post(`${API_BASE_URL}/gastos`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        success("Gasto registrado correctamente");
      }

      setForm({ habitacion_id: "", descripcion: "", monto: "" });
      setEditandoId(null);
      obtenerGastosHoy();
    } catch (err) {
      errorToast(err.response?.data?.detail || "Error al registrar/actualizar gasto");
    } finally {
      setCargando(false);
    }
  };

  const cargarParaEditar = (gasto) => {
    setForm({
      habitacion_id: gasto.habitacion_id || "",
      descripcion: gasto.descripcion,
      monto: gasto.monto
    });
    setEditandoId(gasto.id);
    window.scrollTo(0, 0);
  };

  const cancelarEdicion = () => {
    setForm({ habitacion_id: "", descripcion: "", monto: "" });
    setEditandoId(null);
    setMensaje("");
  };

  const abrirConfirmEliminar = (id) => {
    setGastoAEliminar(id);
    setMostrarConfirmEliminar(true);
  };

  const borrarGasto = async () => {
    setCargando(true);
    try {
      await axios.delete(`${API_BASE_URL}/gastos/${gastoAEliminar}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      success("Gasto eliminado correctamente");
      setMostrarConfirmEliminar(false);
      obtenerGastosHoy();
    } catch {
      errorToast("Error al eliminar gasto");
    } finally {
      setCargando(false);
    }
  };

  // Calcular estadísticas solo para dueños
  const totalGastos = gastosHoy.reduce((sum, gasto) => sum + gasto.monto, 0);
  const gastoPromedio = gastosHoy.length > 0 ? totalGastos / gastosHoy.length : 0;

  // Determinar si es dueño
  const esDueño = userRole === "dueño";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-red-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-slate-200">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-red-600 p-3 rounded-xl">
                <Receipt className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-800">
                  {editandoId ? "Editar Gasto" : "Registrar Gasto"}
                </h1>
                <p className="text-slate-600">
                  {esDueño ? "Gestiona compras y gastos operativos" : "Registra compras y gastos operativos del hotel"}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-sm text-slate-600 bg-slate-50 px-3 py-2 rounded-lg">
                <Clock className="w-4 h-4 inline mr-1" />
                {new Date().toLocaleDateString('es-ES')}
              </div>
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

        {/* Formulario */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-slate-200">
          {editandoId && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-2 text-blue-700">
                <Edit3 className="w-5 h-5" />
                <span className="font-medium">Editando gasto #{editandoId}</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Habitación (Opcional) */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Habitación <span className="text-slate-400 text-xs">(Opcional)</span>
              </label>
              <div className="relative">
                <Home className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="number"
                  name="habitacion_id"
                  placeholder="Solo si es gasto específico de habitación"
                  value={form.habitacion_id}
                  onChange={handleChange}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-12 pr-4 py-3 text-slate-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent placeholder-slate-400"
                />
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Dejar vacío para gastos generales (compras, insumos, etc.)
              </p>
            </div>

            {/* Monto */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Monto *
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="number"
                  name="monto"
                  placeholder="0.00"
                  value={form.monto}
                  onChange={handleChange}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-12 pr-4 py-3 text-slate-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent placeholder-slate-400"
                />
              </div>
            </div>

            {/* Descripción */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Descripción del gasto / compra *
              </label>
              <div className="relative">
                <FileText className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                <textarea
                  name="descripcion"
                  placeholder="Ej: Compra de bebidas, pedido de insumos para restaurante, compra de amenities, reparación de equipos, limpieza profunda..."
                  value={form.descripcion}
                  onChange={handleChange}
                  rows="3"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-12 pr-4 py-3 text-slate-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent placeholder-slate-400 resize-none"
                />
              </div>
            </div>
          </div>

          {/* Botones */}
          <div className="flex flex-col sm:flex-row gap-3 mt-6">
            <button
              onClick={handleSubmit}
              disabled={cargando || !form.descripcion || !form.monto}
              className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
            >
              {cargando ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <Save className="w-5 h-5" />
              )}
              {editandoId ? "Actualizar Gasto" : "Registrar Gasto"}
            </button>
            
            {editandoId && (
              <button
                onClick={cancelarEdicion}
                className="flex items-center justify-center gap-2 bg-slate-200 hover:bg-slate-300 text-slate-700 px-6 py-3 rounded-xl font-medium transition-all duration-200"
              >
                <XCircle className="w-5 h-5" />
                Cancelar Edición
              </button>
            )}
          </div>

          {/* Mensaje */}
          {mensaje && (
            <div className={`mt-4 p-4 rounded-xl flex items-center gap-2 ${
              mensaje.includes('✅') || mensaje.includes('🗑️')
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {mensaje.includes('✅') || mensaje.includes('🗑️') ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                <AlertCircle className="w-5 h-5" />
              )}
              {mensaje}
            </div>
          )}
        </div>

        {/* Resumen del día - SOLO PARA DUEÑOS */}
        {esDueño && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-slate-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gradient-to-r from-red-50 to-red-100 p-4 rounded-xl">
                <div className="flex items-center gap-3">
                  <Receipt className="w-8 h-8 text-red-600" />
                  <div>
                    <p className="text-sm text-red-600 font-medium">Total Gastos</p>
                    <p className="text-2xl font-bold text-red-700">{gastosHoy.length}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-orange-50 to-orange-100 p-4 rounded-xl">
                <div className="flex items-center gap-3">
                  <TrendingDown className="w-8 h-8 text-orange-600" />
                  <div>
                    <p className="text-sm text-orange-600 font-medium">Total Egresos</p>
                    <p className="text-2xl font-bold text-orange-700">${totalGastos.toLocaleString()}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-amber-50 to-amber-100 p-4 rounded-xl">
                <div className="flex items-center gap-3">
                  <DollarSign className="w-8 h-8 text-amber-600" />
                  <div>
                    <p className="text-sm text-amber-600 font-medium">Gasto Promedio</p>
                    <p className="text-2xl font-bold text-amber-700">${gastoPromedio.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Lista de gastos */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-200">
            <h3 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
              <Receipt className="w-6 h-6 text-red-600" />
              {esDueño ? "Gastos del Día" : "Gastos Registrados Hoy"} ({gastosHoy.length})
            </h3>
            {!esDueño && (
              <p className="text-sm text-slate-600 mt-1">
                Gastos registrados el {new Date().toLocaleDateString('es-ES')}
              </p>
            )}
          </div>

          {cargando ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-4"></div>
              <p className="text-slate-600">Cargando gastos...</p>
            </div>
          ) : gastosHoy.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="No hay gastos registrados"
              description="Aún no se han registrado gastos para el día de hoy"
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-medium text-slate-700">Habitación</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-slate-700">Descripción / Compra</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-slate-700">Monto</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-slate-700">
                      {esDueño ? "Fecha" : "Hora"}
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-slate-700">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {gastosHoy.map((gasto) => (
                    <tr key={gasto.id} className="hover:bg-slate-50 transition-colors duration-200">
                      <td className="px-6 py-4">
                        {gasto.habitacion_id ? (
                          <div className="flex items-center gap-2">
                            <Home className="w-4 h-4 text-slate-500" />
                            <span className="text-sm font-medium text-slate-900">
                              Habitación {gasto.habitacion_id}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-slate-400 italic">Gasto general</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-slate-900 max-w-xs">
                          {gasto.descripcion}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-semibold text-red-600">
                          -${gasto.monto.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {esDueño ? (
                          <div>
                            <span className="text-sm text-slate-700">
                              {new Date(gasto.fecha).toLocaleDateString('es-ES')}
                            </span>
                            <div className="text-xs text-slate-500 mt-1">
                              {new Date(gasto.fecha).toLocaleTimeString('es-ES', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-slate-600">
                            {new Date(gasto.fecha).toLocaleTimeString('es-ES', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => cargarParaEditar(gasto)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-200"
                            title="Editar gasto"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => abrirConfirmEliminar(gasto.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
                            title="Eliminar gasto"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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

      {/* Modal de confirmación para eliminar */}
      <ConfirmModal
        isOpen={mostrarConfirmEliminar}
        onClose={() => setMostrarConfirmEliminar(false)}
        onConfirm={borrarGasto}
        title="Eliminar Gasto"
        message="¿Estás seguro de que deseas eliminar este gasto? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        cancelText="Cancelar"
        type="danger"
      />
    </div>
  );
}