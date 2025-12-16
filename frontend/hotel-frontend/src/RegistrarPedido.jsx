import { useState, useEffect } from "react";
import axios from "axios";
import { useLocation } from "react-router-dom";
import { API_BASE_URL, TOKEN_KEY } from "./config";
import { useToast } from "./components/ToastContainer";
import ConfirmModal from "./components/ConfirmModal";
import { formatearSoloFecha, formatearSoloHora } from "./utils/fechas";
import TicketTermico from "./components/TicketTermico";
import { 
  Coffee, 
  DollarSign, 
  Home, 
  CreditCard, 
  ArrowLeft, 
  Save,
  Edit3,
  Trash2,
  CheckCircle,
  XCircle,
  ExternalLink,
  Clock,
  Plus,
  AlertCircle,
  TrendingUp,
  BarChart3,
  Minus,
  Printer
} from "lucide-react";

export default function RegistrarPedido() {
  const [form, setForm] = useState({
    items: [{ descripcion: "", cantidad: 1, precio: 0 }],
    habitacion_id: "",
    externo: false,
    forma_pago: ""
  });
  const [mensaje, setMensaje] = useState("");
  const [pedidosHoy, setPedidosHoy] = useState([]);
  const [editandoId, setEditandoId] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [userRole, setUserRole] = useState("empleado");
  const [mostrarFormulario, setMostrarFormulario] = useState(true);
  const [mostrarConfirmEliminar, setMostrarConfirmEliminar] = useState(false);
  const [pedidoAEliminar, setPedidoAEliminar] = useState(null);
  const [pedidoAImprimir, setPedidoAImprimir] = useState(null);
  const [mostrarInstruccionesImpresion, setMostrarInstruccionesImpresion] = useState(false);
  const [pedidoPendienteImpresion, setPedidoPendienteImpresion] = useState(null);
  const { success, error: errorToast } = useToast();
  const location = useLocation();
  
  // Estado para autocompletado de stock
  const [productosStock, setProductosStock] = useState([]);
  const [sugerenciasAbiertas, setSugerenciasAbiertas] = useState({}); // { index: true/false }
  const [sugerenciasFiltradas, setSugerenciasFiltradas] = useState({}); // { index: [productos] }
  const [indiceSeleccionado, setIndiceSeleccionado] = useState({}); // { index: selectedIndex }

  // Obtener rol del usuario desde el token
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        setUserRole(payload.rol || "empleado");
      } catch (error) {
        console.error("Error al decodificar token:", error);
      }
    }
  }, []);

  // Cargar pedido para editar si viene desde VerPedidos
  useEffect(() => {
    if (location.state?.pedidoParaEditar) {
      const pedido = location.state.pedidoParaEditar;
      setForm({
        items: pedido.items || [{ descripcion: "", cantidad: 1, precio: 0 }],
        habitacion_id: pedido.habitacion_id || "",
        externo: pedido.externo || false,
        forma_pago: pedido.forma_pago || ""
      });
      setEditandoId(pedido.id);
      setMostrarFormulario(true);
      // Limpiar el state para que no se recargue al volver
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Calcular el total automáticamente
  const calcularTotal = () => {
    return form.items.reduce((total, item) => {
      return total + (item.cantidad * item.precio);
    }, 0);
  };

  // Cargar pedidos del día desde el backend
  const cargarPedidosHoy = async () => {
    setCargando(true);
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      // Obtener fecha actual en zona horaria de Argentina (UTC-3)
      const ahora = new Date();
      const fechaArgentina = new Date(ahora.toLocaleString("en-US", {timeZone: "America/Argentina/Buenos_Aires"}));
      const hoy = fechaArgentina.toISOString().split('T')[0];
      const res = await axios.get(`${API_BASE_URL}/pedidos-dia?fecha=${hoy}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Convertir los pedidos del backend al formato esperado
      const pedidosFormateados = res.data.map(pedido => ({
        id: pedido.id,
        items: pedido.items || [],
        monto: pedido.monto,
        habitacion_id: pedido.habitacion_id,
        externo: pedido.externo,
        forma_pago: pedido.forma_pago,
        fecha: pedido.fecha
      }));
      
      console.log(`[RegistrarPedido] Pedidos cargados: ${pedidosFormateados.length}`, pedidosFormateados);
      setPedidosHoy(pedidosFormateados);
    } catch (err) {
      console.error("Error al cargar pedidos:", err);
      errorToast("Error al cargar pedidos del día");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarPedidosHoy();
    cargarProductosStock();
  }, []);

  // Cargar productos de stock (solo bebidas)
  const cargarProductosStock = async () => {
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      const res = await axios.get(`${API_BASE_URL}/stock?categoria=bebidas`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProductosStock(res.data || []);
    } catch (err) {
      console.error("Error al cargar productos de stock:", err);
      // No mostrar error al usuario, simplemente no habrá autocompletado
    }
  };

  const handleItemChange = (index, field, value) => {
    const nuevosItems = [...form.items];
    nuevosItems[index] = {
      ...nuevosItems[index],
      [field]: field === 'cantidad' || field === 'precio' ? parseFloat(value) || 0 : value
    };
    setForm({ ...form, items: nuevosItems });
    
    // Si cambió la descripción, actualizar sugerencias
    if (field === 'descripcion') {
      filtrarSugerencias(index, value);
    }
  };

  // Filtrar sugerencias basado en el texto ingresado
  const filtrarSugerencias = (index, texto) => {
    if (!texto || texto.trim() === '') {
      setSugerenciasFiltradas(prev => ({ ...prev, [index]: [] }));
      setSugerenciasAbiertas(prev => ({ ...prev, [index]: false }));
      return;
    }

    const textoLower = texto.toLowerCase().trim();
    const filtrados = productosStock.filter(producto => 
      producto.nombre_producto?.toLowerCase().includes(textoLower)
    ).slice(0, 8); // Máximo 8 sugerencias

    setSugerenciasFiltradas(prev => ({ ...prev, [index]: filtrados }));
    setSugerenciasAbiertas(prev => ({ ...prev, [index]: filtrados.length > 0 }));
    setIndiceSeleccionado(prev => ({ ...prev, [index]: -1 }));
  };

  // Seleccionar un producto del autocompletado
  const seleccionarProducto = (index, producto) => {
    const nuevosItems = [...form.items];
    nuevosItems[index] = {
      ...nuevosItems[index],
      descripcion: producto.nombre_producto
    };
    setForm({ ...form, items: nuevosItems });
    setSugerenciasAbiertas(prev => ({ ...prev, [index]: false }));
    setSugerenciasFiltradas(prev => ({ ...prev, [index]: [] }));
  };

  // Manejar teclado en el input de descripción
  const handleKeyDownDescripcion = (e, index) => {
    const sugerencias = sugerenciasFiltradas[index] || [];
    const seleccionado = indiceSeleccionado[index] || -1;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nuevoSeleccionado = seleccionado < sugerencias.length - 1 ? seleccionado + 1 : seleccionado;
      setIndiceSeleccionado(prev => ({ ...prev, [index]: nuevoSeleccionado }));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const nuevoSeleccionado = seleccionado > 0 ? seleccionado - 1 : -1;
      setIndiceSeleccionado(prev => ({ ...prev, [index]: nuevoSeleccionado }));
    } else if (e.key === 'Enter' && seleccionado >= 0 && sugerencias[seleccionado]) {
      e.preventDefault();
      seleccionarProducto(index, sugerencias[seleccionado]);
    } else if (e.key === 'Escape') {
      setSugerenciasAbiertas(prev => ({ ...prev, [index]: false }));
    }
  };

  const agregarItem = () => {
    setForm({
      ...form,
      items: [...form.items, { descripcion: "", cantidad: 1, precio: 0 }]
    });
  };

  const eliminarItem = (index) => {
    if (form.items.length > 1) {
      const nuevosItems = form.items.filter((_, i) => i !== index);
      setForm({ ...form, items: nuevosItems });
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({
      ...form,
      [name]: type === "checkbox" ? checked : value
    });
  };

  const handleSubmit = async (imprimirDespues = false) => {
    // Validar que todos los items tengan descripción
    const itemsValidos = form.items.every(item => item.descripcion.trim() !== "");
    
    if (!itemsValidos) {
      errorToast("Todos los items deben tener una descripción");
      return;
    }

    const total = calcularTotal();
    if (total <= 0) {
      errorToast("El total debe ser mayor a cero");
      return;
    }

    if (!form.forma_pago) {
      errorToast("Debes seleccionar una forma de pago");
      return;
    }

    setCargando(true);
    
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      const pedidoData = {
        items: form.items,
        habitacion_id: form.habitacion_id ? parseInt(form.habitacion_id) : null,
        externo: form.externo,
        forma_pago: form.forma_pago
      };

      let pedidoRegistrado = null;
      
      if (editandoId) {
        // Actualizar pedido existente
        await axios.put(`${API_BASE_URL}/pedidos/${editandoId}`, pedidoData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        success("Pedido actualizado correctamente");
        // Para edición, construir el pedido con los datos actualizados
        pedidoRegistrado = {
          id: editandoId,
          items: form.items,
          monto: calcularTotal(),
          habitacion_id: form.habitacion_id ? parseInt(form.habitacion_id) : null,
          externo: form.externo,
          forma_pago: form.forma_pago,
          fecha: new Date().toISOString()
        };
      } else {
        // Crear nuevo pedido
        const response = await axios.post(`${API_BASE_URL}/pedidos`, pedidoData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        success("Pedido registrado correctamente");
        
        // Construir el pedido registrado con el ID del backend
        pedidoRegistrado = {
          id: response.data.id,
          items: form.items,
          monto: calcularTotal(),
          habitacion_id: form.habitacion_id ? parseInt(form.habitacion_id) : null,
          externo: form.externo,
          forma_pago: form.forma_pago,
          fecha: new Date().toISOString()
        };
      }
      
      // Reset form
      setForm({
        items: [{ descripcion: "", cantidad: 1, precio: 0 }],
        habitacion_id: "",
        externo: false,
        forma_pago: ""
      });
      setEditandoId(null);
      setMostrarFormulario(false);
      
      // Recargar pedidos del día - esperar un momento para que el backend procese
      setTimeout(async () => {
        console.log("[RegistrarPedido] Recargando pedidos después de registrar...");
        await cargarPedidosHoy();
      }, 300);
      
      // Si se solicitó imprimir después, hacerlo
      if (imprimirDespues && pedidoRegistrado) {
        setTimeout(() => {
          imprimirTicket(pedidoRegistrado);
        }, 500);
      }
      
      // Retornar el pedido registrado para poder imprimirlo
      return pedidoRegistrado;
    } catch (error) {
      console.error("Error al guardar pedido:", error);
      const errorMsg = error.response?.data?.detail || "Error al guardar el pedido";
      errorToast(errorMsg);
      return null;
    } finally {
      setCargando(false);
    }
  };

  const cargarParaEditar = (pedido) => {
    setForm({
      items: pedido.items,
      habitacion_id: pedido.habitacion_id || "",
      externo: pedido.externo,
      forma_pago: pedido.forma_pago
    });
    setEditandoId(pedido.id);
    setMostrarFormulario(true);
  };

  const cancelarEdicion = () => {
    setForm({
      items: [{ descripcion: "", cantidad: 1, precio: 0 }],
      habitacion_id: "",
      externo: false,
      forma_pago: ""
    });
    setEditandoId(null);
    setMostrarFormulario(false);
    setMensaje("");
  };

  const abrirConfirmEliminar = (id) => {
    setPedidoAEliminar(id);
    setMostrarConfirmEliminar(true);
  };

  const borrarPedido = async () => {
    setCargando(true);
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      await axios.delete(`${API_BASE_URL}/pedidos/${pedidoAEliminar}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      success("Pedido eliminado correctamente");
      setMostrarConfirmEliminar(false);
      await cargarPedidosHoy(); // Recargar pedidos del día
    } catch (error) {
      console.error("Error al eliminar pedido:", error);
      const errorMsg = error.response?.data?.detail || "Error al eliminar el pedido";
      errorToast(errorMsg);
    } finally {
      setCargando(false);
    }
  };

  const getPaymentIcon = (formaPago) => {
    if (formaPago?.toLowerCase().includes("efectivo")) return <DollarSign className="w-4 h-4" />;
    if (formaPago?.toLowerCase().includes("tarjeta")) return <CreditCard className="w-4 h-4" />;
    return <Clock className="w-4 h-4" />;
  };

  const imprimirTicket = (pedido, mostrarInstrucciones = true) => {
    if (mostrarInstrucciones) {
      // Mostrar modal con instrucciones primero
      setPedidoPendienteImpresion(pedido);
      setMostrarInstruccionesImpresion(true);
    } else {
      // Imprimir directamente
      setPedidoAImprimir(pedido);
    }
  };

  const confirmarImpresion = () => {
    setMostrarInstruccionesImpresion(false);
    if (pedidoPendienteImpresion) {
      setPedidoAImprimir(pedidoPendienteImpresion);
      setPedidoPendienteImpresion(null);
    }
  };

  const imprimirDesdeFormulario = () => {
    // Construir un pedido temporal desde el formulario para imprimir
    const pedidoTemporal = {
      id: editandoId || "TEMP",
      items: form.items.filter(item => item.descripcion.trim() !== ""),
      monto: calcularTotal(),
      habitacion_id: form.habitacion_id ? parseInt(form.habitacion_id) : null,
      externo: form.externo,
      forma_pago: form.forma_pago || "PENDIENTE",
      fecha: new Date().toISOString()
    };
    
    if (pedidoTemporal.items.length === 0) {
      errorToast("Debes agregar al menos un item para imprimir");
      return;
    }
    
    if (pedidoTemporal.monto <= 0) {
      errorToast("El total debe ser mayor a cero para imprimir");
      return;
    }
    
    imprimirTicket(pedidoTemporal);
  };


  // Calcular estadísticas
  const totalPedidos = pedidosHoy.reduce((sum, pedido) => sum + pedido.monto, 0);
  const pedidosExternos = pedidosHoy.filter(p => p.externo).length;
  const pedidosInternos = pedidosHoy.filter(p => !p.externo).length;
  const esDueño = userRole === "dueño";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-slate-200">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-purple-600 p-3 rounded-xl">
                <Coffee className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-800">
                  {editandoId ? "Editar Pedido" : "Registrar Pedido"}
                </h1>
                <p className="text-slate-600">
                  {esDueño ? "Gestiona los pedidos gastronómicos" : "Registra pedidos gastronómicos"}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-sm text-slate-600 bg-slate-50 px-3 py-2 rounded-lg">
                <Clock className="w-4 h-4 inline mr-1" />
                {new Date().toLocaleDateString('es-ES')}
              </div>
              
              <button
                onClick={() => setMostrarFormulario(!mostrarFormulario)}
                className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-2"
              >
                {mostrarFormulario ? <XCircle className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                {mostrarFormulario ? "Cancelar" : "Nuevo Pedido"}
              </button>
              
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

        {/* Formulario */}
        {mostrarFormulario && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-slate-200">
            {editandoId && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
                <div className="flex items-center gap-2 text-blue-700">
                  <Edit3 className="w-5 h-5" />
                  <span className="font-medium">Editando pedido #{editandoId}</span>
                </div>
              </div>
            )}

            {/* Items del Pedido */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-800">Items del Pedido</h3>
                <button
                  onClick={agregarItem}
                  className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors duration-200"
                >
                  <Plus className="w-4 h-4" />
                  Agregar Item
                </button>
              </div>

              <div className="space-y-4">
                {form.items.map((item, index) => (
                  <div key={index} className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                      {/* Descripción con Autocompletado */}
                      <div className="md:col-span-5 relative">
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Descripción *
                          {productosStock.length > 0 && (
                            <span className="text-xs text-slate-500 ml-2 font-normal">
                              (autocompletado desde stock)
                            </span>
                          )}
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="Ej: Hamburguesa completa o buscar bebida..."
                            value={item.descripcion}
                            onChange={(e) => handleItemChange(index, 'descripcion', e.target.value)}
                            onKeyDown={(e) => handleKeyDownDescripcion(e, index)}
                            onFocus={() => {
                              if (item.descripcion) {
                                filtrarSugerencias(index, item.descripcion);
                              }
                            }}
                            onBlur={() => {
                              // Cerrar sugerencias después de un pequeño delay para permitir click
                              setTimeout(() => {
                                setSugerenciasAbiertas(prev => ({ ...prev, [index]: false }));
                              }, 200);
                            }}
                            className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent placeholder-slate-400"
                          />
                          
                          {/* Dropdown de sugerencias */}
                          {sugerenciasAbiertas[index] && (sugerenciasFiltradas[index] || []).length > 0 && (
                            <div className="absolute z-50 w-full mt-1 bg-white border border-slate-300 rounded-lg shadow-lg max-h-60 overflow-auto">
                              {(sugerenciasFiltradas[index] || []).map((producto, sugIndex) => (
                                <div
                                  key={producto.id}
                                  onClick={() => seleccionarProducto(index, producto)}
                                  className={`px-4 py-2 cursor-pointer hover:bg-purple-50 transition-colors ${
                                    (indiceSeleccionado[index] || -1) === sugIndex ? 'bg-purple-100' : ''
                                  }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="font-medium text-slate-800">
                                      {producto.nombre_producto}
                                    </span>
                                    <span className={`text-xs px-2 py-1 rounded-full ${
                                      (producto.cantidad || 0) > 10 
                                        ? 'bg-green-100 text-green-700' 
                                        : (producto.cantidad || 0) > 0
                                        ? 'bg-yellow-100 text-yellow-700'
                                        : 'bg-red-100 text-red-700'
                                    }`}>
                                      Stock: {producto.cantidad || 0}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Cantidad */}
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Cantidad
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={item.cantidad}
                          onChange={(e) => handleItemChange(index, 'cantidad', e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                      </div>

                      {/* Precio Unitario */}
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Precio c/u
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.precio}
                          onChange={(e) => handleItemChange(index, 'precio', e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                      </div>

                      {/* Subtotal */}
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Subtotal
                        </label>
                        <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-green-700 font-semibold">
                          ${(item.cantidad * item.precio).toLocaleString()}
                        </div>
                      </div>

                      {/* Botón Eliminar */}
                      <div className="md:col-span-1 flex justify-center">
                        {form.items.length > 1 && (
                          <button
                            onClick={() => eliminarItem(index)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
                            title="Eliminar item"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Total */}
              <div className="mt-6 bg-purple-50 border border-purple-200 rounded-xl p-4">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-purple-800">Total del Pedido:</span>
                  <span className="text-2xl font-bold text-purple-700">
                    ${calcularTotal().toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Información Adicional */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Habitación */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Habitación (opcional)
                </label>
                <div className="relative">
                  <Home className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="number"
                    name="habitacion_id"
                    placeholder="Número de habitación"
                    value={form.habitacion_id}
                    onChange={handleChange}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-12 pr-4 py-3 text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent placeholder-slate-400"
                  />
                </div>
              </div>

              {/* Forma de pago */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Forma de pago
                </label>
                <select
                  name="forma_pago"
                  value={form.forma_pago}
                  onChange={handleChange}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="">Seleccionar forma de pago</option>
                  <option value="efectivo">Efectivo</option>
                  <option value="tarjeta">Tarjeta</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="pendiente">Pendiente</option>
                </select>
              </div>

              {/* Pedido Externo */}
              <div className="flex items-center">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="externo"
                    checked={form.externo}
                    onChange={handleChange}
                    className="w-5 h-5 text-purple-600 bg-slate-50 border-slate-300 rounded focus:ring-purple-500 focus:ring-2"
                  />
                  <div className="flex items-center gap-2">
                    <ExternalLink className="w-5 h-5 text-slate-600" />
                    <span className="text-sm font-medium text-slate-700">Pedido Externo</span>
                  </div>
                </label>
              </div>
            </div>

            {/* Botones */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => handleSubmit(false)}
                disabled={cargando || calcularTotal() <= 0}
                className="flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-xl font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
              >
                {cargando ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <Save className="w-5 h-5" />
                )}
                {editandoId ? "Actualizar Pedido" : "Registrar Pedido"}
              </button>
              
              {!editandoId && (
                <button
                  onClick={() => handleSubmit(true)}
                  disabled={cargando || calcularTotal() <= 0}
                  className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                >
                  {cargando ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  ) : (
                    <Printer className="w-5 h-5" />
                  )}
                  Registrar e Imprimir
                </button>
              )}
              
              <button
                onClick={imprimirDesdeFormulario}
                disabled={cargando || calcularTotal() <= 0}
                className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                title="Imprimir ticket sin registrar (vista previa)"
              >
                <Printer className="w-5 h-5" />
                Vista Previa / Imprimir
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

        {/* Resumen del día - SOLO PARA DUEÑOS */}
        {esDueño && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-slate-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-4 rounded-xl">
                <div className="flex items-center gap-3">
                  <Coffee className="w-8 h-8 text-purple-600" />
                  <div>
                    <p className="text-sm text-purple-600 font-medium">Total Pedidos</p>
                    <p className="text-2xl font-bold text-purple-700">{pedidosHoy.length}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-xl">
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-8 h-8 text-green-600" />
                  <div>
                    <p className="text-sm text-green-600 font-medium">Total Ingresos</p>
                    <p className="text-2xl font-bold text-green-700">${totalPedidos.toLocaleString()}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-xl">
                <div className="flex items-center gap-3">
                  <BarChart3 className="w-8 h-8 text-blue-600" />
                  <div>
                    <p className="text-sm text-blue-600 font-medium">Pedidos Externos</p>
                    <p className="text-2xl font-bold text-blue-700">{pedidosExternos}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Lista de pedidos */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-200">
            <h3 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
              <Coffee className="w-6 h-6 text-purple-600" />
              {esDueño ? "Pedidos del Día" : "Pedidos Registrados Hoy"} ({pedidosHoy.length})
            </h3>
            {!esDueño && (
              <p className="text-sm text-slate-600 mt-1">
                Pedidos registrados el {new Date().toLocaleDateString('es-ES')}
              </p>
            )}
          </div>

          {cargando ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
              <p className="text-slate-600">Cargando pedidos...</p>
            </div>
          ) : pedidosHoy.length === 0 ? (
            <div className="p-8 text-center">
              <Coffee className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">No hay pedidos registrados hoy</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-medium text-slate-700">Items</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-slate-700">Total</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-slate-700">Habitación</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-slate-700">Forma de Pago</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-slate-700">Tipo</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-slate-700">
                      {esDueño ? "Fecha" : "Hora"}
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-slate-700">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {pedidosHoy.map((pedido) => (
                    <tr key={pedido.id} className="hover:bg-slate-50 transition-colors duration-200">
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          {pedido.items.map((item, index) => (
                            <div key={index} className="text-sm">
                              <span className="font-medium text-slate-900">
                                {item.cantidad}x {item.descripcion}
                              </span>
                              <span className="text-slate-500 ml-2">
                                (${item.precio.toLocaleString()} c/u)
                              </span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-lg font-bold text-green-600">
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
                        <div className="flex items-center gap-2">
                          {getPaymentIcon(pedido.forma_pago)}
                          <span className="text-sm text-slate-700 capitalize">
                            {pedido.forma_pago || "No especificado"}
                          </span>
                        </div>
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
                        {esDueño ? (
                          <div>
                            <span className="text-sm text-slate-700">
                              {formatearSoloFecha(pedido.fecha)}
                            </span>
                            <div className="text-xs text-slate-500 mt-1">
                              {formatearSoloHora(pedido.fecha)}
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-slate-600">
                            {formatearSoloHora(pedido.fecha)}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => imprimirTicket(pedido)}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors duration-200"
                            title="Imprimir ticket"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => cargarParaEditar(pedido)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-200"
                            title="Editar pedido"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => abrirConfirmEliminar(pedido.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
                            title="Eliminar pedido"
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
        onConfirm={borrarPedido}
        title="Eliminar Pedido"
        message="¿Estás seguro de que deseas eliminar este pedido? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        cancelText="Cancelar"
        type="danger"
      />

      {/* Modal de instrucciones de impresión */}
      {mostrarInstruccionesImpresion && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md mx-4">
            <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Printer className="w-6 h-6 text-green-600" />
              Instrucciones de Impresión
            </h3>
            <div className="space-y-3 text-slate-700 mb-6">
              <p className="font-semibold text-red-600 text-lg">⚠️ PASOS IMPORTANTES:</p>
              <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-4 mb-4">
                <p className="font-bold text-yellow-800 mb-2">🔴 ATENCIÓN: El diálogo mostrará "Guardar como PDF" por defecto</p>
                <p className="text-yellow-700">Debes cambiar esto antes de hacer clic en cualquier botón.</p>
              </div>
              <ol className="list-decimal list-inside space-y-3 ml-2 text-base">
                <li className="font-semibold">Busca el dropdown <span className="bg-blue-100 px-2 py-1 rounded">"Impresora"</span> en la parte superior izquierda del diálogo</li>
                <li className="font-semibold">Haz clic en el dropdown y selecciona tu <span className="bg-green-100 px-2 py-1 rounded">impresora térmica (GADNIC TP-450S)</span></li>
                <li className="font-semibold text-red-600">NO dejes seleccionado "Guardar como PDF"</li>
                <li className="font-semibold">Una vez seleccionada tu impresora, haz clic en el botón <span className="bg-purple-100 px-2 py-1 rounded">"Imprimir"</span> (NO en "Guardar")</li>
              </ol>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
                <p className="text-sm text-blue-700">
                  <strong>💡 Tip:</strong> Si no ves tu impresora en la lista, asegúrate de que esté encendida, conectada por USB, y configurada en Windows.
                </p>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-2">
                <p className="text-sm text-green-700">
                  <strong>✅ Solución rápida:</strong> Configura tu impresora térmica como impresora predeterminada en Windows. Así se seleccionará automáticamente.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={confirmarImpresion}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Entendido, Imprimir
              </button>
              <button
                onClick={() => {
                  setMostrarInstruccionesImpresion(false);
                  setPedidoPendienteImpresion(null);
                }}
                className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Componente de impresión térmica */}
      {pedidoAImprimir && (
        <TicketTermico
          pedido={pedidoAImprimir}
          onClose={() => setPedidoAImprimir(null)}
        />
      )}
    </div>
  );
}