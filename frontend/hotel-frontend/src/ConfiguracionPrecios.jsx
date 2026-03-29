import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API_BASE_URL, TOKEN_KEY } from "./config";
import { getUserRole } from "./hooks/useAuth";
import { useDebounce } from "./hooks/useDebounce";
import { useToast } from "./components/ToastContainer";
import { SkeletonTable } from "./components/Skeleton";
import { EmptyState } from "./components/EmptyState";
import {
  Home,
  DollarSign,
  Edit3,
  Save,
  Calendar,
  TrendingUp,
  TrendingDown,
  Search,
  X,
  RefreshCw
} from "lucide-react";
import { formatearSoloFecha } from "./utils/fechas";
import AppLayout from "./components/Layout/AppLayout";

const formatUSD = (valor) => {
  if (valor === null || valor === undefined) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(valor);
};

const formatBRL = (valor) => {
  if (valor === null || valor === undefined) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 }).format(valor);
};

function CalculadoraVuelto({ usdVenta, brlPerUsd, formatearMoneda }) {
  const [moneda, setMoneda] = useState("USD");
  const [cobrar, setCobrar] = useState("");
  const [recibio, setRecibio] = useState("");

  const arsPerBrl = usdVenta / brlPerUsd;
  const tasaARS = moneda === "USD" ? usdVenta : arsPerBrl;

  const montoCobrarNum = parseFloat(cobrar) || 0;
  const montoRecibioNum = parseFloat(recibio) || 0;
  const diferencia = montoRecibioNum - montoCobrarNum;
  const vueltoARS = diferencia * tasaARS;

  const hayResultado = montoCobrarNum > 0 && montoRecibioNum > 0;
  const esVuelto = diferencia > 0;
  const esFalta = diferencia < 0;
  const esCuadrado = diferencia === 0;

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-5">
      <div className="flex items-center gap-2 mb-4">
        <span className="material-symbols-outlined text-blue-600 text-xl">calculate</span>
        <h3 className="text-sm font-semibold text-slate-700">Calculadora de vuelto en pesos</h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
        {/* Moneda */}
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Moneda</label>
          <div className="flex rounded-xl overflow-hidden border border-slate-300">
            <button
              onClick={() => setMoneda("USD")}
              className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
                moneda === "USD"
                  ? "bg-blue-600 text-white"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100"
              }`}
            >
              🇺🇸 USD
            </button>
            <button
              onClick={() => setMoneda("BRL")}
              className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
                moneda === "BRL"
                  ? "bg-green-600 text-white"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100"
              }`}
            >
              🇧🇷 BRL
            </button>
          </div>
        </div>

        {/* A cobrar */}
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">
            A cobrar ({moneda})
          </label>
          <input
            type="number"
            min="0"
            value={cobrar}
            onChange={(e) => setCobrar(e.target.value)}
            placeholder="Ej: 50"
            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Recibió */}
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">
            Recibió ({moneda})
          </label>
          <input
            type="number"
            min="0"
            value={recibio}
            onChange={(e) => setRecibio(e.target.value)}
            placeholder="Ej: 100"
            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Resultado */}
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Vuelto en pesos</label>
          {!hayResultado ? (
            <div className="w-full bg-slate-50 border border-dashed border-slate-300 rounded-xl px-4 py-2.5 text-slate-400 text-sm">
              Ingresá los montos
            </div>
          ) : esCuadrado ? (
            <div className="w-full bg-slate-100 border border-slate-300 rounded-xl px-4 py-2.5 text-slate-600 text-sm font-semibold">
              ✓ Exacto, sin vuelto
            </div>
          ) : esFalta ? (
            <div className="w-full bg-red-50 border border-red-300 rounded-xl px-4 py-2.5 text-red-700 text-sm font-bold">
              Falta {moneda === "USD" ? formatUSD(Math.abs(diferencia)) : formatBRL(Math.abs(diferencia))}
            </div>
          ) : (
            <div className="w-full bg-green-50 border border-green-300 rounded-xl px-4 py-2.5">
              <p className="text-xs text-green-600 leading-none mb-0.5">
                Vuelto ({moneda === "USD" ? formatUSD(diferencia) : formatBRL(diferencia)})
              </p>
              <p className="text-base font-bold text-green-700 leading-tight">
                {formatearMoneda(Math.round(vueltoARS))}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Reset */}
      {(cobrar || recibio) && (
        <button
          onClick={() => { setCobrar(""); setRecibio(""); }}
          className="mt-3 text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1 transition-colors"
        >
          <X className="w-3 h-3" /> Limpiar
        </button>
      )}
    </div>
  );
}

export default function ConfiguracionPrecios() {
  const navigate = useNavigate();
  const token = localStorage.getItem(TOKEN_KEY);
  const { success, error: errorToast } = useToast();
  
  const [userRole, setUserRole] = useState("");
  const [habitaciones, setHabitaciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const busquedaDebounced = useDebounce(busqueda, 300);
  const [tipoFiltro, setTipoFiltro] = useState("todos");
  const [fechaCheckin, setFechaCheckin] = useState("");
  const [fechaCheckout, setFechaCheckout] = useState("");
  const [editandoId, setEditandoId] = useState(null);
  const [mostrarConfiguracionMasiva, setMostrarConfiguracionMasiva] = useState(false);
  const [form, setForm] = useState({
    precio_minimo: "",
    precio_maximo: "",
    precio: ""
  });
  const [formMasivo, setFormMasivo] = useState({
    capacidad: "",
    precio_minimo: "",
    precio_maximo: ""
  });

  const [cotizaciones, setCotizaciones] = useState({
    usdVenta: null,
    brlPerUsd: null,
    loading: true,
    error: null,
    ultimaActualizacion: null
  });

  const fetchCotizaciones = useCallback(async () => {
    setCotizaciones(prev => ({ ...prev, loading: true, error: null }));
    try {
      const [usdRes, brlRes] = await Promise.all([
        axios.get("https://dolarapi.com/v1/dolares/oficial"),
        axios.get("https://open.er-api.com/v6/latest/USD")
      ]);
      setCotizaciones({
        usdVenta: usdRes.data.venta,
        brlPerUsd: brlRes.data.rates.BRL,
        loading: false,
        error: null,
        ultimaActualizacion: new Date()
      });
    } catch {
      setCotizaciones(prev => ({
        ...prev,
        loading: false,
        error: "No se pudo obtener el tipo de cambio"
      }));
    }
  }, []);

  const convertirUSD = (ars) => {
    if (!cotizaciones.usdVenta || !ars) return null;
    return Math.round(ars / cotizaciones.usdVenta);
  };

  const convertirBRL = (ars) => {
    if (!cotizaciones.usdVenta || !cotizaciones.brlPerUsd || !ars) return null;
    return Math.round((ars / cotizaciones.usdVenta) * cotizaciones.brlPerUsd);
  };

  // Obtener rol del usuario
  useEffect(() => {
    const rol = getUserRole();
    if (rol) setUserRole(rol);
  }, []);

  useEffect(() => {
    fetchCotizaciones();
  }, [fetchCotizaciones]);

  // Cargar habitaciones
  useEffect(() => {
    cargarHabitaciones();
  }, [fechaCheckin, fechaCheckout]);

  const cargarHabitaciones = async () => {
    setCargando(true);
    try {
      const params = {};
      if (fechaCheckin && fechaCheckout) {
        params.fecha_checkin = fechaCheckin;
        params.fecha_checkout = fechaCheckout;
      }
      
      const res = await axios.get(`${API_BASE_URL}/habitaciones`, {
        params,
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setHabitaciones(res.data);
    } catch (error) {
      console.error("Error al cargar habitaciones:", error);
      errorToast("Error al cargar las habitaciones");
    } finally {
      setCargando(false);
    }
  };

  const esDueño = userRole === "dueño";

  // Filtrar habitaciones
  const habitacionesFiltradas = habitaciones.filter(hab => {
    const coincideBusqueda = 
      hab.numero.toString().includes(busquedaDebounced) ||
      hab.tipo.toLowerCase().includes(busquedaDebounced.toLowerCase());
    const coincideTipo = tipoFiltro === "todos" || hab.tipo === tipoFiltro;
    return coincideBusqueda && coincideTipo;
  });

  // Obtener tipos únicos
  const tipos = [...new Set(habitaciones.map(h => h.tipo))];

  const formatearMoneda = (valor) => {
    if (!valor && valor !== 0) return "N/A";
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0
    }).format(valor);
  };

  const cargarParaEditar = (hab) => {
    setForm({
      precio_minimo: hab.precio_minimo || "",
      precio_maximo: hab.precio_maximo || "",
      precio: hab.precio || ""
    });
    setEditandoId(hab.id);
  };

  const cancelarEdicion = () => {
    setForm({ precio_minimo: "", precio_maximo: "", precio: "" });
    setEditandoId(null);
  };

  const guardarPrecios = async () => {
    if (!editandoId) return;

    const hab = habitaciones.find(h => h.id === editandoId);
    if (!hab) return;

    try {
      const precioMin = form.precio_minimo ? parseFloat(form.precio_minimo) : null;
      const precioMax = form.precio_maximo ? parseFloat(form.precio_maximo) : null;
      const precio = form.precio ? parseFloat(form.precio) : null;

      if (precioMin && precioMax && precioMin >= precioMax) {
        errorToast("El precio mínimo debe ser menor al precio máximo");
        return;
      }

      await axios.put(`${API_BASE_URL}/habitaciones/${editandoId}`, {
        numero: hab.numero,
        tipo: hab.tipo,
        precio: precio,
        precio_minimo: precioMin,
        precio_maximo: precioMax,
        capacidad: hab.capacidad,
        descripcion: hab.descripcion
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      success("Precios actualizados correctamente");
      cancelarEdicion();
      cargarHabitaciones();
    } catch (error) {
      console.error("Error al actualizar precios:", error);
      errorToast("Error al actualizar los precios");
    }
  };

  const aplicarPreciosPorCapacidad = async () => {
    if (!formMasivo.capacidad || !formMasivo.precio_minimo || !formMasivo.precio_maximo) {
      errorToast("Debes completar todos los campos");
      return;
    }

    const capacidad = parseInt(formMasivo.capacidad);
    const precioMin = parseFloat(formMasivo.precio_minimo);
    const precioMax = parseFloat(formMasivo.precio_maximo);

    if (isNaN(capacidad) || capacidad <= 0) {
      errorToast("La capacidad debe ser un número positivo");
      return;
    }

    if (isNaN(precioMin) || isNaN(precioMax) || precioMin <= 0 || precioMax <= 0) {
      errorToast("Los precios deben ser números positivos");
      return;
    }

    if (precioMin >= precioMax) {
      errorToast("El precio mínimo debe ser menor al precio máximo");
      return;
    }

    // Filtrar habitaciones con esa capacidad
    const habitacionesACambiar = habitaciones.filter(h => h.capacidad === capacidad);

    if (habitacionesACambiar.length === 0) {
      errorToast(`No hay habitaciones con capacidad de ${capacidad} personas`);
      return;
    }

    try {
      setCargando(true);
      let actualizadas = 0;
      let errores = 0;

      for (const hab of habitacionesACambiar) {
        try {
          await axios.put(`${API_BASE_URL}/habitaciones/${hab.id}`, {
            numero: hab.numero,
            tipo: hab.tipo,
            precio: hab.precio, // Mantener precio fijo si existe
            precio_minimo: precioMin,
            precio_maximo: precioMax,
            capacidad: hab.capacidad,
            descripcion: hab.descripcion
          }, {
            headers: { Authorization: `Bearer ${token}` }
          });
          actualizadas++;
        } catch (error) {
          console.error(`Error al actualizar habitación ${hab.numero}:`, error);
          errores++;
        }
      }

      if (actualizadas > 0) {
        success(`Precios actualizados para ${actualizadas} habitación${actualizadas > 1 ? 'es' : ''} de ${capacidad} personas`);
      }
      if (errores > 0) {
        errorToast(`Error al actualizar ${errores} habitación${errores > 1 ? 'es' : ''}`);
      }

      setFormMasivo({ capacidad: "", precio_minimo: "", precio_maximo: "" });
      setMostrarConfiguracionMasiva(false);
      cargarHabitaciones();
    } catch (error) {
      console.error("Error al aplicar precios:", error);
      errorToast("Error al aplicar los precios");
    } finally {
      setCargando(false);
    }
  };

  // Agrupar habitaciones por capacidad
  const habitacionesPorCapacidad = habitaciones.reduce((acc, hab) => {
    const capacidad = hab.capacidad || 2;
    if (!acc[capacidad]) {
      acc[capacidad] = [];
    }
    acc[capacidad].push(hab);
    return acc;
  }, {});

  const capacidadesDisponibles = Object.keys(habitacionesPorCapacidad)
    .map(Number)
    .sort((a, b) => a - b);

  const hoy = new Date().toISOString().split("T")[0];
  const mañana = new Date(Date.now() + 86400000).toISOString().split("T")[0];

  return (
    <AppLayout role="empleado" pageTitle="Lista de Precios">
      <div className="space-y-6 max-w-7xl mx-auto">

        {/* Configuración masiva por capacidad - Solo para dueño */}
        {esDueño && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-orange-600" />
                  Configuración Masiva por Capacidad
                </h2>
                <p className="text-sm text-slate-600 mt-1">
                  Configura rangos de precios para todas las habitaciones de una misma capacidad
                </p>
              </div>
              <button
                onClick={() => setMostrarConfiguracionMasiva(!mostrarConfiguracionMasiva)}
                className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl transition-all duration-200 flex items-center gap-2"
              >
                {mostrarConfiguracionMasiva ? (
                  <>
                    <X className="w-4 h-4" />
                    Ocultar
                  </>
                ) : (
                  <>
                    <Edit3 className="w-4 h-4" />
                    Configurar
                  </>
                )}
              </button>
            </div>

            {mostrarConfiguracionMasiva && (
              <div className="mt-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Capacidad (personas) *
                    </label>
                    <select
                      value={formMasivo.capacidad}
                      onChange={(e) => {
                        setFormMasivo({...formMasivo, capacidad: e.target.value});
                        // Auto-completar con valores existentes si hay habitaciones de esa capacidad
                        const capacidad = parseInt(e.target.value);
                        if (capacidad && habitacionesPorCapacidad[capacidad]) {
                          const habs = habitacionesPorCapacidad[capacidad];
                          const habConPrecio = habs.find(h => h.precio_minimo || h.precio_maximo);
                          if (habConPrecio) {
                            setFormMasivo({
                              ...formMasivo,
                              capacidad: e.target.value,
                              precio_minimo: habConPrecio.precio_minimo || "",
                              precio_maximo: habConPrecio.precio_maximo || ""
                            });
                          }
                        }
                      }}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="">Seleccionar capacidad</option>
                      {capacidadesDisponibles.map(cap => (
                        <option key={cap} value={cap}>
                          {cap} persona{cap > 1 ? 's' : ''} ({habitacionesPorCapacidad[cap].length} habitación{habitacionesPorCapacidad[cap].length > 1 ? 'es' : ''})
                        </option>
                      ))}
                    </select>
                    {formMasivo.capacidad && habitacionesPorCapacidad[parseInt(formMasivo.capacidad)] && (
                      <p className="text-xs text-slate-500 mt-1">
                        Habitaciones: {habitacionesPorCapacidad[parseInt(formMasivo.capacidad)].map(h => h.numero).join(", ")}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Precio Mínimo *
                    </label>
                    <input
                      type="number"
                      value={formMasivo.precio_minimo}
                      onChange={(e) => setFormMasivo({...formMasivo, precio_minimo: e.target.value})}
                      placeholder="Ej: 80000"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Precio Máximo *
                    </label>
                    <input
                      type="number"
                      value={formMasivo.precio_maximo}
                      onChange={(e) => setFormMasivo({...formMasivo, precio_maximo: e.target.value})}
                      placeholder="Ej: 120000"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>
                <button
                  onClick={aplicarPreciosPorCapacidad}
                  disabled={cargando}
                  className="w-full md:w-auto px-6 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl font-semibold hover:from-orange-600 hover:to-red-700 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Save className="w-5 h-5" />
                  Aplicar a todas las habitaciones de {formMasivo.capacidad ? `${formMasivo.capacidad} persona${parseInt(formMasivo.capacidad) > 1 ? 's' : ''}` : 'esta capacidad'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Selector de fechas para precios dinámicos */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-slate-200">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-orange-600" />
            <h2 className="text-lg font-semibold text-slate-800">Calcular Precios Dinámicos</h2>
          </div>
          <p className="text-sm text-slate-600 mb-4">
            Selecciona un rango de fechas para ver los precios calculados según la disponibilidad.
            Los precios aumentan cuando hay menos habitaciones disponibles.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Fecha Check-in
              </label>
              <input
                type="date"
                value={fechaCheckin}
                onChange={(e) => setFechaCheckin(e.target.value)}
                min={hoy}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Fecha Check-out
              </label>
              <input
                type="date"
                value={fechaCheckout}
                onChange={(e) => setFechaCheckout(e.target.value)}
                min={fechaCheckin || hoy}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  setFechaCheckin("");
                  setFechaCheckout("");
                }}
                className="w-full px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
              >
                <X className="w-4 h-4" />
                Limpiar fechas
              </button>
            </div>
          </div>
        </div>

        {/* Banner de cotizaciones */}
        <div className="bg-white rounded-2xl shadow-lg p-5 border border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-blue-600 text-xl">currency_exchange</span>
              <span className="text-sm font-semibold text-slate-700">Tipo de cambio oficial</span>
              {cotizaciones.ultimaActualizacion && (
                <span className="text-xs text-slate-400">
                  · actualizado {cotizaciones.ultimaActualizacion.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-4">
              {cotizaciones.loading ? (
                <span className="text-sm text-slate-400 animate-pulse">Obteniendo cotizaciones...</span>
              ) : cotizaciones.error ? (
                <span className="text-sm text-red-500">{cotizaciones.error}</span>
              ) : (
                <>
                  <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-4 py-2">
                    <span className="text-lg">🇺🇸</span>
                    <div>
                      <p className="text-xs text-slate-500 leading-none">USD Oficial</p>
                      <p className="text-sm font-bold text-blue-700">
                        1 USD = {new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 0 }).format(cotizaciones.usdVenta)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-2">
                    <span className="text-lg">🇧🇷</span>
                    <div>
                      <p className="text-xs text-slate-500 leading-none">BRL Oficial</p>
                      <p className="text-sm font-bold text-green-700">
                        1 BRL = {new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 0 }).format(cotizaciones.usdVenta / cotizaciones.brlPerUsd)}
                      </p>
                    </div>
                  </div>
                </>
              )}
              <button
                onClick={fetchCotizaciones}
                disabled={cotizaciones.loading}
                className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all duration-200 disabled:opacity-40"
                title="Actualizar cotizaciones"
              >
                <RefreshCw className={`w-4 h-4 ${cotizaciones.loading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Calculadora de vuelto */}
        {!cotizaciones.loading && !cotizaciones.error && (
          <CalculadoraVuelto
            usdVenta={cotizaciones.usdVenta}
            brlPerUsd={cotizaciones.brlPerUsd}
            formatearMoneda={formatearMoneda}
          />
        )}

        {/* Filtros */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-slate-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por número o tipo..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-12 pr-4 py-3 text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent placeholder-slate-400"
              />
            </div>
            <div>
              <select
                value={tipoFiltro}
                onChange={(e) => setTipoFiltro(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="todos">Todos los tipos</option>
                {tipos.map(tipo => (
                  <option key={tipo} value={tipo}>{tipo}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Lista de habitaciones */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-200">
            <h3 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
              <Home className="w-6 h-6 text-orange-600" />
              Habitaciones ({habitacionesFiltradas.length})
            </h3>
          </div>

          {cargando ? (
            <div className="p-8">
              <SkeletonTable rows={5} columns={6} />
            </div>
          ) : habitacionesFiltradas.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={Home}
                title="No se encontraron habitaciones"
                description="No hay habitaciones que coincidan con los filtros aplicados"
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-medium text-slate-700">Habitación</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-slate-700">Tipo</th>
                    <th className="px-6 py-4 text-right text-sm font-medium text-slate-700">Precio ARS</th>
                    <th className="px-6 py-4 text-right text-sm font-medium text-slate-700">
                      <span className="flex items-center justify-end gap-1">🇺🇸 USD</span>
                    </th>
                    <th className="px-6 py-4 text-right text-sm font-medium text-slate-700">
                      <span className="flex items-center justify-end gap-1">🇧🇷 BRL</span>
                    </th>
                    <th className="px-6 py-4 text-right text-sm font-medium text-slate-700">Rango de Precios</th>
                    <th className="px-6 py-4 text-center text-sm font-medium text-slate-700">Capacidad</th>
                    {esDueño && (
                      <th className="px-6 py-4 text-center text-sm font-medium text-slate-700">Acciones</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {habitacionesFiltradas.map((hab) => {
                    const tieneRango = hab.precio_minimo && hab.precio_maximo;
                    const precioActual = hab.precio || 0;
                    const precioMin = hab.precio_minimo || 0;
                    const precioMax = hab.precio_maximo || 0;
                    const precioEnRango = tieneRango && precioActual >= precioMin && precioActual <= precioMax;
                    
                    return (
                      <tr key={hab.id} className="hover:bg-slate-50 transition-colors duration-200">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Home className="w-5 h-5 text-orange-500" />
                            <span className="font-medium text-slate-900">
                              Habitación {hab.numero}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                            {hab.tipo}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {fechaCheckin && fechaCheckout && tieneRango && (
                              precioActual > precioMin ? (
                                <TrendingUp className="w-4 h-4 text-red-500" />
                              ) : (
                                <TrendingDown className="w-4 h-4 text-green-500" />
                              )
                            )}
                            <span className="text-lg font-bold text-green-600">
                              {formatearMoneda(precioActual)}
                            </span>
                          </div>
                          {fechaCheckin && fechaCheckout && tieneRango && (
                            <p className="text-xs text-slate-500 mt-1">
                              {precioEnRango ? "Precio dinámico calculado" : "Precio fijo"}
                            </p>
                          )}
                        </td>
                        {/* USD */}
                        <td className="px-6 py-4 text-right">
                          {cotizaciones.loading ? (
                            <span className="text-xs text-slate-400 animate-pulse">...</span>
                          ) : (
                            <span className="text-sm font-semibold text-blue-600">
                              {formatUSD(convertirUSD(precioActual))}
                            </span>
                          )}
                        </td>
                        {/* BRL */}
                        <td className="px-6 py-4 text-right">
                          {cotizaciones.loading ? (
                            <span className="text-xs text-slate-400 animate-pulse">...</span>
                          ) : (
                            <span className="text-sm font-semibold text-green-700">
                              {formatBRL(convertirBRL(precioActual))}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          {tieneRango ? (
                            <div>
                              <div className="text-sm text-slate-700">
                                <span className="text-green-600">{formatearMoneda(precioMin)}</span>
                                <span className="mx-2 text-slate-400">-</span>
                                <span className="text-red-600">{formatearMoneda(precioMax)}</span>
                              </div>
                              <div className="w-full bg-slate-200 rounded-full h-2 mt-2">
                                <div 
                                  className="bg-gradient-to-r from-green-500 to-red-500 h-2 rounded-full"
                                  style={{ width: '100%' }}
                                ></div>
                              </div>
                            </div>
                          ) : (
                            <span className="text-sm text-slate-400 italic">Sin rango configurado</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="text-sm text-slate-700">
                            {hab.capacidad || 2} personas
                          </span>
                        </td>
                        {esDueño && (
                          <td className="px-6 py-4">
                            {editandoId === hab.id ? (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={guardarPrecios}
                                  className="p-2 text-green-600 hover:text-green-800 hover:bg-green-100 rounded-lg transition-all duration-200"
                                  title="Guardar"
                                >
                                  <Save className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={cancelarEdicion}
                                  className="p-2 text-red-600 hover:text-red-800 hover:bg-red-100 rounded-lg transition-all duration-200"
                                  title="Cancelar"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => cargarParaEditar(hab)}
                                className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-lg transition-all duration-200"
                                title="Editar precios"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal de edición para dueño */}
        {esDueño && editandoId && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
              <h3 className="text-xl font-bold text-slate-800 mb-4">
                Editar Precios - Habitación {habitaciones.find(h => h.id === editandoId)?.numero}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Precio Fijo (opcional)
                  </label>
                  <input
                    type="number"
                    value={form.precio}
                    onChange={(e) => setForm({...form, precio: e.target.value})}
                    placeholder="Precio fijo si no hay rango"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Precio Mínimo *
                  </label>
                  <input
                    type="number"
                    value={form.precio_minimo}
                    onChange={(e) => setForm({...form, precio_minimo: e.target.value})}
                    placeholder="Precio cuando hay mucha disponibilidad"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Precio Máximo *
                  </label>
                  <input
                    type="number"
                    value={form.precio_maximo}
                    onChange={(e) => setForm({...form, precio_maximo: e.target.value})}
                    placeholder="Precio cuando hay poca disponibilidad"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <p className="text-sm text-blue-800">
                    <strong>💡 Cómo funciona:</strong> El sistema calculará automáticamente el precio entre el mínimo y máximo según la disponibilidad. Menos habitaciones disponibles = precio más alto.
                  </p>
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={guardarPrecios}
                  className="flex-1 bg-gradient-to-r from-orange-500 to-red-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-orange-600 hover:to-red-700 transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <Save className="w-5 h-5" />
                  Guardar Precios
                </button>
                <button
                  onClick={cancelarEdicion}
                  className="px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 transition-all duration-200"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
