import React, { useState } from 'react';
import Sidebar from './Sidebar';
import { getUserRole } from '../../hooks/useAuth';

/**
 * Layout principal con sidebar fijo + área de contenido
 * Responsivo: sidebar como drawer en mobile, fijo en desktop
 */
export default function AppLayout({ children, pageTitle = '', topbarActions = null }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const role = getUserRole() ?? 'empleado';

  return (
    <div className="flex min-h-screen bg-surface">

      {/* Overlay en mobile cuando el sidebar está abierto */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <Sidebar role={role} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main wrapper */}
      <div className="md:ml-64 flex-1 flex flex-col min-h-screen">

        {/* Top bar */}
        <header className="w-full h-16 sticky top-0 z-10 bg-surface-container-lowest border-b border-outline-variant/30 flex justify-between items-center px-4 md:px-8">
          <div className="flex items-center gap-3">
            {/* Hamburger: solo en mobile */}
            <button
              className="md:hidden p-2 rounded-lg hover:bg-surface-container-high transition-colors"
              onClick={() => setSidebarOpen(true)}
              aria-label="Abrir menú"
            >
              <span className="material-symbols-outlined text-on-surface text-[22px]">menu</span>
            </button>
            <h2 className="text-lg md:text-xl font-bold tracking-tight text-on-surface">{pageTitle}</h2>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            {topbarActions}
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 md:p-8">
          {children}
        </main>

        {/* Footer */}
        <footer className="px-4 md:px-8 py-4 text-on-surface-variant text-xs flex flex-col md:flex-row justify-between items-center gap-1 bg-surface-container-lowest border-t border-outline-variant/10">
          <span className="font-semibold text-on-surface">Hotel Santino · Santo Tomé, Corrientes</span>
          <span>© 2025 · Sistema de Gestión Hotelera</span>
        </footer>

      </div>
    </div>
  );
}
