import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL, TOKEN_KEY } from "./config";
import { useToast } from "./components/ToastContainer";
import ConfirmModal from "./components/ConfirmModal";
import { 
  Package, 
  Plus, 
  ArrowLeft, 
  Save,
  Edit3,
  Trash2,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Search,
  Filter,
  RefreshCw,
  Minus,
  Plus as PlusIcon,
  History,
  X,
  ArrowUpDown
} from "lucide-react";

export default function GestionarStock() {
  const [stock, setStock] = useState([]);
  const [stockFiltrado, setStockFiltrado] = useState([]);
  const [form, setForm] = useState({
    nombre_producto: "",
    categoria: "bebidas",
    cantidad: 0,
    cantidad_minima: 0
  });
  const [editandoId, setEditandoId] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [mostrarConfirmEliminar, setMostrarConfirmEliminar] = useState(false);
  const [stockAEliminar, setStockAEliminar] = useState(null);
  const [filtroCategoria, setFiltroCategoria] = useState("todas");
  const [filtroEstado, setFiltroEstado] = useState("todos"); // todos, bajo, agotado
  const [ordenarPor, setOrdenarPor] = useState("nombre"); // nombre, cantidad, fecha
  const [busqueda, setBusqueda] = useState("");
  const [mostrarHistorial, setMostrarHistorial] = useState(false);
  const [historial, setHistorial] = useState([]);
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);
  const [logsMovimientos, setLogsMovimientos] = useState([]);
  const [cargandoLogs, setCargandoLogs] = useState(false);
  const { success, error: errorToast, warning: warningToast } = useToast();
  const navigate = useNavigate();

  const token = localStorage.getItem(TOKEN_KEY);

  // Cargar stock
  const cargarStock = async () => {
    setCargando(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/stock`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStock(res.data);
      setStockFiltrado(res.data);
    } catch (err) {
      console.error("Error al cargar stock:", err);
      errorToast("Error al cargar stock");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarStock();
    cargarLogsMovimientos();
  }, []);

  // Cargar todos los movimientos de stock (logs)
  const cargarLogsMovimientos = async () => {
    setCargandoLogs(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/stock/historial/todos?limite=100`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLogsMovimientos(res.data || []);
    } catch (err) {
      console.error("Error al cargar logs de movimientos:", err);
      // No mostrar error, simplemente no habrá logs
    } finally {
      setCargandoLogs(false);
    }
  };

  // Filtrar y ordenar stock
  useEffect(() => {
    let filtrado = stock;

    // Filtro por búsqueda
    if (busqueda) {
      filtrado = filtrado.filter(item =>
        item.nombre_producto.toLowerCase().includes(busqueda.toLowerCase())
      );
    }

    // Filtro por categoría
    if (filtroCategoria !== "todas") {
      filtrado = filtrado.filter(item => item.categoria === filtroCategoria);
    }

    // Filtro por estado
    if (filtroEstado === "agotado") {
      filtrado = filtrado.filter(item => item.cantidad <= 0);
    } else if (filtroEstado === "bajo") {
      filtrado = filtrado.filter(item => 
        item.cantidad > 0 && item.cantidad <= item.cantidad_minima && item.cantidad_minima > 0
      );
    }

    // Ordenar
    filtrado = [...filtrado].sort((a, b) => {
      switch (ordenarPor) {
        case "cantidad":
          return a.cantidad - b.cantidad;
        case "fecha":
          return new Date(b.fecha_actualizacion) - new Date(a.fecha_actualizacion);
        case "nombre":
        default:
          return a.nombre_producto.localeCompare(b.nombre_producto);
      }
    });

    setStockFiltrado(filtrado);
  }, [stock, busqueda, filtroCategoria, filtroEstado, ordenarPor]);

  // Cargar historial de un producto
  const cargarHistorial = async (stockId, nombreProducto) => {
    setCargandoHistorial(true);
    setProductoSeleccionado(nombreProducto);
    try {
      const res = await axios.get(`${API_BASE_URL}/stock/${stockId}/historial`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setHistorial(res.data);
      setMostrarHistorial(true);
    } catch (err) {
      console.error("Error al cargar historial:", err);
      errorToast("Error al cargar historial");
    } finally {
      setCargandoHistorial(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({
      ...form,
      [name]: name === "cantidad" || name === "cantidad_minima" ? parseInt(value) || 0 : value
    });
  };

  const handleSubmit = async () => {
    if (!form.nombre_producto.trim()) {
      errorToast("El nombre del producto es obligatorio");
      return;
    }

    if (form.cantidad < 0) {
      errorToast("La cantidad no puede ser negativa");
      return;
    }

    setCargando(true);
    try {
      const payload = {
        nombre_producto: form.nombre_producto.trim(),
        categoria: form.categoria,
        cantidad: form.cantidad,
        cantidad_minima: form.cantidad_minima,
        motivo: editandoId ? `Edición de producto desde Control de Stock` : undefined
      };

      if (editandoId) {
        await axios.put(`${API_BASE_URL}/stock/${editandoId}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        success("Producto actualizado correctamente");
      } else {
        await axios.post(`${API_BASE_URL}/stock`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        success("Stock actualizado correctamente");
      }
      setForm({
        nombre_producto: "",
        categoria: "bebidas",
        cantidad: 0,
        cantidad_minima: 0
      });
      setMostrarFormulario(false);
      setEditandoId(null);
      cargarStock();
      cargarLogsMovimientos(); // Actualizar logs después de crear/actualizar stock
    } catch (err) {
      errorToast(err.response?.data?.detail || "Error al guardar stock");
    } finally {
      setCargando(false);
    }
  };

  const cargarParaEditar = (item) => {
    setForm({
      nombre_producto: item.nombre_producto,
      categoria: item.categoria,
      cantidad: item.cantidad,
      cantidad_minima: item.cantidad_minima || 0
    });
    setEditandoId(item.id);
    setMostrarFormulario(true);
    window.scrollTo(0, 0);
  };

  const cancelarEdicion = () => {
    setForm({
      nombre_producto: "",
      categoria: "bebidas",
      cantidad: 0,
      cantidad_minima: 0
    });
    setEditandoId(null);
    setMostrarFormulario(false);
  };

  const actualizarCantidad = async (id, nuevaCantidad, motivo = null) => {
    if (nuevaCantidad < 0) {
      errorToast("La cantidad no puede ser negativa");
      return;
    }

    try {
      await axios.put(`${API_BASE_URL}/stock/${id}`, { 
        cantidad: nuevaCantidad,
        motivo: motivo || "Ajuste manual de cantidad"
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      success("Cantidad actualizada correctamente");
      cargarStock();
      cargarLogsMovimientos(); // Actualizar logs después de modificar stock
    } catch (err) {
      errorToast("Error al actualizar cantidad");
    }
  };

  const ajustarCantidad = async (id, cantidadActual, ajuste) => {
    const nuevaCantidad = cantidadActual + ajuste;
    if (nuevaCantidad < 0) {
      errorToast("La cantidad no puede ser negativa");
      return;
    }
    await actualizarCantidad(id, nuevaCantidad);
  };

  const abrirConfirmEliminar = (id) => {
    setStockAEliminar(id);
    setMostrarConfirmEliminar(true);
  };

  const eliminarStock = async () => {
    try {
      await axios.delete(`${API_BASE_URL}/stock/${stockAEliminar}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      success("Stock eliminado correctamente");
      setMostrarConfirmEliminar(false);
      cargarStock();
      cargarLogsMovimientos(); // Actualizar logs después de eliminar stock
    } catch (err) {
      errorToast("Error al eliminar stock");
    }
  };

  const getStockStatus = (cantidad, cantidadMinima) => {
    if (cantidad <= 0) {
      return { color: "bg-red-100 text-red-700 border-red-200", icon: AlertTriangle, text: "Sin stock" };
    } else if (cantidad <= cantidadMinima) {
      return { color: "bg-yellow-100 text-yellow-700 border-yellow-200", icon: AlertTriangle, text: "Stock bajo" };
    } else {
      return { color: "bg-green-100 text-green-700 border-green-200", icon: Package, text: "En stock" };
    }
  };

  const formatearFecha = (fecha) => {
    if (!fecha) return "N/A";
    const fechaObj = new Date(fecha);
    return fechaObj.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Obtener productos comunes de bebidas para sugerencias
  const productosBebidas = [
    "Coca Cola Vidrio",
    "Coca Cola Lata",
    "Coca Cola Plástico",
    "Agua Mineral 500ml",
    "Cerveza Quilmes",
    "Jugo de Naranja",
    "Café Expresso",
    "Cerveza Brahma",
    "Agua con Gas",
    "Gaseosa Sprite",
    "Vino Tinto",
    "Vino Blanco"
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-slate-200">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-3 rounded-xl">
                <Package className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-800">Control de Stock</h1>
                <p className="text-slate-600">Gestiona el inventario de bebidas y productos</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={cargarStock}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl font-medium transition-colors flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Actualizar
              </button>
              <button
                onClick={() => {
                  setForm({
                    nombre_producto: "",
                    categoria: "bebidas",
                    cantidad: 0,
                    cantidad_minima: 0
                  });
                  setEditandoId(null);
                  setMostrarFormulario(true);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium transition-colors flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Agregar Producto
              </button>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-slate-200">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar producto..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={filtroCategoria}
              onChange={(e) => setFiltroCategoria(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="todas">Todas las categorías</option>
              <option value="bebidas">Bebidas</option>
              <option value="comidas">Comidas</option>
            </select>
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="todos">Todos los estados</option>
              <option value="bajo">Stock bajo</option>
              <option value="agotado">Agotados</option>
            </select>
            <select
              value={ordenarPor}
              onChange={(e) => setOrdenarPor(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="nombre">Ordenar por nombre</option>
              <option value="cantidad">Ordenar por cantidad</option>
              <option value="fecha">Ordenar por fecha</option>
            </select>
            <button
              onClick={() => {
                setBusqueda("");
                setFiltroCategoria("todas");
                setFiltroEstado("todos");
                setOrdenarPor("nombre");
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
              {editandoId ? "Editar Stock" : "Agregar Producto al Stock"}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Nombre del Producto *
                </label>
                <input
                  type="text"
                  name="nombre_producto"
                  value={form.nombre_producto}
                  onChange={handleChange}
                  list="productos-sugeridos"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ej: Coca Cola 350ml"
                />
                <datalist id="productos-sugeridos">
                  {productosBebidas.map((producto, idx) => (
                    <option key={idx} value={producto} />
                  ))}
                </datalist>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Categoría *
                  </label>
                  <select
                    name="categoria"
                    value={form.categoria}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="bebidas">Bebidas</option>
                    <option value="comidas">Comidas</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Cantidad Actual *
                  </label>
                  <input
                    type="number"
                    name="cantidad"
                    value={form.cantidad}
                    onChange={handleChange}
                    min="0"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Cantidad Mínima (Alerta)
                  </label>
                  <input
                    type="number"
                    name="cantidad_minima"
                    value={form.cantidad_minima}
                    onChange={handleChange}
                    min="0"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Alerta cuando baje a este nivel"
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
                  {editandoId ? "Actualizar" : "Guardar"}
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

        {/* Lista de stock */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200">
          {cargando && stock.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-slate-600">Cargando stock...</span>
            </div>
          ) : stockFiltrado.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600">No hay productos en stock</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Producto</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Categoría</th>
                    <th className="text-center py-3 px-4 font-semibold text-slate-700">Cantidad</th>
                    <th className="text-center py-3 px-4 font-semibold text-slate-700">Mínima</th>
                    <th className="text-center py-3 px-4 font-semibold text-slate-700">Estado</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Última Actualización</th>
                    <th className="text-center py-3 px-4 font-semibold text-slate-700">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {stockFiltrado.map((item) => {
                    const status = getStockStatus(item.cantidad, item.cantidad_minima);
                    const StatusIcon = status.icon;
                    return (
                      <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-4 px-4">
                          <div className="font-medium text-slate-800">{item.nombre_producto}</div>
                        </td>
                        <td className="py-4 px-4">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                            {item.categoria}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => ajustarCantidad(item.id, item.cantidad, -1)}
                              className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Restar 1"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <span className="font-bold text-lg text-slate-800 min-w-[3rem] text-center">
                              {item.cantidad}
                            </span>
                            <button
                              onClick={() => ajustarCantidad(item.id, item.cantidad, 1)}
                              className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors"
                              title="Sumar 1"
                            >
                              <PlusIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-center text-slate-600">
                          {item.cantidad_minima || "-"}
                        </td>
                        <td className="py-4 px-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${status.color}`}>
                            <StatusIcon className="w-3 h-3" />
                            {status.text}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-sm text-slate-500">
                          {formatearFecha(item.fecha_actualizacion)}
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => cargarHistorial(item.id, item.nombre_producto)}
                              className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                              title="Ver historial"
                            >
                              <History className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => cargarParaEditar(item)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Editar"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => abrirConfirmEliminar(item.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Eliminar"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
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

        {/* Modal de Historial */}
        {mostrarHistorial && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              <div className="p-6 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-800">Historial de Movimientos</h2>
                  <p className="text-slate-600 mt-1">{productoSeleccionado}</p>
                </div>
                <button
                  onClick={() => {
                    setMostrarHistorial(false);
                    setHistorial([]);
                    setProductoSeleccionado(null);
                  }}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-slate-600" />
                </button>
              </div>
              <div className="overflow-y-auto p-6 flex-1">
                {cargandoHistorial ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="ml-3 text-slate-600">Cargando historial...</span>
                  </div>
                ) : historial.length === 0 ? (
                  <div className="text-center py-12">
                    <History className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-600">No hay movimientos registrados</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {historial.map((mov) => {
                      const esEntrada = mov.diferencia > 0;
                      const esVenta = mov.tipo === "venta";
                      return (
                        <div
                          key={mov.id}
                          className={`p-4 rounded-lg border ${
                            esEntrada
                              ? "bg-green-50 border-green-200"
                              : esVenta
                              ? "bg-red-50 border-red-200"
                              : "bg-slate-50 border-slate-200"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {esEntrada ? (
                                <TrendingUp className="w-5 h-5 text-green-600" />
                              ) : (
                                <TrendingDown className="w-5 h-5 text-red-600" />
                              )}
                              <div>
                                <div className="font-semibold text-slate-800 capitalize">
                                  {mov.tipo === "venta" ? "Venta" : mov.tipo === "entrada" ? "Entrada" : "Ajuste"}
                                </div>
                                <div className="text-sm text-slate-600">
                                  {mov.cantidad_anterior} → {mov.cantidad_nueva}
                                  {mov.diferencia !== 0 && (
                                    <span className={`ml-2 font-medium ${esEntrada ? "text-green-600" : "text-red-600"}`}>
                                      ({esEntrada ? "+" : ""}{mov.diferencia})
                                    </span>
                                  )}
                                </div>
                                {mov.motivo && (
                                  <div className="text-xs text-slate-500 mt-1">{mov.motivo}</div>
                                )}
                              </div>
                            </div>
                            <div className="text-sm text-slate-500">
                              {formatearFecha(mov.fecha)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Sección de Logs de Movimientos */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mt-8 border border-slate-200">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="bg-purple-600 p-2 rounded-lg">
                <History className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800">Logs de Movimientos</h2>
                <p className="text-sm text-slate-600">Historial completo de todos los movimientos de stock</p>
              </div>
            </div>
            <button
              onClick={cargarLogsMovimientos}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Actualizar
            </button>
          </div>

          {cargandoLogs ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              <span className="ml-3 text-slate-600">Cargando logs...</span>
            </div>
          ) : logsMovimientos.length === 0 ? (
            <div className="text-center py-12">
              <History className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600">No hay movimientos registrados</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {logsMovimientos.map((mov) => {
                const esEntrada = mov.diferencia > 0;
                const esVenta = mov.tipo === "venta";
                const esAjuste = mov.tipo === "ajuste";
                
                // Extraer número de pedido del motivo si existe
                const motivoMatch = mov.motivo?.match(/pedido #(\d+)/i);
                const numeroPedido = motivoMatch ? motivoMatch[1] : null;
                
                return (
                  <div
                    key={mov.id}
                    className={`p-4 rounded-lg border ${
                      esVenta
                        ? "bg-red-50 border-red-200"
                        : esEntrada
                        ? "bg-green-50 border-green-200"
                        : "bg-blue-50 border-blue-200"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        {esVenta ? (
                          <TrendingDown className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                        ) : esEntrada ? (
                          <TrendingUp className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                        ) : (
                          <ArrowUpDown className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-slate-800 capitalize">
                              {esVenta ? "Venta" : esAjuste ? "Ajuste Manual" : "Entrada"}
                            </span>
                            {numeroPedido && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium">
                                Pedido #{numeroPedido}
                              </span>
                            )}
                          </div>
                          <div className="text-sm font-medium text-slate-700 mb-1">
                            {mov.nombre_producto}
                            {mov.categoria && (
                              <span className="ml-2 text-xs text-slate-500">({mov.categoria})</span>
                            )}
                          </div>
                          <div className="text-sm text-slate-600 mb-1">
                            <span className="font-medium">Cantidad:</span> {mov.cantidad_anterior} → {mov.cantidad_nueva}
                            {mov.diferencia !== 0 && (
                              <span className={`ml-2 font-semibold ${esEntrada ? "text-green-600" : "text-red-600"}`}>
                                ({esEntrada ? "+" : ""}{mov.diferencia})
                              </span>
                            )}
                          </div>
                          {mov.motivo && (
                            <div className="text-xs text-slate-500 mt-1">
                              {mov.motivo}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-xs text-slate-500 whitespace-nowrap">
                        {formatearFecha(mov.fecha)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Botón volver */}
        <button
          onClick={() => navigate(-1)}
          className="mt-8 inline-flex items-center gap-2 text-slate-600 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver atrás
        </button>
      </div>

      {/* Modal de confirmación */}
      <ConfirmModal
        isOpen={mostrarConfirmEliminar}
        onClose={() => setMostrarConfirmEliminar(false)}
        onConfirm={eliminarStock}
        title="Eliminar Producto del Stock"
        message="¿Estás seguro de que deseas eliminar este producto del stock? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        cancelText="Cancelar"
        type="danger"
      />
    </div>
  );
}

