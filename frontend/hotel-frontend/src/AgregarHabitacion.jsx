import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL, TOKEN_KEY } from "./config";
import { 
  Home, 
  Plus, 
  ArrowLeft, 
  Save,
  CheckCircle,
  AlertCircle,
  Bed,
  Star,
  Edit3,
  Trash2,
  Building,
  Hash
} from "lucide-react";

export default function AgregarHabitacion() {
  const [numero, setNumero] = useState("");
  const [tipo, setTipo] = useState("estándar");
  const [precio, setPrecio] = useState("");
  const [capacidad, setCapacidad] = useState("2");
  const [descripcion, setDescripcion] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [habitaciones, setHabitaciones] = useState([]);
  const [editandoId, setEditandoId] = useState(null);
  const [cargando, setCargando] = useState(false);
  const navigate = useNavigate();

  const token = localStorage.getItem(TOKEN_KEY);

  // Obtener habitaciones existentes
  const obtenerHabitaciones = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/habitaciones`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setHabitaciones(res.data);
    } catch (err) {
      console.error("Error al obtener habitaciones:", err);
    }
  };

  useEffect(() => {
    obtenerHabitaciones();
  }, []);

  const handleSubmit = async () => {
    if (!numero || !tipo) {
      setMensaje("❌ El número y tipo de habitación son obligatorios");
      return;
    }

    // Verificar si ya existe una habitación con ese número
    const habitacionExistente = habitaciones.find(h => h.numero === parseInt(numero) && h.id !== editandoId);
    if (habitacionExistente) {
      setMensaje("❌ Ya existe una habitación con ese número");
      return;
    }

    setCargando(true);
    try {
      const payload = {
        numero: parseInt(numero),
        tipo,
        precio: precio ? parseFloat(precio) : null,
        capacidad: parseInt(capacidad),
        descripcion: descripcion || null
      };

      if (editandoId) {
        await axios.put(`${API_BASE_URL}/habitaciones/${editandoId}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMensaje("✅ Habitación actualizada correctamente");
      } else {
        await axios.post(`${API_BASE_URL}/habitaciones`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMensaje("✅ Habitación registrada correctamente");
      }

      // Limpiar formulario
      setNumero("");
      setTipo("estándar");
      setPrecio("");
      setCapacidad("2");
      setDescripcion("");
      setEditandoId(null);
      
      obtenerHabitaciones();
      setTimeout(() => setMensaje(""), 3000);
    } catch {
      setMensaje("❌ Error al registrar/actualizar habitación");
    } finally {
      setCargando(false);
    }
  };

  const cargarParaEditar = (habitacion) => {
    setNumero(habitacion.numero.toString());
    setTipo(habitacion.tipo);
    setPrecio(habitacion.precio?.toString() || "");
    setCapacidad(habitacion.capacidad?.toString() || "2");
    setDescripcion(habitacion.descripcion || "");
    setEditandoId(habitacion.id);
    window.scrollTo(0, 0);
  };

  const cancelarEdicion = () => {
    setNumero("");
    setTipo("estándar");
    setPrecio("");
    setCapacidad("2");
    setDescripcion("");
    setEditandoId(null);
    setMensaje("");
  };

  const eliminarHabitacion = async (id) => {
    if (!window.confirm("¿Estás seguro de que querés eliminar esta habitación?")) return;
    
    try {
      await axios.delete(`${API_BASE_URL}/habitaciones/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMensaje("🗑️ Habitación eliminada correctamente");
      obtenerHabitaciones();
      setTimeout(() => setMensaje(""), 3000);
    } catch {
      setMensaje("❌ Error al eliminar habitación");
    }
  };

  const getTipoColor = (tipo) => {
    switch (tipo.toLowerCase()) {
      case "estándar":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "confort":
        return "bg-purple-100 text-purple-700 border-purple-200";
      case "suite":
        return "bg-amber-100 text-amber-700 border-amber-200";
      case "premium":
        return "bg-emerald-100 text-emerald-700 border-emerald-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const getTipoIcon = (tipo) => {
    switch (tipo.toLowerCase()) {
      case "estándar":
        return <Bed className="w-4 h-4" />;
      case "confort":
        return <Home className="w-4 h-4" />;
      case "suite":
        return <Star className="w-4 h-4" />;
      case "premium":
        return <Building className="w-4 h-4" />;
      default:
        return <Home className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-slate-200">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-orange-600 p-3 rounded-xl">
                <Home className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-800">
                  {editandoId ? "Editar Habitación" : "Agregar Habitación"}
                </h1>
                <p className="text-slate-600">Gestiona las habitaciones del hotel</p>
              </div>
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

        {/* Formulario */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-slate-200">
          {editandoId && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-2 text-blue-700">
                <Edit3 className="w-5 h-5" />
                <span className="font-medium">Editando habitación #{editandoId}</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Número de habitación */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Número de habitación *
              </label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="number"
                  placeholder="101, 102, 201..."
                  value={numero}
                  onChange={(e) => setNumero(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-12 pr-4 py-3 text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent placeholder-slate-400"
                />
              </div>
            </div>

            {/* Tipo de habitación */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Tipo de habitación *
              </label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="estándar">Estándar</option>
                <option value="confort">Confort</option>
                <option value="suite">Suite</option>
                <option value="premium">Premium</option>
              </select>
            </div>

            {/* Capacidad */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Capacidad (personas)
              </label>
              <select
                value={capacidad}
                onChange={(e) => setCapacidad(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="1">1 persona</option>
                <option value="2">2 personas</option>
                <option value="3">3 personas</option>
                <option value="4">4 personas</option>
                <option value="5">5 personas</option>
                <option value="6">6+ personas</option>
              </select>
            </div>

            {/* Precio por noche */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Precio por noche (opcional)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500">$</span>
                <input
                  type="number"
                  placeholder="0.00"
                  value={precio}
                  onChange={(e) => setPrecio(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-8 pr-4 py-3 text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent placeholder-slate-400"
                />
              </div>
            </div>

            {/* Descripción */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Descripción (opcional)
              </label>
              <textarea
                placeholder="Ej: Habitación con vista al mar, aire acondicionado, TV LED, minibar..."
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                rows="3"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent placeholder-slate-400 resize-none"
              />
            </div>
          </div>

          {/* Botones */}
          <div className="flex flex-col sm:flex-row gap-3 mt-6">
            <button
              onClick={handleSubmit}
              disabled={cargando || !numero || !tipo}
              className="flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-xl font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
            >
              {cargando ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <Save className="w-5 h-5" />
              )}
              {editandoId ? "Actualizar Habitación" : "Agregar Habitación"}
            </button>
            
            {editandoId && (
              <button
                onClick={cancelarEdicion}
                className="flex items-center justify-center gap-2 bg-slate-200 hover:bg-slate-300 text-slate-700 px-6 py-3 rounded-xl font-medium transition-all duration-200"
              >
                <ArrowLeft className="w-5 h-5" />
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

        {/* Lista de habitaciones */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-200">
            <h3 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
              <Building className="w-6 h-6 text-orange-600" />
              Habitaciones Registradas ({habitaciones.length})
            </h3>
          </div>

          {habitaciones.length === 0 ? (
            <div className="p-8 text-center">
              <Home className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">No hay habitaciones registradas</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
              {habitaciones.map((habitacion) => (
                <div
                  key={habitacion.id}
                  className="bg-slate-50 rounded-xl p-4 border border-slate-200 hover:shadow-md transition-all duration-200"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="bg-orange-600 p-2 rounded-lg">
                        <Home className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-800">
                          Habitación {habitacion.numero}
                        </h4>
                        <p className="text-sm text-slate-600">
                          Capacidad: {habitacion.capacidad || 2} personas
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => cargarParaEditar(habitacion)}
                        className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors duration-200"
                        title="Editar habitación"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => eliminarHabitacion(habitacion.id)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors duration-200"
                        title="Eliminar habitación"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border ${getTipoColor(habitacion.tipo)}`}>
                      {getTipoIcon(habitacion.tipo)}
                      {habitacion.tipo.charAt(0).toUpperCase() + habitacion.tipo.slice(1)}
                    </div>
                    
                    {habitacion.precio && (
                      <div className="text-sm text-green-600 font-semibold">
                        ${habitacion.precio.toLocaleString()} / noche
                      </div>
                    )}
                    
                    {habitacion.descripcion && (
                      <p className="text-xs text-slate-600 line-clamp-2">
                        {habitacion.descripcion}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}