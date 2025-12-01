import { useState, useEffect } from "react";
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
  Minus
} from "lucide-react";

export default function RegistrarPedido() {
  const [form, setForm] = useState({
    items: [{ descripcion: "", cantidad: 1, precio: 0 }],
    habitacion_id: "",
    externo: false,
    forma_pago: ""
  });
  const [mensaje, setMensaje] = useState("");
  const [pedidosHoy, setPedidosHoy] = useState([
    {
      id: 1,
      items: [
        { descripcion: "Hamburguesa", cantidad: 1, precio: 10000 }
      ],
      monto: 10000,
      habitacion_id: 1,
      externo: false,
      forma_pago: "efectivo",
      fecha: new Date().toISOString()
    },
    {
      id: 2,
      items: [
        { descripcion: "Hamburguesa", cantidad: 2, precio: 10000 },
        { descripcion: "Papas fritas", cantidad: 2, precio: 5000 },
        { descripcion: "Coca cola", cantidad: 2, precio: 3000 }
      ],
      monto: 36000,
      habitacion_id: 4,
      externo: false,
      forma_pago: "efectivo",
      fecha: new Date().toISOString()
    }
  ]);
  const [editandoId, setEditandoId] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [userRole, setUserRole] = useState("empleado"); // Simulado para demo
  const [mostrarFormulario, setMostrarFormulario] = useState(true);

  // Calcular el total automáticamente
  const calcularTotal = () => {
    return form.items.reduce((total, item) => {
      return total + (item.cantidad * item.precio);
    }, 0);
  };

  const handleItemChange = (index, field, value) => {
    const nuevosItems = [...form.items];
    nuevosItems[index] = {
      ...nuevosItems[index],
      [field]: field === 'cantidad' || field === 'precio' ? parseFloat(value) || 0 : value
    };
    setForm({ ...form, items: nuevosItems });
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

  const handleSubmit = async () => {
    // Validar que todos los items tengan descripción
    const itemsValidos = form.items.every(item => item.descripcion.trim() !== "");
    
    if (!itemsValidos) {
      setMensaje("❌ Todos los items deben tener una descripción");
      return;
    }

    const total = calcularTotal();
    if (total <= 0) {
      setMensaje("❌ El total debe ser mayor a cero");
      return;
    }

    setCargando(true);
    
    // Simular API call
    setTimeout(() => {
      if (editandoId) {
        const pedidosActualizados = pedidosHoy.map(pedido => 
          pedido.id === editandoId 
            ? { 
                ...pedido, 
                items: form.items,
                monto: total,
                habitacion_id: form.habitacion_id ? parseInt(form.habitacion_id) : null,
                externo: form.externo,
                forma_pago: form.forma_pago
              }
            : pedido
        );
        setPedidosHoy(pedidosActualizados);
        setMensaje("✅ Pedido actualizado correctamente");
      } else {
        const nuevoPedido = {
          id: pedidosHoy.length + 1,
          items: form.items,
          monto: total,
          habitacion_id: form.habitacion_id ? parseInt(form.habitacion_id) : null,
          externo: form.externo,
          forma_pago: form.forma_pago,
          fecha: new Date().toISOString()
        };
        setPedidosHoy([...pedidosHoy, nuevoPedido]);
        setMensaje("✅ Pedido registrado correctamente");
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
      setCargando(false);
      
      setTimeout(() => setMensaje(""), 3000);
    }, 1000);
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

  const borrarPedido = async (id) => {
    if (!window.confirm("¿Estás seguro de que querés eliminar este pedido?")) return;
    
    setCargando(true);
    setTimeout(() => {
      const pedidosFiltrados = pedidosHoy.filter(pedido => pedido.id !== id);
      setPedidosHoy(pedidosFiltrados);
      setMensaje("🗑️ Pedido eliminado");
      setCargando(false);
      setTimeout(() => setMensaje(""), 3000);
    }, 500);
  };

  const getPaymentIcon = (formaPago) => {
    if (formaPago?.toLowerCase().includes("efectivo")) return <DollarSign className="w-4 h-4" />;
    if (formaPago?.toLowerCase().includes("tarjeta")) return <CreditCard className="w-4 h-4" />;
    return <Clock className="w-4 h-4" />;
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
                      {/* Descripción */}
                      <div className="md:col-span-5">
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Descripción *
                        </label>
                        <input
                          type="text"
                          placeholder="Ej: Hamburguesa completa"
                          value={item.descripcion}
                          onChange={(e) => handleItemChange(index, 'descripcion', e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent placeholder-slate-400"
                        />
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
                onClick={handleSubmit}
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
                              {new Date(pedido.fecha).toLocaleDateString('es-ES')}
                            </span>
                            <div className="text-xs text-slate-500 mt-1">
                              {new Date(pedido.fecha).toLocaleTimeString('es-ES', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-slate-600">
                            {new Date(pedido.fecha).toLocaleTimeString('es-ES', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => cargarParaEditar(pedido)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-200"
                            title="Editar pedido"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => borrarPedido(pedido.id)}
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
    </div>
  );
}