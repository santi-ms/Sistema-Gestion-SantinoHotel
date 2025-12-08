import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL, TOKEN_KEY } from "./config";
import { useToast } from "./components/ToastContainer";
import {
  Package,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
  ArrowLeft,
  RefreshCw,
  ShoppingCart,
  XCircle,
  CheckCircle
} from "lucide-react";

export default function DashboardStock() {
  const [estadisticas, setEstadisticas] = useState(null);
  const [cargando, setCargando] = useState(true);
  const { error: errorToast } = useToast();
  const navigate = useNavigate();

  const token = localStorage.getItem(TOKEN_KEY);

  const cargarEstadisticas = async () => {
    setCargando(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/stock/estadisticas`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEstadisticas(res.data);
    } catch (err) {
      console.error("Error al cargar estadísticas:", err);
      errorToast("Error al cargar estadísticas de stock");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarEstadisticas();
  }, []);

  if (cargando) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Cargando estadísticas...</p>
        </div>
      </div>
    );
  }

  if (!estadisticas) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-slate-200">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-3 rounded-xl">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-800">Dashboard de Stock</h1>
                <p className="text-slate-600">Estadísticas y análisis del inventario</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={cargarEstadisticas}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl font-medium transition-colors flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Actualizar
              </button>
              <button
                onClick={() => navigate(-1)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl font-medium transition-colors flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Volver
              </button>
            </div>
          </div>
        </div>

        {/* Resumen General */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6 border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-3 rounded-lg">
                <Package className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600 font-medium">Total Productos</p>
                <p className="text-2xl font-bold text-slate-800">{estadisticas.resumen.total_productos}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="bg-green-100 p-3 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600 font-medium">En Stock</p>
                <p className="text-2xl font-bold text-green-700">{estadisticas.resumen.productos_en_stock}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="bg-yellow-100 p-3 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600 font-medium">Stock Bajo</p>
                <p className="text-2xl font-bold text-yellow-700">{estadisticas.resumen.productos_bajo_minimo}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="bg-red-100 p-3 rounded-lg">
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600 font-medium">Agotados</p>
                <p className="text-2xl font-bold text-red-700">{estadisticas.resumen.productos_agotados}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Productos Agotados */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200">
            <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-600" />
              Productos Agotados
            </h3>
            {estadisticas.productos_agotados.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 text-green-300 mx-auto mb-2" />
                <p className="text-slate-600">No hay productos agotados</p>
              </div>
            ) : (
              <div className="space-y-2">
                {estadisticas.productos_agotados.map((producto) => (
                  <div
                    key={producto.id}
                    className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between"
                  >
                    <div>
                      <p className="font-medium text-slate-800">{producto.nombre_producto}</p>
                      <p className="text-sm text-slate-600 capitalize">{producto.categoria}</p>
                    </div>
                    <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                      Agotado
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Productos con Stock Bajo */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200">
            <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
              Stock Bajo (Alerta)
            </h3>
            {estadisticas.productos_bajo_minimo.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 text-green-300 mx-auto mb-2" />
                <p className="text-slate-600">No hay productos con stock bajo</p>
              </div>
            ) : (
              <div className="space-y-2">
                {estadisticas.productos_bajo_minimo.map((producto) => (
                  <div
                    key={producto.id}
                    className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-medium text-slate-800">{producto.nombre_producto}</p>
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                        Stock bajo
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-600">
                      <span>Actual: {producto.cantidad}</span>
                      <span>Mínimo: {producto.cantidad_minima}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Productos Más Vendidos */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200 mb-8">
          <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            Productos Más Vendidos (Últimos 30 días)
          </h3>
          {estadisticas.productos_mas_vendidos.length === 0 ? (
            <div className="text-center py-8">
              <ShoppingCart className="w-12 h-12 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-600">No hay datos de ventas disponibles</p>
            </div>
          ) : (
            <div className="space-y-3">
              {estadisticas.productos_mas_vendidos.map((producto, index) => (
                <div
                  key={index}
                  className="p-4 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-bold">#{index + 1}</span>
                    </div>
                    <div>
                      <p className="font-medium text-slate-800">{producto.nombre_producto}</p>
                      <p className="text-sm text-slate-600">
                        Stock actual: {producto.stock_actual} unidades
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-green-600">{producto.cantidad_vendida}</p>
                    <p className="text-xs text-slate-500">unidades vendidas</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Estadísticas por Categoría */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200">
          <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
            <PieChart className="w-5 h-5 text-purple-600" />
            Estadísticas por Categoría
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-semibold text-blue-800 mb-3">Bebidas</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-600">Total:</span>
                  <span className="font-medium">{estadisticas.por_categoria.bebidas.total}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">En stock:</span>
                  <span className="font-medium text-green-600">
                    {estadisticas.por_categoria.bebidas.en_stock}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Agotados:</span>
                  <span className="font-medium text-red-600">
                    {estadisticas.por_categoria.bebidas.agotados}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <h4 className="font-semibold text-orange-800 mb-3">Comidas</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-600">Total:</span>
                  <span className="font-medium">{estadisticas.por_categoria.comidas.total}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">En stock:</span>
                  <span className="font-medium text-green-600">
                    {estadisticas.por_categoria.comidas.en_stock}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Agotados:</span>
                  <span className="font-medium text-red-600">
                    {estadisticas.por_categoria.comidas.agotados}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

