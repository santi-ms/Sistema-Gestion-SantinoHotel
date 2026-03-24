import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "./components/Layout/AppLayout";

const menuItems = [
  {
    title: "Reservas del Día",
    description: "Consulta y gestiona las llegadas de hoy.",
    icon: "calendar_today",
    path: "/reservas-dia",
  },
  {
    title: "Registrar Pedido",
    description: "Carga consumos de bar y restaurante.",
    icon: "receipt_long",
    path: "/registrar-pedido",
  },
  {
    title: "Lista de Precios",
    description: "Consulta tarifas de habitaciones.",
    icon: "sell",
    path: "/configuracion-precios",
  },
  {
    title: "Registrar Gasto",
    description: "Control de egresos y facturas.",
    icon: "payments",
    path: "/registrar-gasto",
  },
  {
    title: "Ver Reservas",
    description: "Calendario general de ocupación.",
    icon: "event_note",
    path: "/ver-reservas",
  },
  {
    title: "Actividades",
    description: "Gestiona tareas y actividades del hotel.",
    icon: "local_activity",
    path: "/actividades",
  },
  {
    title: "Control de Stock",
    description: "Inventario de insumos y limpieza.",
    icon: "inventory_2",
    path: "/stock",
  },
];

const quickActions = [
  { label: "Nueva Reserva",      icon: "add",               path: "/reservas-dia" },
  { label: "Nuevo Pedido",       icon: "receipt_long",      path: "/registrar-pedido" },
  { label: "Registrar Gasto",    icon: "payments",          path: "/registrar-gasto" },
  { label: "Ver Stock",          icon: "inventory_2",       path: "/stock" },
];

export default function EmpleadoPanel() {
  const navigate = useNavigate();
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const greeting = () => {
    const h = time.getHours();
    if (h < 12) return "Buenos días";
    if (h < 19) return "Buenas tardes";
    return "Buenas noches";
  };

  const formattedDate = time.toLocaleDateString('es-ES', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  return (
    <AppLayout role="empleado" pageTitle="Dashboard">
      <div className="space-y-8 max-w-7xl mx-auto">

        {/* Greeting banner */}
        <section className="bg-primary-container rounded-xl p-8 relative overflow-hidden shadow-xl shadow-blue-900/10">
          <div className="relative z-10">
            <h3 className="text-white text-2xl font-extrabold tracking-tight mb-1">
              {greeting()}, bienvenido al sistema
            </h3>
            <p className="text-blue-100 text-sm capitalize">{formattedDate}</p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => navigate('/reservas-dia')}
                className="bg-white text-primary-container px-5 py-2 rounded-xl font-bold text-sm hover:bg-blue-50 transition-colors"
              >
                Ver Reservas de Hoy
              </button>
              <button
                onClick={() => navigate('/registrar-pedido')}
                className="bg-blue-500/20 text-white border border-white/20 px-5 py-2 rounded-xl font-bold text-sm hover:bg-blue-500/30 transition-colors"
              >
                Nuevo Pedido
              </button>
            </div>
          </div>
          {/* Decorative blobs */}
          <div className="absolute right-[-10%] top-[-50%] w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute right-[10%] bottom-[-30%] w-64 h-64 bg-blue-400/20 rounded-full blur-2xl pointer-events-none" />
        </section>

        {/* Menu grid */}
        <section>
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-bold tracking-tight text-on-surface">Accesos Rápidos</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {menuItems.map((item) => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className="group bg-surface-container-lowest border border-outline-variant p-6 rounded-xl hover:shadow-lg hover:shadow-blue-900/5 transition-all duration-300 flex flex-col gap-4 text-left"
              >
                <div className="flex justify-between items-start">
                  <div className="w-12 h-12 bg-primary-container rounded-xl flex items-center justify-center text-white group-hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined text-[22px]">{item.icon}</span>
                  </div>
                  <span className="material-symbols-outlined text-outline group-hover:text-primary transition-colors text-[20px]">chevron_right</span>
                </div>
                <div>
                  <h4 className="font-bold text-on-surface text-sm">{item.title}</h4>
                  <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">{item.description}</p>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Quick actions */}
        <section>
          <h3 className="text-base font-bold tracking-tight text-on-surface mb-4">Acciones Rápidas</h3>
          <div className="flex flex-wrap gap-3">
            {quickActions.map((action) => (
              <button
                key={action.path}
                onClick={() => navigate(action.path)}
                className="flex items-center gap-2 bg-surface-container-low hover:bg-surface-container-high text-on-surface font-semibold px-4 py-2.5 rounded-full transition-all border border-transparent hover:border-outline-variant text-sm"
              >
                <span className="material-symbols-outlined text-[18px]">{action.icon}</span>
                <span>{action.label}</span>
              </button>
            ))}
          </div>
        </section>

      </div>
    </AppLayout>
  );
}
