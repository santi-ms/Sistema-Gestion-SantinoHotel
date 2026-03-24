import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { TOKEN_KEY } from '../../config';

const navItems = [
  { label: 'Dashboard',     icon: 'dashboard',        path: '/empleado' },
  { label: 'Reservas',      icon: 'calendar_today',   path: '/reservas-dia' },
  { label: 'Pedidos',       icon: 'receipt_long',     path: '/registrar-pedido' },
  { label: 'Ver Reservas',  icon: 'event_note',       path: '/ver-reservas' },
  { label: 'Precios',       icon: 'sell',             path: '/configuracion-precios' },
  { label: 'Stock',         icon: 'inventory_2',      path: '/stock' },
  { label: 'Gastos',        icon: 'payments',         path: '/registrar-gasto' },
  { label: 'Actividades',   icon: 'local_activity',   path: '/actividades' },
];

const navItemsDueno = [
  { label: 'Dashboard',     icon: 'dashboard',        path: '/dueno' },
  { label: 'Analytics',     icon: 'bar_chart',        path: '/analytics' },
  { label: 'Reservas',      icon: 'calendar_today',   path: '/reservas-dia' },
  { label: 'Ver Reservas',  icon: 'event_note',       path: '/ver-reservas' },
  { label: 'Pedidos',       icon: 'receipt_long',     path: '/registrar-pedido' },
  { label: 'Ver Pedidos',   icon: 'local_cafe',       path: '/ver-pedidos' },
  { label: 'Precios',       icon: 'sell',             path: '/configuracion-precios' },
  { label: 'Stock',         icon: 'inventory_2',      path: '/stock' },
  { label: 'Gastos',        icon: 'payments',         path: '/registrar-gasto' },
  { label: 'Actividades',   icon: 'local_activity',   path: '/actividades' },
  { label: 'Habitaciones',  icon: 'bed',              path: '/agregar-habitacion' },
  { label: 'Clientes',      icon: 'people',           path: '/registrar-cliente' },
];

/**
 * Sidebar responsive:
 * - Desktop (md+): siempre visible, fijo a la izquierda
 * - Mobile: drawer deslizable controlado por isOpen/onClose
 */
export default function Sidebar({ role = 'empleado', isOpen = false, onClose = () => {} }) {
  const navigate = useNavigate();
  const location = useLocation();

  const items = role === 'dueño' ? navItemsDueno : navItems;

  const handleLogout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem('rol');
    navigate('/');
  };

  const handleNav = (path) => {
    navigate(path);
    onClose(); // cerrar drawer en mobile al navegar
  };

  return (
    <aside
      className={`
        h-screen w-64 fixed left-0 top-0 flex flex-col bg-[#0f172a] text-sm font-medium z-40
        transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0
      `}
    >
      <div className="flex flex-col h-full py-8 px-4">

        {/* Brand + botón cerrar en mobile */}
        <div className="flex items-center justify-between px-2 mb-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-container flex items-center justify-center rounded-xl shadow-lg flex-shrink-0">
              <span className="text-white font-extrabold text-base tracking-tighter">HS</span>
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-white leading-tight">Hotel Santino</h1>
            </div>
          </div>
          {/* Botón X solo en mobile */}
          <button
            className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            onClick={onClose}
            aria-label="Cerrar menú"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-0.5 overflow-y-auto">
          {items.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => handleNav(item.path)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all duration-150 ${
                  isActive
                    ? 'bg-blue-600 text-white border-r-4 border-blue-400'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="mt-auto pt-4 border-t border-slate-800/50">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-slate-400 hover:text-white hover:bg-slate-800 transition-all duration-150"
          >
            <span className="material-symbols-outlined text-[20px]">logout</span>
            <span>Cerrar Sesión</span>
          </button>
        </div>

      </div>
    </aside>
  );
}
