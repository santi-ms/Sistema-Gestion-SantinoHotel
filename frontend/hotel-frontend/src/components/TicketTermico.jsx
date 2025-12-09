import { useEffect, useRef } from "react";
import { formatearFechaHora } from "../utils/fechas";

/**
 * Componente para imprimir tickets térmicos de 80mm
 * @param {Object} pedido - Objeto del pedido a imprimir
 * @param {Function} onClose - Función para cerrar el componente
 */
export default function TicketTermico({ pedido, onClose }) {
  useEffect(() => {
    if (pedido) {
      // Crear una ventana nueva para imprimir
      const ventanaImpresion = window.open("", "_blank", "width=400,height=600");
      
      if (ventanaImpresion) {
        ventanaImpresion.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Ticket - Pedido #${pedido.id}</title>
              <style>
                @page {
                  size: 80mm auto;
                  margin: 0;
                }
                
                * {
                  margin: 0;
                  padding: 0;
                  box-sizing: border-box;
                }
                
                body {
                  font-family: 'Courier New', monospace;
                  width: 80mm;
                  padding: 5mm;
                  font-size: 12px;
                  line-height: 1.4;
                  color: #000;
                  background: #fff;
                }
                
                .ticket {
                  width: 100%;
                  max-width: 80mm;
                }
                
                .header {
                  text-align: center;
                  border-bottom: 1px dashed #000;
                  padding-bottom: 8px;
                  margin-bottom: 8px;
                }
                
                .hotel-name {
                  font-size: 18px;
                  font-weight: bold;
                  margin-bottom: 4px;
                  text-transform: uppercase;
                }
                
                .hotel-subtitle {
                  font-size: 11px;
                  margin-bottom: 4px;
                }
                
                .ticket-info {
                  margin: 8px 0;
                  font-size: 10px;
                }
                
                .section {
                  margin: 8px 0;
                  padding: 4px 0;
                }
                
                .section-title {
                  font-weight: bold;
                  font-size: 11px;
                  margin-bottom: 4px;
                  border-bottom: 1px solid #000;
                  padding-bottom: 2px;
                }
                
                .items {
                  margin: 6px 0;
                }
                
                .item-row {
                  display: flex;
                  justify-content: space-between;
                  margin: 3px 0;
                  font-size: 11px;
                }
                
                .item-desc {
                  flex: 1;
                  margin-right: 8px;
                }
                
                .item-qty {
                  font-weight: bold;
                  margin-right: 4px;
                }
                
                .item-price {
                  text-align: right;
                  min-width: 50px;
                }
                
                .subtotal-row {
                  display: flex;
                  justify-content: space-between;
                  margin: 2px 0;
                  font-size: 11px;
                }
                
                .total-row {
                  display: flex;
                  justify-content: space-between;
                  margin-top: 8px;
                  padding-top: 8px;
                  border-top: 2px solid #000;
                  font-size: 14px;
                  font-weight: bold;
                }
                
                .payment-info {
                  margin: 8px 0;
                  padding: 6px;
                  background: #f0f0f0;
                  border: 1px dashed #000;
                  font-size: 11px;
                }
                
                .footer {
                  text-align: center;
                  margin-top: 12px;
                  padding-top: 8px;
                  border-top: 1px dashed #000;
                  font-size: 9px;
                }
                
                .divider {
                  border-top: 1px dashed #000;
                  margin: 8px 0;
                }
                
                @media print {
                  body {
                    padding: 0;
                  }
                  
                  .no-print {
                    display: none;
                  }
                }
              </style>
            </head>
            <body>
              <div class="ticket">
                <div class="header">
                  <div class="hotel-name">HOTEL SANTINO</div>
                  <div class="hotel-subtitle">Sistema de Gestión</div>
                </div>
                
                <div class="ticket-info">
                  <div><strong>Pedido #${pedido.id}</strong></div>
                  <div>${formatearFechaHora(pedido.fecha)}</div>
                  ${pedido.habitacion_id ? `<div>Habitación: ${pedido.habitacion_id}</div>` : ''}
                  ${pedido.externo ? '<div>Tipo: Pedido Externo</div>' : '<div>Tipo: Pedido Interno</div>'}
                </div>
                
                <div class="divider"></div>
                
                <div class="section">
                  <div class="section-title">DETALLE DEL PEDIDO</div>
                  <div class="items">
                    ${pedido.items.map(item => `
                      <div class="item-row">
                        <div class="item-desc">
                          <span class="item-qty">${item.cantidad}x</span>
                          ${item.descripcion}
                        </div>
                        <div class="item-price">
                          $${(item.cantidad * item.precio).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </div>
                      <div class="subtotal-row" style="padding-left: 20px; color: #666;">
                        $${item.precio.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} c/u
                      </div>
                    `).join('')}
                  </div>
                </div>
                
                <div class="divider"></div>
                
                <div class="total-row">
                  <div>TOTAL:</div>
                  <div>$${pedido.monto.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                </div>
                
                <div class="payment-info">
                  <div><strong>Forma de Pago:</strong> ${pedido.forma_pago ? pedido.forma_pago.toUpperCase() : 'NO ESPECIFICADA'}</div>
                </div>
                
                <div class="footer">
                  <div class="divider"></div>
                  <div style="margin-top: 8px;">
                    Gracias por su compra
                  </div>
                  <div style="margin-top: 4px; font-size: 8px;">
                    ${new Date().toLocaleDateString('es-AR')} - ${new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            </body>
          </html>
        `);
        
        ventanaImpresion.document.close();
        
        // Esperar a que se cargue el contenido y luego imprimir
        ventanaImpresion.onload = () => {
          setTimeout(() => {
            ventanaImpresion.print();
            // Cerrar la ventana después de imprimir (opcional)
            setTimeout(() => {
              ventanaImpresion.close();
            }, 500);
          }, 250);
        };
      }
      
      // Cerrar el componente después de un momento
      if (onClose) {
        setTimeout(() => {
          onClose();
        }, 1000);
      }
    }
  }, [pedido, onClose]);

  // Este componente no renderiza nada visible, solo maneja la impresión
  return null;
}

