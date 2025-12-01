import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL, TOKEN_KEY } from "./config";
import { 
  User, 
  UserPlus, 
  ArrowLeft, 
  Save,
  CheckCircle,
  AlertCircle,
  Phone,
  CreditCard,
  Car,
  Edit3,
  Trash2,
  Search,
  Users,
  Hash,
  XCircle
} from "lucide-react";

function RegistrarCliente() {
  const [cliente, setCliente] = useState({
    nombre: "",
    dni: "",
    celular: "",
    patente: ""
  });
  const [mensaje, setMensaje] = useState("");
  const [clientes, setClientes] = useState([]);
  const [clientesFiltrados, setClientesFiltrados] = useState([]);
  const [editandoId, setEditandoId] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const navigate = useNavigate();

  const token = localStorage.getItem(TOKEN_KEY);

  // Obtener clientes existentes
  const obtenerClientes = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/clientes`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setClientes(res.data);
      setClientesFiltrados(res.data);
    } catch (err) {
      console.error("Error al obtener clientes:", err);
    }
  };

  useEffect(() => {
    obtenerClientes();
  }, []);

  // Filtrar clientes por búsqueda
  useEffect(() => {
    if (busqueda) {
      const filtrados = clientes.filter(c => 
        c.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
        c.dni?.includes(busqueda) ||
        c.celular?.includes(busqueda) ||
        c.patente?.toLowerCase().includes(busqueda.toLowerCase())
      );
      setClientesFiltrados(filtrados);
    } else {
      setClientesFiltrados(clientes);
    }
  }, [busqueda, clientes]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCliente({ ...cliente, [name]: value });
  };

  const validarDatos = () => {
    if (!cliente.nombre.trim()) {
      setMensaje("❌ El nombre es obligatorio");
      return false;
    }
    if (!cliente.dni.trim()) {
      setMensaje("❌ El DNI es obligatorio");
      return false;
    }
    if (cliente.dni.length < 7 || cliente.dni.length > 8) {
      setMensaje("❌ El DNI debe tener 7 u 8 dígitos");
      return false;
    }
    if (!cliente.celular.trim()) {
      setMensaje("❌ El celular es obligatorio");
      return false;
    }
    
    // Verificar DNI duplicado
    const dniExistente = clientes.find(c => c.dni === cliente.dni && c.id !== editandoId);
    if (dniExistente) {
      setMensaje("❌ Ya existe un cliente con ese DNI");
      return false;
    }
    
    return true;
  };

  const handleSubmit = async () => {
    if (!validarDatos()) return;

    setCargando(true);
    try {
      if (editandoId) {
        await axios.put(`${API_BASE_URL}/clientes/${editandoId}`, cliente, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMensaje("✅ Cliente actualizado correctamente");
      } else {
        await axios.post(`${API_BASE_URL}/clientes`, cliente, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMensaje("✅ Cliente registrado correctamente");
      }
      
      setCliente({ nombre: "", dni: "", celular: "", patente: "" });
      setEditandoId(null);
      obtenerClientes();
      setTimeout(() => setMensaje(""), 3000);
    } catch (error) {
      if (error.response?.status === 400) {
        setMensaje("❌ DNI ya registrado");
      } else {
        setMensaje("❌ Error al registrar/actualizar cliente");
      }
    } finally {
      setCargando(false);
    }
  };

  const cargarParaEditar = (clienteData) => {
    setCliente({
      nombre: clienteData.nombre,
      dni: clienteData.dni,
      celular: clienteData.celular,
      patente: clienteData.patente || ""
    });
    setEditandoId(clienteData.id);
    window.scrollTo(0, 0);
  };

  const cancelarEdicion = () => {
    setCliente({ nombre: "", dni: "", celular: "", patente: "" });
    setEditandoId(null);
    setMensaje("");
  };

  const eliminarCliente = async (id) => {
    if (!window.confirm("¿Estás seguro de que querés eliminar este cliente?")) return;
    
    try {
      await axios.delete(`${API_BASE_URL}/clientes/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMensaje("🗑️ Cliente eliminado correctamente");
      obtenerClientes();
      setTimeout(() => setMensaje(""), 3000);
    } catch {
      setMensaje("❌ Error al eliminar cliente");
    }
  };

  const formatearTelefono = (telefono) => {
    if (!telefono) return "";
    // Formato: +54 9 11 1234-5678
    const cleaned = telefono.replace(/\D/g, '');
    if (cleaned.length >= 10) {
      return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return telefono;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-green-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-slate-200">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-green-600 p-3 rounded-xl">
                <UserPlus className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-800">
                  {editandoId ? "Editar Cliente" : "Registrar Cliente"}
                </h1>
                <p className="text-slate-600">Gestiona la base de datos de clientes</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-sm text-slate-600 bg-slate-50 px-3 py-2 rounded-lg">
                <Users className="w-4 h-4 inline mr-1" />
                {clientes.length} cliente{clientes.length !== 1 ? 's' : ''} registrado{clientes.length !== 1 ? 's' : ''}
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
                <span className="font-medium">Editando cliente #{editandoId}</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Nombre completo */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Nombre completo *
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  name="nombre"
                  placeholder="Juan Pérez"
                  value={cliente.nombre}
                  onChange={handleChange}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-12 pr-4 py-3 text-slate-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent placeholder-slate-400"
                />
              </div>
            </div>

            {/* DNI */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                DNI *
              </label>
              <div className="relative">
                <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  name="dni"
                  placeholder="12345678"
                  value={cliente.dni}
                  onChange={handleChange}
                  maxLength="8"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-12 pr-4 py-3 text-slate-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent placeholder-slate-400"
                />
              </div>
            </div>

            {/* Celular */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Celular *
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="tel"
                  name="celular"
                  placeholder="11 1234-5678"
                  value={cliente.celular}
                  onChange={handleChange}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-12 pr-4 py-3 text-slate-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent placeholder-slate-400"
                />
              </div>
            </div>

            {/* Patente */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Patente del vehículo (opcional)
              </label>
              <div className="relative">
                <Car className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  name="patente"
                  placeholder="ABC123"
                  value={cliente.patente}
                  onChange={handleChange}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-12 pr-4 py-3 text-slate-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent placeholder-slate-400"
                />
              </div>
            </div>
          </div>

          {/* Botones */}
          <div className="flex flex-col sm:flex-row gap-3 mt-6">
            <button
              onClick={handleSubmit}
              disabled={cargando || !cliente.nombre || !cliente.dni || !cliente.celular}
              className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
            >
              {cargando ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <Save className="w-5 h-5" />
              )}
              {editandoId ? "Actualizar Cliente" : "Registrar Cliente"}
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

        {/* Lista de clientes */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-200">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <h3 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
                <Users className="w-6 h-6 text-green-600" />
                Clientes Registrados ({clientesFiltrados.length})
              </h3>
              
              {/* Búsqueda */}
              <div className="relative max-w-xs">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar cliente..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-12 pr-4 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent placeholder-slate-400"
                />
              </div>
            </div>
          </div>

          {clientesFiltrados.length === 0 ? (
            <div className="p-8 text-center">
              <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">
                {busqueda ? "No se encontraron clientes con ese criterio de búsqueda" : "No hay clientes registrados"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-medium text-slate-700">Cliente</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-slate-700">DNI</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-slate-700">Celular</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-slate-700">Patente</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-slate-700">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {clientesFiltrados.map((clienteData) => (
                    <tr key={clienteData.id} className="hover:bg-slate-50 transition-colors duration-200">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="bg-green-100 p-2 rounded-full">
                            <User className="w-4 h-4 text-green-600" />
                          </div>
                          <span className="text-sm font-medium text-slate-900">
                            {clienteData.nombre}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Hash className="w-4 h-4 text-slate-500" />
                          <span className="text-sm text-slate-700">{clienteData.dni}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-slate-500" />
                          <span className="text-sm text-slate-700">
                            {formatearTelefono(clienteData.celular)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {clienteData.patente ? (
                          <div className="flex items-center gap-2">
                            <Car className="w-4 h-4 text-slate-500" />
                            <span className="text-sm text-slate-700 font-mono">
                              {clienteData.patente.toUpperCase()}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => cargarParaEditar(clienteData)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-200"
                            title="Editar cliente"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => eliminarCliente(clienteData.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
                            title="Eliminar cliente"
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
    </div>
  );
}

export default RegistrarCliente;