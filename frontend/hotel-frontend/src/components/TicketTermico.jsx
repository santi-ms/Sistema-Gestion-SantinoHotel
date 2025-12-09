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
      // Mostrar instrucciones antes de imprimir
      const mostrarInstrucciones = () => {
        const instrucciones = `
IMPORTANTE: En el diálogo de impresión:
1. Selecciona tu impresora térmica (GADNIC TP-450S) en el dropdown "Impresora"
2. NO uses "Guardar como PDF"
3. Haz clic en "Imprimir" (no en "Guardar")
        `;
        console.log(instrucciones);
      };
      
      mostrarInstrucciones();
      
      // Crear una ventana nueva para imprimir
      const ventanaImpresion = window.open("", "_blank", "width=400,height=600");
      
      if (ventanaImpresion) {
        // Generar contenido del ticket en formato simple para impresoras térmicas
        const generarTicketTexto = () => {
          const fecha = formatearFechaHora(pedido.fecha);
          const fechaHoy = new Date().toLocaleDateString('es-AR');
          const horaHoy = new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
          
          let ticket = '';
          ticket += '================================\n';
          ticket += '      HOTEL SANTINO\n';
          ticket += '   Sistema de Gestion\n';
          ticket += '================================\n\n';
          ticket += `Pedido #${pedido.id}\n`;
          ticket += `${fecha}\n`;
          if (pedido.habitacion_id) {
            ticket += `Habitacion: ${pedido.habitacion_id}\n`;
          }
          ticket += `Tipo: ${pedido.externo ? 'Pedido Externo' : 'Pedido Interno'}\n`;
          ticket += '--------------------------------\n\n';
          ticket += 'DETALLE DEL PEDIDO\n';
          ticket += '--------------------------------\n';
          
          pedido.items.forEach(item => {
            const descripcion = item.descripcion.substring(0, 20); // Limitar longitud
            const cantidad = item.cantidad;
            const precioUnitario = item.precio;
            const subtotal = cantidad * precioUnitario;
            
            ticket += `${cantidad}x ${descripcion.padEnd(20)} $${subtotal.toFixed(2)}\n`;
            ticket += `    $${precioUnitario.toFixed(2)} c/u\n`;
          });
          
          ticket += '--------------------------------\n';
          ticket += `TOTAL:                    $${pedido.monto.toFixed(2)}\n`;
          ticket += '--------------------------------\n\n';
          ticket += `Forma de Pago: ${pedido.forma_pago ? pedido.forma_pago.toUpperCase() : 'NO ESPECIFICADA'}\n\n`;
          ticket += '--------------------------------\n';
          ticket += 'Gracias por su compra\n';
          ticket += `${fechaHoy} - ${horaHoy}\n`;
          ticket += '================================\n';
          
          return ticket;
        };
        
        const ticketTexto = generarTicketTexto();
        
        ventanaImpresion.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Ticket - Pedido #${pedido.id}</title>
              <style>
                @page {
                  size: 80mm auto;
                  margin: 0mm;
                }
                
                * {
                  margin: 0;
                  padding: 0;
                  box-sizing: border-box;
                }
                
                body {
                  font-family: 'Courier New', 'Monaco', monospace;
                  width: 80mm;
                  padding: 0mm;
                  margin: 0mm;
                  font-size: 10pt;
                  line-height: 1.2;
                  color: #000;
                  background: #fff;
                }
                
                pre {
                  font-family: 'Courier New', 'Monaco', monospace;
                  font-size: 10pt;
                  white-space: pre-wrap;
                  word-wrap: break-word;
                  margin: 0;
                  padding: 5mm;
                  width: 80mm;
                }
                
                @media print {
                  body {
                    margin: 0;
                    padding: 0;
                  }
                  
                  pre {
                    margin: 0;
                    padding: 2mm;
                  }
                }
              </style>
            </head>
            <body>
              <pre>${ticketTexto}</pre>
            </body>
          </html>
        `);
        
        ventanaImpresion.document.close();
        
        // Esperar a que se cargue el contenido y luego imprimir
        ventanaImpresion.onload = () => {
          setTimeout(() => {
            try {
              // Intentar imprimir - esto abrirá el diálogo
              ventanaImpresion.print();
            } catch (error) {
              console.error("Error al imprimir:", error);
            }
            // NO cerrar automáticamente - el usuario debe cerrar después de imprimir
          }, 500);
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

