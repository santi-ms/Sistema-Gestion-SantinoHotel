import React, { useEffect, useState } from "react";
import { SkeletonTable } from "./components/Skeleton";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL, TOKEN_KEY } from "./config";
import { useToast } from "./components/ToastContainer";
import ConfirmModal from "./components/ConfirmModal";
import Modal from "./components/Modal";
import { 
  Calendar, 
  User, 
  DollarSign, 
  CreditCard, 
  Home, 
  CheckCircle, 
  Clock, 
  ArrowLeft, 
  Plus, 
  X, 
  IdCard,
  Car,
  Phone,
  Users,
  Heart,
  Printer
} from "lucide-react";
import TicketAlojamiento from "./components/TicketAlojamiento";

export default function ReservasDia() {
  const [reservas, setReservas] = useState([]);
  const [habitacion, setHabitacion] = useState(1);
  
  // Datos básicos de la reserva
  const [nombre, setNombre] = useState("");
  const [precio, setPrecio] = useState("");
  const [seña, setSeña] = useState("");
  const [ingreso, setIngreso] = useState("");
  const [egreso, setEgreso] = useState("");
  const [formaPago, setFormaPago] = useState("pendiente");
  
  // Nuevos campos del cliente
  const [dni, setDni] = useState("");
  const [patente, setPatente] = useState("");
  const [celular, setCelular] = useState("");
  const [cantidadPersonas, setCantidadPersonas] = useState(1);
  
  // Campos para mascotas
  const [mascota, setMascota] = useState(false);
  const [observacionesMascota, setObservacionesMascota] = useState("");
  
  const [fechaSeleccionada, setFechaSeleccionada] = useState(new Date().toLocaleDateString('fr-CA'));
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [mostrarConfirmCheckout, setMostrarConfirmCheckout] = useState(false);
  const [reservaCheckoutId, setReservaCheckoutId] = useState(null);
  const [mostrarModalPago, setMostrarModalPago] = useState(false);
  const [reservaPagoId, setReservaPagoId] = useState(null);
  const [nuevaFormaPago, setNuevaFormaPago] = useState("");
  const [reservaAImprimir, setReservaAImprimir] = useState(null);
  const [mostrarInstruccionesImpresion, setMostrarInstruccionesImpresion] = useState(false);
  const [reservaPendienteImpresion, setReservaPendienteImpresion] = useState(null);
  const [mostrarConfirmEliminar, setMostrarConfirmEliminar] = useState(false);
  const [reservaEliminarId, setReservaEliminarId] = useState(null);
  const [usuarioRol, setUsuarioRol] = useState(null);
  const { success, error, warning } = useToast();
  const navigate = useNavigate();

  // ✅ FUNCIÓN ORIGINAL - Conecta con tu backend real
  const obtenerReservas = async () => {
    setCargando(true);
    const token = localStorage.getItem(TOKEN_KEY);
    try {
      const res = await axios.get(`${API_BASE_URL}/reservas/dia?fecha=${fechaSeleccionada}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setReservas(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setCargando(false);
    }
  };

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
    obtenerReservas();
  }, [fechaSeleccionada]);

  const habitaciones = Array.from({ length: 15 }, (_, i) => i + 1);

  const validarDisponibilidad = () => {
    const fechaInicio = new Date(ingreso);
    const fechaFin = new Date(egreso);

    const conflictos = reservas.filter((r) => {
      // Excluir reservas canceladas
      if (r.estado === "cancelada") return false;
      if (r.habitacion_id !== habitacion) return false;
      const checkIn = new Date(r.fecha_checkin);
      const checkOut = new Date(r.fecha_checkout);
      return (
        (fechaInicio >= checkIn && fechaInicio < checkOut) ||
        (fechaFin > checkIn && fechaFin <= checkOut) ||
        (fechaInicio <= checkIn && fechaFin >= checkOut)
      );
    });

    return conflictos.length === 0;
  };

  // Limpiar formulario
  const limpiarFormulario = () => {
    setNombre("");
    setPrecio("");
    setSeña("");
    setIngreso("");
    setEgreso("");
    setFormaPago("pendiente");
    setDni("");
    setPatente("");
    setCelular("");
    setCantidadPersonas(1);
    setMascota(false);
    setObservacionesMascota("");
  };

  // ✅ VALIDACIÓN MEJORADA - Validar fechas
  const validarFechas = () => {
    if (!ingreso || !egreso) {
      return { valido: false, mensaje: "Las fechas de ingreso y egreso son obligatorias" };
    }
    
    const fechaInicio = new Date(ingreso);
    const fechaFin = new Date(egreso);
    
    if (fechaFin <= fechaInicio) {
      return { valido: false, mensaje: "La fecha de egreso debe ser posterior a la fecha de ingreso" };
    }
    
    return { valido: true };
  };

  // ✅ FUNCIÓN CORREGIDA - Usa /reservas-gestion con formato correcto
  const registrarReserva = async () => {
    // Validaciones básicas
    if (!nombre || !precio || !ingreso || !egreso || !dni || !celular) {
      error("Faltan datos obligatorios: nombre, precio, fechas, DNI y celular son requeridos");
      return;
    }
    
    // Validar formato de DNI (solo números)
    if (!/^\d{7,8}$/.test(dni)) {
      error("El DNI debe contener solo números y tener entre 7 y 8 dígitos");
      return;
    }
    
    // Validar formato de teléfono
    if (!/^\d{10,15}$/.test(celular.replace(/\s/g, ""))) {
      error("El celular debe contener solo números (10-15 dígitos)");
      return;
    }
    
    // Validar precio positivo
    if (!precio || parseFloat(precio) <= 0) {
      error("El precio debe ser mayor a cero");
      return;
    }
    
    // Validar fechas
    const validacionFechas = validarFechas();
    if (!validacionFechas.valido) {
      error(validacionFechas.mensaje);
      return;
    }
    
    if (!validarDisponibilidad()) {
      error("Esa habitación ya está ocupada en el rango de fechas ingresado");
      return;
    }

    const token = localStorage.getItem(TOKEN_KEY);
    
    // Convertir fechas de formato ISO (YYYY-MM-DD) a formato dd/mm/aaaa
    const fechaIngreso = ingreso.split('-').reverse().join('/');
    const fechaEgreso = egreso.split('-').reverse().join('/');
    
    setCargando(true);
    try {
      const datosReserva = {
        // Campos para crear el cliente
        nombre_completo: nombre,
        dni: dni,
        celular: celular,
        patente: patente || null,
        cantidad_personas: parseInt(cantidadPersonas),
        
        // Campos para la reserva
        habitacion_id: habitacion,
        fecha_ingreso: fechaIngreso, // Formato dd/mm/aaaa
        fecha_egreso: fechaEgreso,   // Formato dd/mm/aaaa
        precio_total: parseFloat(precio),
        seña: parseFloat(seña) || 0,
        forma_pago: formaPago,
        
        // Campos de mascota
        mascota: mascota,
        observaciones_mascota: observacionesMascota || null
      };

      const response = await axios.post(
        `${API_BASE_URL}/reservas-gestion`,
        datosReserva,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      
      const mensajeExito = mascota 
        ? "Reserva registrada correctamente (con mascota 🐾)" 
        : "Reserva registrada correctamente";
      
      success(mensajeExito);
      setMostrarFormulario(false);
      limpiarFormulario();
      obtenerReservas();
    } catch (err) {
      console.error("Error completo:", err);
      console.error("Respuesta del servidor:", err.response?.data);
      const errorMsg = err.response?.data?.detail || "Error al registrar reserva";
      error(errorMsg);
    } finally {
      setCargando(false);
    }
  };

  // ✅ FUNCIÓN MEJORADA - Actualiza pago con modal
  const abrirModalPago = (id) => {
    setReservaPagoId(id);
    setNuevaFormaPago("");
    setMostrarModalPago(true);
  };

  const actualizarPago = async () => {
    if (!nuevaFormaPago) {
      error("Debes seleccionar una forma de pago");
      return;
    }
    
    const token = localStorage.getItem(TOKEN_KEY);
    try {
      await axios.patch(`${API_BASE_URL}/reservas/${reservaPagoId}/pago`, { forma_pago: nuevaFormaPago }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      success("Forma de pago actualizada correctamente");
      setMostrarModalPago(false);
      obtenerReservas();
    } catch (err) {
      error(err.response?.data?.detail || "Error al actualizar pago");
      console.error(err);
    }
  };

  // ✅ FUNCIÓN MEJORADA - Hace checkout con confirmación
  const abrirConfirmCheckout = (id) => {
    setReservaCheckoutId(id);
    setMostrarConfirmCheckout(true);
  };

  const realizarCheckout = async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    try {
      const res = await axios.patch(`${API_BASE_URL}/reservas/${reservaCheckoutId}/checkout`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log("Checkout response:", res.data);
      success("Checkout realizado correctamente");
      setMostrarConfirmCheckout(false);
      obtenerReservas();
    } catch (err) {
      error(err.response?.data?.detail || "Error al realizar checkout");
      console.error(err);
    }
  };

  // ✅ FUNCIÓN PARA CANCELAR/ELIMINAR RESERVA
  const abrirConfirmEliminar = (id) => {
    setReservaEliminarId(id);
    setMostrarConfirmEliminar(true);
  };

  const eliminarReserva = async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    try {
      await axios.delete(`${API_BASE_URL}/reservas/${reservaEliminarId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      success("Reserva cancelada/eliminada correctamente");
      setMostrarConfirmEliminar(false);
      setReservaEliminarId(null);
      obtenerReservas();
    } catch (err) {
      const errorMsg = err.response?.data?.detail || "Error al eliminar reserva";
      error(errorMsg);
      console.error(err);
    }
  };

  const datosReserva = (num) => reservas.find((r) => r.habitacion_id === num);

  const getPaymentIcon = (formaPago) => {
    if (formaPago === "tarjeta") return <CreditCard className="w-4 h-4" />;
    if (formaPago === "efectivo") return <DollarSign className="w-4 h-4" />;
    if (formaPago === "transferencia") return <CreditCard className="w-4 h-4" />;
    return <Clock className="w-4 h-4" />;
  };

  const getPaymentColor = (formaPago) => {
    if (formaPago === "pendiente") return "text-amber-600 bg-amber-50";
    return "text-emerald-600 bg-emerald-50";
  };

  const imprimirTicketAlojamiento = (reserva) => {
    setReservaPendienteImpresion(reserva);
    setMostrarInstruccionesImpresion(true);
  };

  const confirmarImpresionAlojamiento = () => {
    setMostrarInstruccionesImpresion(false);
    if (reservaPendienteImpresion) {
      setReservaAImprimir(reservaPendienteImpresion);
      setReservaPendienteImpresion(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-slate-200">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-3 rounded-xl">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-800">Reservas del día</h1>
                <p className="text-slate-600">Gestiona las reservas de tu hotel</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative">
                <input
                  type="date"
                  value={fechaSeleccionada}
                  onChange={(e) => setFechaSeleccionada(e.target.value)}
                  className="bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <button
                onClick={() => setMostrarFormulario(!mostrarFormulario)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-2"
              >
                {mostrarFormulario ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                {mostrarFormulario ? "Cancelar" : "Nueva Reserva"}
              </button>
            </div>
          </div>
        </div>

        {/* Formulario de nueva reserva */}
        {mostrarFormulario && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-slate-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-emerald-600 p-2 rounded-lg">
                <User className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-slate-800">Nueva Reserva</h3>
            </div>
            
            {/* Datos del Cliente */}
            <div className="mb-8">
              <h4 className="text-lg font-medium text-slate-700 mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-slate-600" />
                Datos del Cliente
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Nombre completo *
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Juan Pérez"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-slate-400"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    DNI / Documento *
                  </label>
                  <div className="relative">
                    <IdCard className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="12345678"
                      value={dni}
                      onChange={(e) => setDni(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-12 pr-4 py-3 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-slate-400"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Número de celular *
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="tel"
                      placeholder="11 1234-5678"
                      value={celular}
                      onChange={(e) => setCelular(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-12 pr-4 py-3 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-slate-400"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Patente del vehículo
                  </label>
                  <div className="relative">
                    <Car className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="ABC123 (opcional)"
                      value={patente}
                      onChange={(e) => setPatente(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-12 pr-4 py-3 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-slate-400"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Cantidad de personas
                  </label>
                  <div className="relative">
                    <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="number"
                      min="1"
                      max="6"
                      value={cantidadPersonas}
                      onChange={(e) => setCantidadPersonas(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-12 pr-4 py-3 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Datos de la Reserva */}
            <div className="mb-6">
              <h4 className="text-lg font-medium text-slate-700 mb-4 flex items-center gap-2">
                <Home className="w-5 h-5 text-slate-600" />
                Datos de la Reserva
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Habitación</label>
                  <select
                    value={habitacion}
                    onChange={(e) => setHabitacion(parseInt(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {habitaciones.map((num) => (
                      <option key={num} value={num}>Habitación {num}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Fecha de ingreso *</label>
                  <input
                    type="date"
                    value={ingreso}
                    onChange={(e) => setIngreso(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Fecha de egreso *</label>
                  <input
                    type="date"
                    value={egreso}
                    onChange={(e) => setEgreso(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Precio total *</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="number"
                      placeholder="0"
                      value={precio}
                      onChange={(e) => setPrecio(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-12 pr-4 py-3 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-slate-400"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Seña</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="number"
                      placeholder="0"
                      value={seña}
                      onChange={(e) => setSeña(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-12 pr-4 py-3 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-slate-400"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Forma de pago</label>
                  <select
                    value={formaPago}
                    onChange={(e) => setFormaPago(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="pendiente">Pendiente</option>
                    <option value="efectivo">Efectivo</option>
                    <option value="tarjeta">Tarjeta</option>
                    <option value="transferencia">Transferencia</option>
                  </select>
                </div>
              </div>
            </div>
            
            {/* Sección de Mascotas */}
            <div className="mb-6">
              <h4 className="text-lg font-medium text-slate-700 mb-4 flex items-center gap-2">
                <Heart className="w-5 h-5 text-slate-600" />
                Información de Mascota (Opcional)
              </h4>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="mascota"
                    checked={mascota}
                    onChange={(e) => setMascota(e.target.checked)}
                    className="w-5 h-5 text-blue-600 border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <label htmlFor="mascota" className="text-slate-700 font-medium cursor-pointer">
                    El huésped viaja con mascota pequeña (+$7,000)
                  </label>
                </div>
                {mascota && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Observaciones sobre la mascota
                    </label>
                    <textarea
                      placeholder="Ej: Perro pequeño, requiere cama especial..."
                      value={observacionesMascota}
                      onChange={(e) => setObservacionesMascota(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-slate-400 min-h-[80px]"
                    />
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={registrarReserva}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-medium transition-colors duration-200 flex items-center gap-2"
              >
                <CheckCircle className="w-5 h-5" />
                Registrar reserva
              </button>
              <button
                onClick={() => {
                  setMostrarFormulario(false);
                  limpiarFormulario();
                }}
                className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-6 py-3 rounded-xl font-medium transition-colors duration-200"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Loading state */}
        {cargando && (
          <div className="bg-white rounded-2xl shadow-lg p-8 mb-8 border border-slate-200">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-slate-600">Cargando reservas...</span>
            </div>
          </div>
        )}

        {/* Grid de habitaciones */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 mb-8">
          {habitaciones.map((num) => {
            const datos = datosReserva(num);
            const isOccupied = !!datos;
            
            return (
              <div
                key={num}
                className={`relative overflow-hidden rounded-2xl shadow-lg border transition-all duration-300 hover:shadow-xl hover:scale-105 ${
                  isOccupied 
                    ? "bg-gradient-to-br from-red-50 to-red-100 border-red-200" 
                    : "bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200"
                }`}
              >
                {/* Status indicator */}
                <div className={`absolute top-3 right-3 w-3 h-3 rounded-full ${
                  isOccupied ? "bg-red-500" : "bg-emerald-500"
                }`}></div>
                
                <div className="p-5">
                  {/* Room number */}
                  <div className="flex items-center gap-2 mb-4">
                    <div className={`p-2 rounded-lg ${
                      isOccupied ? "bg-red-600" : "bg-emerald-600"
                    }`}>
                      <Home className="w-4 h-4 text-white" />
                    </div>
                    <h3 className="font-bold text-lg text-slate-800">Hab. {num}</h3>
                  </div>

                  {isOccupied ? (
                    <div className="space-y-3">
                      <div className="bg-white/60 backdrop-blur-sm rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <User className="w-4 h-4 text-slate-600" />
                          <span className="font-medium text-slate-800">{datos.nombre_huesped}</span>
                        </div>
                        
                        <div className="space-y-1 text-sm text-slate-600">
                          <div>Check-in: {datos.fecha_checkin?.split("T")[0]}</div>
                          <div>Check-out: {datos.fecha_checkout?.split("T")[0]}</div>
                          {datos.cantidad_personas && (
                            <div className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {datos.cantidad_personas} persona{datos.cantidad_personas !== 1 ? 's' : ''}
                            </div>
                          )}
                          <div className="font-semibold text-slate-800">
                            ${datos.total_estadia?.toLocaleString()}
                          </div>
                          {datos.seña && datos.seña > 0 && (
                            <div className="flex items-center gap-1 text-amber-600 font-medium mt-1">
                              <Clock className="w-3 h-3" />
                              <span>Seña: ${datos.seña.toLocaleString()}</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex flex-wrap gap-2 mt-2">
                          <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getPaymentColor(datos.forma_pago)}`}>
                            {getPaymentIcon(datos.forma_pago)}
                            {datos.forma_pago}
                          </div>
                          {datos.estado && (
                            <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                              datos.estado === "completada" ? "bg-green-100 text-green-700" :
                              datos.estado === "cancelada" ? "bg-red-100 text-red-700" :
                              "bg-blue-100 text-blue-700"
                            }`}>
                              {datos.estado === "completada" ? "✓ Completada" :
                               datos.estado === "cancelada" ? "✕ Cancelada" :
                               "Activa"}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex flex-col gap-2">
                        <button
                          className="w-full bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center justify-center gap-2"
                          onClick={() => imprimirTicketAlojamiento(datos)}
                        >
                          <Printer className="w-4 h-4" />
                          Imprimir Ticket
                        </button>
                        {datos.forma_pago === "pendiente" && (
                          <button
                            className="w-full bg-amber-500 hover:bg-amber-600 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
                            onClick={() => abrirModalPago(datos.id)}
                          >
                            Marcar como pagado
                          </button>
                        )}
                        {datos.estado !== "completada" && datos.estado !== "cancelada" && (
                          <button
                            className="w-full bg-slate-800 hover:bg-slate-900 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center justify-center gap-2"
                            onClick={() => abrirConfirmCheckout(datos.id)}
                          >
                            <CheckCircle className="w-4 h-4" />
                            Checkout
                          </button>
                        )}
                        {datos.estado === "completada" && (
                          <div className="w-full bg-green-100 text-green-700 px-3 py-2 rounded-lg text-sm font-medium text-center">
                            ✓ Checkout realizado
                          </div>
                        )}
                        {usuarioRol === "dueño" && datos.estado !== "cancelada" && (
                          <button
                            className="w-full bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center justify-center gap-2"
                            onClick={() => abrirConfirmEliminar(datos.id)}
                          >
                            <X className="w-4 h-4" />
                            Cancelar Reserva
                          </button>
                        )}
                        {datos.estado === "cancelada" && (
                          <div className="w-full bg-red-100 text-red-700 px-3 py-2 rounded-lg text-sm font-medium text-center">
                            ✕ Reserva cancelada
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="bg-emerald-600 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                        <CheckCircle className="w-6 h-6 text-white" />
                      </div>
                      <p className="text-emerald-700 font-medium">Disponible</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-800 transition-colors duration-200"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver atrás
        </button>
      </div>

      {/* Modal de confirmación para checkout */}
      <ConfirmModal
        isOpen={mostrarConfirmCheckout}
        onClose={() => setMostrarConfirmCheckout(false)}
        onConfirm={realizarCheckout}
        title="Confirmar Checkout"
        message="¿Estás seguro de que deseas realizar el checkout de esta reserva?"
        confirmText="Confirmar Checkout"
        cancelText="Cancelar"
        type="warning"
      />

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
        confirmText="Sí, eliminar"
        cancelText="Cancelar"
        type="danger"
      />

      {/* Modal para actualizar forma de pago */}
      <Modal
        isOpen={mostrarModalPago}
        onClose={() => setMostrarModalPago(false)}
        title="Actualizar Forma de Pago"
        size="sm"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Selecciona la forma de pago
            </label>
            <select
              value={nuevaFormaPago}
              onChange={(e) => setNuevaFormaPago(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Selecciona una opción</option>
              <option value="efectivo">Efectivo</option>
              <option value="tarjeta">Tarjeta</option>
              <option value="transferencia">Transferencia</option>
            </select>
          </div>
          <div className="flex gap-3 justify-end pt-4 border-t border-slate-200">
            <button
              onClick={() => setMostrarModalPago(false)}
              className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={actualizarPago}
              disabled={!nuevaFormaPago || cargando}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {cargando ? "Guardando..." : "Actualizar"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal de instrucciones de impresión para alojamiento */}
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
                onClick={confirmarImpresionAlojamiento}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Entendido, Imprimir
              </button>
              <button
                onClick={() => {
                  setMostrarInstruccionesImpresion(false);
                  setReservaPendienteImpresion(null);
                }}
                className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Componente de impresión térmica para alojamiento */}
      {reservaAImprimir && (
        <TicketAlojamiento
          reserva={reservaAImprimir}
          onClose={() => setReservaAImprimir(null)}
        />
      )}
    </div>
  );
}