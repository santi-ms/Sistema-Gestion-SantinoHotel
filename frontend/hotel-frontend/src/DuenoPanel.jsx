import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL, TOKEN_KEY } from './config';
import AppLayout from './components/Layout/AppLayout';
import { useToast } from './components/ToastContainer';
import { formatARS } from './utils/moneda';

const actionButtons = [
  { title: "Ver Analytics",       description: "Reportes y gráficos de rendimiento", icon: "bar_chart",         path: "/analytics" },
  { title: "Configurar Precios",  description: "Gestionar tarifas de habitaciones",  icon: "sell",              path: "/configuracion-precios" },
  { title: "Ver Reservas",        description: "Gestionar reservas del hotel",        icon: "event_note",        path: "/ver-reservas" },
  { title: "Ver Pedidos",         description: "Pedidos del restobar y room service", icon: "local_cafe",        path: "/ver-pedidos" },
  { title: "Registrar Gasto",     description: "Controlar gastos operativos",         icon: "payments",          path: "/registrar-gasto" },
  { title: "Actividades",         description: "Gestionar tareas del hotel",          icon: "local_activity",    path: "/actividades" },
  { title: "Control de Stock",    description: "Inventario de bebidas y productos",   icon: "inventory_2",       path: "/stock" },
  { title: "Dashboard de Stock",  description: "Estadísticas del inventario",         icon: "bar_chart",         path: "/dashboard-stock" },
  { title: "Habitaciones",        description: "Gestionar habitaciones del hotel",    icon: "bed",               path: "/agregar-habitacion" },
  { title: "Clientes",            description: "Base de datos de clientes",           icon: "people",            path: "/registrar-cliente" },
];

export default function DuenoPanel() {
  const navigate = useNavigate();
  const { error: errorToast } = useToast();
  const [resumen, setResumen] = useState({ total_reservas: 0, total_pedidos: 0, total_gastos: 0, balance: 0 });
  const [fecha, setFecha] = useState(new Date().toLocaleDateString('fr-CA'));
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const obtenerResumen = async () => {
      const token = localStorage.getItem(TOKEN_KEY);
      try {
        const res = await axios.get(`${API_BASE_URL}/resumen-dia?fecha=${fecha}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setResumen(res.data);
      } catch (err) {
        console.error("Error al obtener resumen:", err);
        errorToast("No se pudo cargar el resumen del día");
      } finally {
        setCargando(false);
      }
    };
    obtenerResumen();
  }, [fecha]);

  const fmt = formatARS;

  const statsCards = [
    { title: "Ingresos Reservas",  value: resumen.total_reservas, icon: "bed",          color: "text-blue-600",   bg: "bg-blue-50" },
    { title: "Ingresos Restobar",  value: resumen.total_pedidos,  icon: "local_cafe",   color: "text-violet-600", bg: "bg-violet-50" },
    { title: "Gastos Operativos",  value: resumen.total_gastos,   icon: "payments",     color: "text-red-600",    bg: "bg-red-50" },
    {
      title: "Balance del Día",
      value: resumen.balance,
      icon: resumen.balance >= 0 ? "trending_up" : "trending_down",
      color: resumen.balance >= 0 ? "text-emerald-600" : "text-red-600",
      bg:    resumen.balance >= 0 ? "bg-emerald-50"    : "bg-red-50",
    },
  ];

  const topbarActions = (
    <div className="flex items-center gap-3">
      <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide">Fecha:</label>
      <input
        type="date"
        value={fecha}
        onChange={(e) => setFecha(e.target.value)}
        className="px-3 py-1.5 border border-outline-variant rounded-xl text-sm bg-surface-container-low focus:outline-none focus:ring-2 focus:ring-primary"
      />
    </div>
  );

  return (
    <AppLayout role="dueño" pageTitle="Panel Ejecutivo" topbarActions={topbarActions}>
      <div className="space-y-8 max-w-7xl mx-auto">

        {/* Stats */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {statsCards.map((card) => (
            <div key={card.title} className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 flex flex-col gap-4">
              <div className="flex justify-between items-start">
                <div className={`p-3 ${card.bg} rounded-xl`}>
                  <span className={`material-symbols-outlined text-[24px] ${card.color}`}>{card.icon}</span>
                </div>
              </div>
              <div>
                <p className="text-on-surface-variant text-sm font-medium">{card.title}</p>
                {cargando ? (
                  <div className="h-8 w-28 bg-surface-container-high rounded-lg animate-pulse mt-1" />
                ) : (
                  <h4 className={`text-2xl font-extrabold tracking-tighter ${card.color} mt-1`}>{fmt(card.value)}</h4>
                )}
              </div>
            </div>
          ))}
        </section>

        {/* Action grid */}
        <section>
          <h3 className="text-base font-bold tracking-tight text-on-surface mb-5">Módulos del Sistema</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {actionButtons.map((btn) => (
              <button
                key={btn.path}
                onClick={() => navigate(btn.path)}
                className="group bg-surface-container-lowest border border-outline-variant p-6 rounded-xl hover:shadow-lg hover:shadow-blue-900/5 transition-all duration-300 flex flex-col gap-4 text-left"
              >
                <div className="flex justify-between items-start">
                  <div className="w-12 h-12 bg-primary-container rounded-xl flex items-center justify-center text-white group-hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined text-[22px]">{btn.icon}</span>
                  </div>
                  <span className="material-symbols-outlined text-outline group-hover:text-primary transition-colors text-[20px]">chevron_right</span>
                </div>
                <div>
                  <h4 className="font-bold text-on-surface text-sm">{btn.title}</h4>
                  <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">{btn.description}</p>
                </div>
              </button>
            ))}
          </div>
        </section>

      </div>
    </AppLayout>
  );
}
