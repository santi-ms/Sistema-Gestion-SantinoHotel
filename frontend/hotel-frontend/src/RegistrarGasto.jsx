import { useState, useEffect, useMemo, useRef } from "react";
import axios from "axios";
import { API_BASE_URL, TOKEN_KEY } from "./config";
import { getUserRole } from "./hooks/useAuth";
import { useToast } from "./components/ToastContainer";
import ConfirmModal from "./components/ConfirmModal";
import { EmptyState } from "./components/EmptyState";
import { formatARS } from "./utils/moneda";
import {
  formatearSoloHora,
  formatearSoloFecha,
  obtenerHoyArgentinaISO,
} from "./utils/fechas";
import {
  Receipt,
  DollarSign,
  Home,
  Save,
  Edit3,
  Trash2,
  XCircle,
  TrendingDown,
  FileText,
  Filter,
  Tag,
  CreditCard,
  PieChart,
  Camera,
  ScanLine,
  Loader2,
} from "lucide-react";
import AppLayout from "./components/Layout/AppLayout";

// Mismas claves que CATEGORIAS_GASTO en el backend; acá sólo se les pone
// nombre para mostrar.
const CATEGORIAS = [
  { valor: "proveedores", nombre: "Proveedores" },
  { valor: "sueldos", nombre: "Sueldos" },
  { valor: "servicios", nombre: "Servicios" },
  { valor: "mantenimiento", nombre: "Mantenimiento" },
  { valor: "insumos", nombre: "Insumos" },
  { valor: "impuestos", nombre: "Impuestos" },
  { valor: "otros", nombre: "Otros" },
];

const FORMAS_PAGO = ["Efectivo", "Transferencia", "Débito", "Crédito", "Cheque"];

const COLOR_CATEGORIA = {
  proveedores: "bg-blue-50 text-blue-700 border-blue-200",
  sueldos: "bg-purple-50 text-purple-700 border-purple-200",
  servicios: "bg-amber-50 text-amber-700 border-amber-200",
  mantenimiento: "bg-orange-50 text-orange-700 border-orange-200",
  insumos: "bg-teal-50 text-teal-700 border-teal-200",
  impuestos: "bg-rose-50 text-rose-700 border-rose-200",
  otros: "bg-slate-50 text-slate-600 border-slate-200",
};

const nombreCategoria = (valor) =>
  CATEGORIAS.find((c) => c.valor === valor)?.nombre || "Otros";

/** Primer día del mes de una fecha YYYY-MM-DD. */
const primerDiaDelMes = (iso) => `${iso.slice(0, 7)}-01`;

/** Último día del mes de una fecha YYYY-MM-DD. */
const ultimoDiaDelMes = (iso) => {
  const [anio, mes] = iso.split("-").map(Number);
  const dia = new Date(anio, mes, 0).getDate();
  return `${iso.slice(0, 7)}-${String(dia).padStart(2, "0")}`;
};

const FORM_VACIO = {
  habitacion_id: "",
  descripcion: "",
  monto: "",
  categoria: "proveedores",
  forma_pago: "Efectivo",
};

export default function RegistrarGasto() {
  const hoy = obtenerHoyArgentinaISO();

  const [form, setForm] = useState(FORM_VACIO);
  const [gastos, setGastos] = useState([]);
  const [resumen, setResumen] = useState({ cantidad: 0, total: 0, por_categoria: [] });
  const [editandoId, setEditandoId] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [foto, setFoto] = useState(null);
  const [vistaFoto, setVistaFoto] = useState("");
  const [escaneando, setEscaneando] = useState(false);
  const [lectura, setLectura] = useState(null);
  const [errorEscaneo, setErrorEscaneo] = useState("");
  const archivoRef = useRef(null);
  const escaneoRef = useRef(null);
  const [mostrarConfirmEliminar, setMostrarConfirmEliminar] = useState(false);
  const [gastoAEliminar, setGastoAEliminar] = useState(null);
  const [userRole, setUserRole] = useState("");

  // Arranca mostrando el mes en curso: antes la pantalla sólo mostraba el día
  // actual y no había forma de consultar un período anterior.
  const [desde, setDesde] = useState(primerDiaDelMes(hoy));
  const [hasta, setHasta] = useState(ultimoDiaDelMes(hoy));
  const [filtroCategoria, setFiltroCategoria] = useState("");

  const { success, error: errorToast } = useToast();
  const token = localStorage.getItem(TOKEN_KEY);
  const esDueño = userRole === "dueño";

  useEffect(() => {
    if (!foto) { setVistaFoto(""); return; }
    const url = URL.createObjectURL(foto);
    setVistaFoto(url);
    return () => URL.revokeObjectURL(url);
  }, [foto]);

  useEffect(() => () => escaneoRef.current?.abort(), []);

  const limpiarEscaneo = () => {
    escaneoRef.current?.abort();
    escaneoRef.current = null;
    setEscaneando(false);
    setFoto(null);
    setLectura(null);
    setErrorEscaneo("");
    if (archivoRef.current) archivoRef.current.value = "";
  };

  const seleccionarFoto = (event) => {
    const archivo = event.target.files?.[0];
    limpiarEscaneo();
    if (!archivo) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(archivo.type)) {
      setErrorEscaneo("Elegí una foto JPG, PNG o WebP.");
      return;
    }
    if (archivo.size > 10 * 1024 * 1024) {
      setErrorEscaneo("La foto debe pesar como máximo 10 MB.");
      return;
    }
    setFoto(archivo);
  };

  const escanearFoto = async () => {
    if (!foto || escaneando) return;
    const controller = new AbortController();
    escaneoRef.current = controller;
    setEscaneando(true);
    setLectura(null);
    setErrorEscaneo("");
    try {
      const payload = new FormData();
      payload.append("archivo", foto);
      const { data } = await axios.post(`${API_BASE_URL}/gastos/escanear`, payload, {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
        timeout: 60000,
      });
      if (!controller.signal.aborted) setLectura(data);
    } catch (err) {
      if (!controller.signal.aborted) {
        setErrorEscaneo(err.response?.data?.detail || "No se pudo leer la foto. Volvé a intentar o cargá los datos manualmente.");
      }
    } finally {
      if (escaneoRef.current === controller) {
        setEscaneando(false);
        escaneoRef.current = null;
      }
    }
  };

  const aplicarLectura = () => {
    if (!lectura) return;
    setForm((actual) => ({
      ...actual,
      descripcion: lectura.descripcion || "",
      monto: lectura.monto == null ? "" : String(lectura.monto),
      categoria: lectura.categoria || "otros",
      forma_pago: lectura.forma_pago || "",
    }));
    limpiarEscaneo();
    success("Datos completados. Revisalos antes de registrar el gasto.");
  };

  useEffect(() => {
    const rol = getUserRole();
    if (rol) setUserRole(rol);
  }, []);

  const obtenerGastos = async () => {
    setCargando(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/gastos`, {
        params: { desde, hasta, categoria: filtroCategoria || undefined },
        headers: { Authorization: `Bearer ${token}` },
      });
      setGastos(res.data.gastos || []);
      setResumen(res.data.resumen || { cantidad: 0, total: 0, por_categoria: [] });
    } catch (err) {
      console.error("Error al obtener gastos", err);
      errorToast("No se pudieron cargar los gastos");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    obtenerGastos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [desde, hasta, filtroCategoria]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((actual) => ({ ...actual, [name]: value }));
  };

  const handleSubmit = async () => {
    if (!form.descripcion.trim() || !form.monto) {
      errorToast("La descripción y el monto son obligatorios");
      return;
    }
    const montoNum = parseFloat(form.monto);
    if (isNaN(montoNum) || montoNum <= 0) {
      errorToast("El monto debe ser un número positivo");
      return;
    }

    setGuardando(true);
    const payload = {
      descripcion: form.descripcion.trim(),
      monto: montoNum,
      categoria: form.categoria,
      forma_pago: form.forma_pago || null,
      habitacion_id: form.habitacion_id.trim() !== "" ? parseInt(form.habitacion_id) : null,
    };

    try {
      if (editandoId) {
        await axios.put(`${API_BASE_URL}/gastos/${editandoId}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        success("Gasto actualizado");
      } else {
        await axios.post(`${API_BASE_URL}/gastos`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        success("Gasto registrado");
      }
      setForm(FORM_VACIO);
      setEditandoId(null);
      limpiarEscaneo();
      obtenerGastos();
    } catch (err) {
      errorToast(err.response?.data?.detail || "No se pudo guardar el gasto");
    } finally {
      setGuardando(false);
    }
  };

  const cargarParaEditar = (gasto) => {
    limpiarEscaneo();
    setForm({
      habitacion_id: gasto.habitacion_id ? String(gasto.habitacion_id) : "",
      descripcion: gasto.descripcion,
      monto: String(gasto.monto),
      categoria: gasto.categoria || "otros",
      forma_pago: gasto.forma_pago || "",
    });
    setEditandoId(gasto.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelarEdicion = () => {
    limpiarEscaneo();
    setForm(FORM_VACIO);
    setEditandoId(null);
  };

  const borrarGasto = async () => {
    try {
      await axios.delete(`${API_BASE_URL}/gastos/${gastoAEliminar}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      success("Gasto eliminado");
      setMostrarConfirmEliminar(false);
      obtenerGastos();
    } catch {
      errorToast("No se pudo eliminar el gasto");
    }
  };

  const aplicarAtajo = (tipo) => {
    if (tipo === "hoy") {
      setDesde(hoy);
      setHasta(hoy);
    } else if (tipo === "mes") {
      setDesde(primerDiaDelMes(hoy));
      setHasta(ultimoDiaDelMes(hoy));
    } else if (tipo === "mesPasado") {
      const [anio, mes] = hoy.split("-").map(Number);
      const previo = new Date(anio, mes - 2, 1);
      const iso = `${previo.getFullYear()}-${String(previo.getMonth() + 1).padStart(2, "0")}-01`;
      setDesde(iso);
      setHasta(ultimoDiaDelMes(iso));
    }
  };

  const promedio = useMemo(
    () => (resumen.cantidad > 0 ? resumen.total / resumen.cantidad : 0),
    [resumen]
  );

  const mayorCategoria = resumen.por_categoria?.[0];

  const inputBase =
    "w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-slate-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent";

  return (
    <AppLayout role="empleado" pageTitle={editandoId ? "Editar gasto" : "Gastos"}>
      <div className="space-y-6 max-w-7xl mx-auto">

        {/* ── Formulario ── */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200">
          {editandoId && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 flex items-center gap-2 text-blue-700">
              <Edit3 className="w-5 h-5" />
              <span className="font-medium">Editando gasto #{editandoId}</span>
            </div>
          )}

          {!editandoId && (
            <section className="mb-6 rounded-xl border border-red-100 bg-red-50/50 p-4" aria-labelledby="titulo-escaner">
              <h3 id="titulo-escaner" className="flex items-center gap-2 font-semibold text-slate-800">
                <ScanLine className="w-5 h-5 text-red-600" /> Cargar desde una foto
              </h3>
              <p className="mt-1 text-sm text-slate-600">Subí un ticket, factura o recibo y la IA te ayuda a completar el gasto.</p>
              <p className="mt-1 text-xs text-slate-500">La foto se envía a Anthropic Claude para leerla. No se guarda como adjunto al gasto. JPG, PNG o WebP, hasta 10 MB.</p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <label className={`inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 focus-within:ring-2 focus-within:ring-red-500 ${escaneando || guardando ? "opacity-60" : "cursor-pointer hover:bg-slate-50"}`}>
                  <Camera className="h-4 w-4" /> {foto ? "Cambiar foto" : "Elegir o tomar foto"}
                  <input ref={archivoRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={seleccionarFoto} disabled={escaneando || guardando} className="sr-only" />
                </label>
                {foto && (
                  <>
                    <button type="button" onClick={escanearFoto} disabled={escaneando || guardando} className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60">
                      {escaneando ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanLine className="h-4 w-4" />}
                      {escaneando ? "Leyendo comprobante…" : "Escanear con IA"}
                    </button>
                    <button type="button" onClick={limpiarEscaneo} disabled={guardando} className="text-sm text-slate-600 underline">{escaneando ? "Cancelar lectura" : "Quitar foto"}</button>
                  </>
                )}
              </div>
              {vistaFoto && <img src={vistaFoto} alt="Comprobante seleccionado" className="mt-4 max-h-48 max-w-full rounded-lg border border-slate-200 object-contain" />}
              {errorEscaneo && <p role="alert" className="mt-3 text-sm text-red-700">{errorEscaneo}</p>}
              {lectura && (
                <div role="status" className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
                  <p className="font-medium text-slate-800">Revisá los datos detectados</p>
                  <dl className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
                    <div><dt className="text-slate-500">Descripción</dt><dd>{lectura.descripcion || "Sin identificar"}</dd></div>
                    <div><dt className="text-slate-500">Monto en pesos</dt><dd>{lectura.monto == null ? "A completar" : formatARS(lectura.monto)}</dd></div>
                    <div><dt className="text-slate-500">Categoría sugerida</dt><dd>{lectura.categoria ? nombreCategoria(lectura.categoria) : "Sin identificar"}</dd></div>
                    <div><dt className="text-slate-500">Forma de pago</dt><dd>{lectura.forma_pago || "Sin identificar"}</dd></div>
                  </dl>
                  {lectura.advertencias?.length > 0 && <ul className="mt-3 list-inside list-disc text-sm text-amber-800">{lectura.advertencias.map((aviso, i) => <li key={i}>{aviso}</li>)}</ul>}
                  <p className="mt-3 text-xs text-slate-500">La IA puede equivocarse. Al usar estos datos se reemplazan los campos del formulario; después podés corregirlos. El gasto se registra con la fecha de hoy.</p>
                  <button type="button" onClick={aplicarLectura} disabled={guardando} className="mt-3 rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white disabled:opacity-60">Usar estos datos</button>
                </div>
              )}
            </section>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Descripción
              </label>
              <div className="relative">
                <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  id="gasto-descripcion"
                  type="text"
                  name="descripcion"
                  placeholder="Ej: Compra de bebidas al proveedor"
                  value={form.descripcion}
                  onChange={handleChange}
                  className={`${inputBase} pl-12`}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Monto</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  id="gasto-monto"
                  type="number"
                  name="monto"
                  placeholder="0"
                  value={form.monto}
                  onChange={handleChange}
                  className={`${inputBase} pl-12`}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Categoría</label>
              <div className="relative">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <select
                  id="gasto-categoria"
                  name="categoria"
                  value={form.categoria}
                  onChange={handleChange}
                  className={`${inputBase} pl-12`}
                >
                  {CATEGORIAS.map((c) => (
                    <option key={c.valor} value={c.valor}>{c.nombre}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Forma de pago
              </label>
              <div className="relative">
                <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <select
                  id="gasto-forma-pago"
                  name="forma_pago"
                  value={form.forma_pago}
                  onChange={handleChange}
                  className={`${inputBase} pl-12`}
                >
                  <option value="">Sin especificar</option>
                  {FORMAS_PAGO.map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Habitación <span className="text-slate-400 text-xs">(opcional)</span>
              </label>
              <div className="relative">
                <Home className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  id="gasto-habitacion"
                  type="number"
                  name="habitacion_id"
                  placeholder="Solo si el gasto es de una habitación en particular"
                  value={form.habitacion_id}
                  onChange={handleChange}
                  className={`${inputBase} pl-12`}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 mt-6">
            <button
              onClick={handleSubmit}
              disabled={guardando || escaneando}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-medium px-6 py-3 rounded-xl transition-colors"
            >
              <Save className="w-5 h-5" />
              {editandoId ? "Guardar cambios" : "Registrar gasto"}
            </button>
            {editandoId && (
              <button
                onClick={cancelarEdicion}
                className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium px-6 py-3 rounded-xl transition-colors"
              >
                <XCircle className="w-5 h-5" />
                Cancelar
              </button>
            )}
          </div>
        </div>

        {/* ── Filtros ── */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-red-600" />
            Filtros
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Desde</label>
              <input
                id="gasto-desde"
                type="date"
                value={desde}
                max={hasta || undefined}
                onChange={(e) => setDesde(e.target.value)}
                className={inputBase}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Hasta</label>
              <input
                id="gasto-hasta"
                type="date"
                value={hasta}
                min={desde || undefined}
                onChange={(e) => setHasta(e.target.value)}
                className={inputBase}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Categoría</label>
              <select
                id="gasto-filtro-categoria"
                value={filtroCategoria}
                onChange={(e) => setFiltroCategoria(e.target.value)}
                className={inputBase}
              >
                <option value="">Todas</option>
                {CATEGORIAS.map((c) => (
                  <option key={c.valor} value={c.valor}>{c.nombre}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-4">
            {[
              { id: "hoy", texto: "Hoy" },
              { id: "mes", texto: "Este mes" },
              { id: "mesPasado", texto: "Mes pasado" },
            ].map((a) => (
              <button
                key={a.id}
                onClick={() => aplicarAtajo(a.id)}
                className="px-3 py-1.5 text-xs font-medium bg-red-50 text-red-700 hover:bg-red-100 rounded-lg border border-red-200 transition-colors"
              >
                {a.texto}
              </button>
            ))}
          </div>
        </div>

        {/* ── Resumen del período (sólo el dueño, como era antes) ── */}
        {esDueño && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl shadow-lg p-5 border border-slate-200">
            <div className="flex items-center gap-3">
              <TrendingDown className="w-8 h-8 text-red-600" />
              <div>
                <p className="text-sm text-slate-600 font-medium">Total del período</p>
                <p className="text-2xl font-bold text-red-700">{formatARS(resumen.total)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-5 border border-slate-200">
            <div className="flex items-center gap-3">
              <Receipt className="w-8 h-8 text-slate-500" />
              <div>
                <p className="text-sm text-slate-600 font-medium">Gastos registrados</p>
                <p className="text-2xl font-bold text-slate-800">{resumen.cantidad}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Promedio {formatARS(promedio)}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-5 border border-slate-200">
            <div className="flex items-center gap-3">
              <PieChart className="w-8 h-8 text-amber-600" />
              <div>
                <p className="text-sm text-slate-600 font-medium">Mayor categoría</p>
                {mayorCategoria ? (
                  <>
                    <p className="text-2xl font-bold text-slate-800">
                      {nombreCategoria(mayorCategoria.categoria)}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {formatARS(mayorCategoria.monto)}
                    </p>
                  </>
                ) : (
                  <p className="text-2xl font-bold text-slate-400">—</p>
                )}
              </div>
            </div>
          </div>
        </div>
        )}

        {/* ── En qué se fue la plata ── */}
        {esDueño && resumen.por_categoria?.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Por categoría</h3>
            <div className="space-y-3">
              {resumen.por_categoria.map((c) => {
                const porcentaje = resumen.total > 0 ? (c.monto / resumen.total) * 100 : 0;
                return (
                  <div key={c.categoria}>
                    <div className="flex items-baseline justify-between mb-1 gap-3">
                      <span className="text-sm font-medium text-slate-700">
                        {nombreCategoria(c.categoria)}
                      </span>
                      <span className="text-sm text-slate-600 tabular-nums whitespace-nowrap">
                        {formatARS(c.monto)}
                        <span className="text-slate-400 ml-2">{porcentaje.toFixed(0)}%</span>
                      </span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-red-500 rounded-full"
                        style={{ width: `${porcentaje}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Listado ── */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-200">
            <h3 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
              <Receipt className="w-6 h-6 text-red-600" />
              Gastos ({resumen.cantidad})
            </h3>
            <p className="text-sm text-slate-600 mt-1">
              Del {formatearSoloFecha(`${desde}T12:00:00`)} al{" "}
              {formatearSoloFecha(`${hasta}T12:00:00`)}
            </p>
          </div>

          {cargando ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-4"></div>
              <p className="text-slate-600">Cargando gastos...</p>
            </div>
          ) : gastos.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="No hay gastos en este período"
              description="Probá ampliar el rango de fechas o quitar el filtro de categoría"
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-medium text-slate-700">Fecha</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-slate-700">Categoría</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-slate-700">Descripción</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-slate-700">Pago</th>
                    <th className="px-6 py-4 text-right text-sm font-medium text-slate-700">Monto</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-slate-700">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {gastos.map((gasto) => (
                    <tr key={gasto.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-slate-700">
                          {formatearSoloFecha(gasto.fecha)}
                        </div>
                        <div className="text-xs text-slate-500">
                          {formatearSoloHora(gasto.fecha)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-lg text-xs font-medium border ${
                            COLOR_CATEGORIA[gasto.categoria] || COLOR_CATEGORIA.otros
                          }`}
                        >
                          {nombreCategoria(gasto.categoria)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-slate-900 max-w-xs">
                          {gasto.descripcion}
                        </div>
                        {gasto.habitacion_id && (
                          <div className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                            <Home className="w-3 h-3" />
                            Habitación {gasto.habitacion_id}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-slate-600">
                          {gasto.forma_pago || <span className="text-slate-400">—</span>}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-sm font-semibold text-red-600 tabular-nums whitespace-nowrap">
                          −{formatARS(gasto.monto)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => cargarParaEditar(gasto)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Editar gasto"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setGastoAEliminar(gasto.id);
                              setMostrarConfirmEliminar(true);
                            }}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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

      <ConfirmModal
        isOpen={mostrarConfirmEliminar}
        onClose={() => setMostrarConfirmEliminar(false)}
        onConfirm={borrarGasto}
        title="Eliminar gasto"
        message="¿Seguro que querés eliminar este gasto? No se puede deshacer."
        confirmText="Eliminar"
        cancelText="Cancelar"
        type="danger"
      />
    </AppLayout>
  );
}
