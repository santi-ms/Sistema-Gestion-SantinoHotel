import { useState, useEffect } from "react";
import { TOKEN_KEY } from "./config";
import { useToast } from "./components/ToastContainer";
import ConfirmModal from "./components/ConfirmModal";
import { 
  Coffee, 
  DollarSign, 
  ArrowLeft, 
  Save,
  Edit3,
  Trash2,
  CheckCircle,
  XCircle,
  Plus,
  AlertCircle,
  Utensils,
  Wine,
  Search,
  Eye,
  EyeOff
} from "lucide-react";

export default function ConfiguracionPrecios() {
  const [userRole, setUserRole] = useState("");

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
  const [productos, setProductos] = useState([
    // Bebidas
    { id: 1, nombre: "Coca Cola 350ml", precio: 3000, categoria: "bebidas", activo: true },
    { id: 2, nombre: "Agua Mineral 500ml", precio: 2000, categoria: "bebidas", activo: true },
    { id: 3, nombre: "Cerveza Quilmes", precio: 4500, categoria: "bebidas", activo: true },
    { id: 4, nombre: "Jugo de Naranja", precio: 3500, categoria: "bebidas", activo: true },
    { id: 5, nombre: "Café Expresso", precio: 2500, categoria: "bebidas", activo: true },
    
    // Comidas
    { id: 6, nombre: "Hamburguesa Completa", precio: 12000, categoria: "comidas", activo: true },
    { id: 7, nombre: "Pizza Margherita", precio: 15000, categoria: "comidas", activo: true },
    { id: 8, nombre: "Papas Fritas", precio: 5000, categoria: "comidas", activo: true },
    { id: 9, nombre: "Sandwich de Jamón y Queso", precio: 8000, categoria: "comidas", activo: true },
    { id: 10, nombre: "Milanesa con Papas", precio: 18000, categoria: "comidas", activo: true },
    { id: 11, nombre: "Empanadas (x6)", precio: 9000, categoria: "comidas", activo: true },
  ]);
  
  const [form, setForm] = useState({
    nombre: "",
    precio: "",
    categoria: "comidas"
  });
  
  const [editandoId, setEditandoId] = useState(null);
  const [mensaje, setMensaje] = useState("");
  const [cargando, setCargando] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState("todas");
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [mostrarInactivos, setMostrarInactivos] = useState(false);
  const [mostrarConfirmEliminar, setMostrarConfirmEliminar] = useState(false);
  const [productoAEliminar, setProductoAEliminar] = useState(null);
  const { success, error: errorToast, warning: warningToast } = useToast();

  const esDueño = userRole === "dueño";

  // Filtrar productos
  const productosFiltrados = productos.filter(producto => {
    const coincideBusqueda = producto.nombre.toLowerCase().includes(busqueda.toLowerCase());
    const coincideCategoria = categoriaFiltro === "todas" || producto.categoria === categoriaFiltro;
    const coincideEstado = mostrarInactivos || producto.activo;
    return coincideBusqueda && coincideCategoria && coincideEstado;
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({
      ...form,
      [name]: value
    });
  };

  const handleSubmit = () => {
    if (!form.nombre.trim() || !form.precio) {
      errorToast("Faltan campos obligatorios");
      return;
    }

    // Validar precio
    const precioNum = parseFloat(form.precio);
    if (isNaN(precioNum) || precioNum <= 0) {
      errorToast("El precio debe ser un número positivo");
      return;
    }

    setCargando(true);
    
    setTimeout(() => {
      if (editandoId) {
        // Actualizar producto existente
        const productosActualizados = productos.map(producto => 
          producto.id === editandoId 
            ? { 
                ...producto, 
                nombre: form.nombre.trim(),
                precio: precioNum,
                categoria: form.categoria
              }
            : producto
        );
        setProductos(productosActualizados);
        success("Producto actualizado correctamente");
      } else {
        // Crear nuevo producto
        const nuevoProducto = {
          id: Math.max(...productos.map(p => p.id)) + 1,
          nombre: form.nombre.trim(),
          precio: precioNum,
          categoria: form.categoria,
          activo: true
        };
        setProductos([...productos, nuevoProducto]);
        success("Producto agregado correctamente");
      }
      
      // Reset form
      setForm({ nombre: "", precio: "", categoria: "comidas" });
      setEditandoId(null);
      setMostrarFormulario(false);
      setCargando(false);
    }, 800);
  };

  const cargarParaEditar = (producto) => {
    setForm({
      nombre: producto.nombre,
      precio: producto.precio.toString(),
      categoria: producto.categoria
    });
    setEditandoId(producto.id);
    setMostrarFormulario(true);
    window.scrollTo(0, 0);
  };

  const cancelarEdicion = () => {
    setForm({ nombre: "", precio: "", categoria: "comidas" });
    setEditandoId(null);
    setMostrarFormulario(false);
    setMensaje("");
  };

  const toggleEstadoProducto = (id) => {
    const productosActualizados = productos.map(producto => 
      producto.id === id 
        ? { ...producto, activo: !producto.activo }
        : producto
    );
    setProductos(productosActualizados);
    const productoActualizado = productosActualizados.find(p => p.id === id);
    if (productoActualizado.activo) {
      success("Producto activado");
    } else {
      warningToast("Producto desactivado");
    }
  };

  const abrirConfirmEliminar = (id) => {
    setProductoAEliminar(id);
    setMostrarConfirmEliminar(true);
  };

  const eliminarProducto = () => {
    setCargando(true);
    setTimeout(() => {
      const productosActualizados = productos.filter(producto => producto.id !== productoAEliminar);
      setProductos(productosActualizados);
      success("Producto eliminado correctamente");
      setMostrarConfirmEliminar(false);
      setCargando(false);
    }, 500);
  };

  // Estadísticas
  const totalProductos = productos.length;
  const productosActivos = productos.filter(p => p.activo).length;
  const comidas = productos.filter(p => p.categoria === "comidas").length;
  const bebidas = productos.filter(p => p.categoria === "bebidas").length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-slate-200">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-purple-600 p-3 rounded-xl">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-800">
                  {esDueño ? "Configuración de Precios" : "Lista de Precios"}
                </h1>
                <p className="text-slate-600">
                  {esDueño ? "Gestiona los precios de comidas y bebidas" : "Consulta los precios actuales"}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Botón cambiar rol - REMOVER EN PRODUCCIÓN */}
              {/* <button
                onClick={() => setUserRole(userRole === "dueño" ? "empleado" : "dueño")}
                className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-2 rounded-lg transition-colors duration-200"
              >
                Ver como: {userRole === "dueño" ? "Empleado" : "Dueño"}
              </button> */}
              
              {esDueño && (
                <button
                  onClick={() => setMostrarFormulario(!mostrarFormulario)}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-2"
                >
                  {mostrarFormulario ? <XCircle className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  {mostrarFormulario ? "Cancelar" : "Nuevo Producto"}
                </button>
              )}
              
              <button
                onClick={() => window.history.back()}
                className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-all duration-200"
              >
                <ArrowLeft className="w-4 h-4" />
                Volver
              </button>
            </div>
          </div>
        </div>

        {/* Formulario - Solo para dueños */}
        {esDueño && mostrarFormulario && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-slate-200">
            {editandoId && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
                <div className="flex items-center gap-2 text-blue-700">
                  <Edit3 className="w-5 h-5" />
                  <span className="font-medium">Editando producto #{editandoId}</span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Nombre del producto */}
              <div className="md:col-span-1">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Nombre del producto *
                </label>
                <input
                  type="text"
                  name="nombre"
                  placeholder="Ej: Hamburguesa completa"
                  value={form.nombre}
                  onChange={handleChange}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent placeholder-slate-400"
                />
              </div>

              {/* Precio */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Precio *
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="number"
                    name="precio"
                    placeholder="0.00"
                    value={form.precio}
                    onChange={handleChange}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-12 pr-4 py-3 text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent placeholder-slate-400"
                  />
                </div>
              </div>

              {/* Categoría */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Categoría *
                </label>
                <select
                  name="categoria"
                  value={form.categoria}
                  onChange={handleChange}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="comidas">🍽️ Comidas</option>
                  <option value="bebidas">🥤 Bebidas</option>
                </select>
              </div>
            </div>

            {/* Botones */}
            <div className="flex flex-col sm:flex-row gap-3 mt-6">
              <button
                onClick={handleSubmit}
                disabled={cargando || !form.nombre.trim() || !form.precio}
                className="flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-xl font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
              >
                {cargando ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <Save className="w-5 h-5" />
                )}
                {editandoId ? "Actualizar Producto" : "Agregar Producto"}
              </button>
              
              <button
                onClick={cancelarEdicion}
                className="flex items-center justify-center gap-2 bg-slate-200 hover:bg-slate-300 text-slate-700 px-6 py-3 rounded-xl font-medium transition-all duration-200"
              >
                <XCircle className="w-5 h-5" />
                Cancelar
              </button>
            </div>

            {/* Mensaje */}
            {mensaje && (
              <div className={`mt-4 p-4 rounded-xl flex items-center gap-2 ${
                mensaje.includes('✅') || mensaje.includes('🗑️')
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : mensaje.includes('⚠️')
                  ? 'bg-yellow-50 text-yellow-700 border border-yellow-200'
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
        )}

        {/* Estadísticas - Solo para dueños */}
        {esDueño && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-slate-200">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-4 rounded-xl">
                <div className="flex items-center gap-3">
                  <DollarSign className="w-6 h-6 text-purple-600" />
                  <div>
                    <p className="text-sm text-purple-600 font-medium">Total Productos</p>
                    <p className="text-xl font-bold text-purple-700">{totalProductos}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-xl">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                  <div>
                    <p className="text-sm text-green-600 font-medium">Activos</p>
                    <p className="text-xl font-bold text-green-700">{productosActivos}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-orange-50 to-orange-100 p-4 rounded-xl">
                <div className="flex items-center gap-3">
                  <Utensils className="w-6 h-6 text-orange-600" />
                  <div>
                    <p className="text-sm text-orange-600 font-medium">Comidas</p>
                    <p className="text-xl font-bold text-orange-700">{comidas}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-xl">
                <div className="flex items-center gap-3">
                  <Wine className="w-6 h-6 text-blue-600" />
                  <div>
                    <p className="text-sm text-blue-600 font-medium">Bebidas</p>
                    <p className="text-xl font-bold text-blue-700">{bebidas}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filtros y búsqueda */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-slate-200">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Búsqueda */}
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar productos..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-12 pr-4 py-3 text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent placeholder-slate-400"
                />
              </div>
            </div>

            {/* Filtro por categoría */}
            <div>
              <select
                value={categoriaFiltro}
                onChange={(e) => setCategoriaFiltro(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="todas">Todas las categorías</option>
                <option value="comidas">🍽️ Comidas</option>
                <option value="bebidas">🥤 Bebidas</option>
              </select>
            </div>

            {/* Mostrar inactivos - Solo para dueños */}
            {esDueño && (
              <div className="flex items-center justify-center">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={mostrarInactivos}
                    onChange={(e) => setMostrarInactivos(e.target.checked)}
                    className="w-4 h-4 text-purple-600 bg-slate-50 border-slate-300 rounded focus:ring-purple-500 focus:ring-2"
                  />
                  <span className="text-sm text-slate-700">Mostrar inactivos</span>
                </label>
              </div>
            )}
          </div>
        </div>

        {/* Lista de productos */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-200">
            <h3 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
              <Coffee className="w-6 h-6 text-purple-600" />
              Lista de Precios ({productosFiltrados.length})
            </h3>
          </div>

          {productosFiltrados.length === 0 ? (
            <div className="p-8 text-center">
              <Coffee className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">No se encontraron productos</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-medium text-slate-700">Producto</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-slate-700">Categoría</th>
                    <th className="px-6 py-4 text-right text-sm font-medium text-slate-700">Precio</th>
                    <th className="px-6 py-4 text-center text-sm font-medium text-slate-700">Estado</th>
                    {esDueño && (
                      <th className="px-6 py-4 text-center text-sm font-medium text-slate-700">Acciones</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {productosFiltrados.map((producto) => (
                    <tr key={producto.id} className={`hover:bg-slate-50 transition-colors duration-200 ${!producto.activo ? 'opacity-60' : ''}`}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {producto.categoria === 'comidas' ? (
                            <Utensils className="w-5 h-5 text-orange-500" />
                          ) : (
                            <Wine className="w-5 h-5 text-blue-500" />
                          )}
                          <span className={`font-medium ${producto.activo ? 'text-slate-900' : 'text-slate-500'}`}>
                            {producto.nombre}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          producto.categoria === 'comidas' 
                            ? 'bg-orange-100 text-orange-700' 
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {producto.categoria === 'comidas' ? '🍽️ Comidas' : '🥤 Bebidas'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={`text-lg font-bold ${producto.activo ? 'text-green-600' : 'text-slate-400'}`}>
                          ${producto.precio.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                          producto.activo 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {producto.activo ? (
                            <>
                              <CheckCircle className="w-3 h-3" />
                              Activo
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3" />
                              Inactivo
                            </>
                          )}
                        </span>
                      </td>
                      {esDueño && (
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => cargarParaEditar(producto)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-200"
                              title="Editar producto"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => toggleEstadoProducto(producto.id)}
                              className={`p-2 rounded-lg transition-colors duration-200 ${
                                producto.activo 
                                  ? 'text-yellow-600 hover:bg-yellow-50' 
                                  : 'text-green-600 hover:bg-green-50'
                              }`}
                              title={producto.activo ? "Desactivar producto" : "Activar producto"}
                            >
                              {producto.activo ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                            <button
                              onClick={() => abrirConfirmEliminar(producto.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
                              title="Eliminar producto"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      )}
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
        onConfirm={eliminarProducto}
        title="Eliminar Producto"
        message="¿Estás seguro de que deseas eliminar este producto? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        cancelText="Cancelar"
        type="danger"
      />
    </div>
  );
}