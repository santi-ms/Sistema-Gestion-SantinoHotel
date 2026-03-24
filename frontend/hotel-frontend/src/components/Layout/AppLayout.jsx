import React from 'react';
import Sidebar from './Sidebar';

/**
 * Layout principal con sidebar fijo + área de contenido
 * Usado por todas las páginas internas del sistema
 */
export default function AppLayout({ children, role = 'empleado', pageTitle = '', topbarActions = null }) {
  return (
    <div className="flex min-h-screen bg-surface">
      <Sidebar role={role} />

      {/* Main wrapper */}
      <div className="ml-64 flex-1 flex flex-col min-h-screen">

        {/* Top bar */}
        <header className="w-full h-16 sticky top-0 z-10 bg-surface-container-lowest border-b border-outline-variant/30 flex justify-between items-center px-8">
          <h2 className="text-xl font-bold tracking-tight text-on-surface">{pageTitle}</h2>
          <div className="flex items-center gap-3">
            {topbarActions}
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-8">
          {children}
        </main>

        {/* Footer */}
        <footer className="px-8 py-4 text-on-surface-variant text-xs flex justify-between items-center bg-surface-container-lowest border-t border-outline-variant/10">
          <span className="font-semibold text-on-surface">Hotel Santino · Santo Tomé, Corrientes</span>
          <span>© 2025 · Sistema de Gestión Hotelera</span>
        </footer>

      </div>
    </div>
  );
}
