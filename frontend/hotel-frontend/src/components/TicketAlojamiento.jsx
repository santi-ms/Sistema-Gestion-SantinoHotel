import { useEffect } from "react";
import { formatearSoloFecha } from "../utils/fechas";

/**
 * Componente para imprimir tickets térmicos de alojamiento de 80mm
 * @param {Object} reserva - Objeto de la reserva a imprimir
 * @param {Function} onClose - Función para cerrar el componente
 */
export default function TicketAlojamiento({ reserva, onClose }) {
  useEffect(() => {
    if (reserva) {
      // Crear una ventana nueva para imprimir
      const ventanaImpresion = window.open("", "_blank", "width=400,height=600");
      
      if (ventanaImpresion) {
        // Generar contenido del ticket en formato simple para impresoras térmicas
        const generarTicketTexto = () => {
          const fechaHoy = new Date().toLocaleDateString('es-AR');
          const horaHoy = new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
          
          // Formatear fechas
          const checkIn = reserva.fecha_checkin ? formatearSoloFecha(reserva.fecha_checkin) : 'N/A';
          const checkOut = reserva.fecha_checkout ? formatearSoloFecha(reserva.fecha_checkout) : 'N/A';
          
          // Calcular noches
          let noches = 0;
          if (reserva.fecha_checkin && reserva.fecha_checkout) {
            const fechaIn = new Date(reserva.fecha_checkin);
            const fechaOut = new Date(reserva.fecha_checkout);
            noches = Math.ceil((fechaOut - fechaIn) / (1000 * 60 * 60 * 24));
          }
          
          // Determinar precio a mostrar
          let precioMostrar = reserva.total_estadia || 0;
          let precioLista = null;
          let precioEfectivo = null;
          
          if (reserva.precio_lista && reserva.precio_efectivo) {
            precioLista = reserva.precio_lista;
            precioEfectivo = reserva.precio_efectivo;
            precioMostrar = precioLista; // Mostrar precio de lista por defecto
          }
          
          let ticket = '';
          ticket += '================================\n';
          ticket += '      HOTEL SANTINO\n';
          ticket += '   Santo Tome, Corrientes\n';
          ticket += '================================\n\n';
          ticket += '    COMPROBANTE DE ALOJAMIENTO\n\n';
          ticket += '--------------------------------\n';
          ticket += `Reserva #${reserva.id}\n`;
          ticket += `Fecha: ${fechaHoy} ${horaHoy}\n`;
          ticket += '--------------------------------\n\n';
          
          // Datos del huésped
          ticket += 'DATOS DEL HUESPED\n';
          ticket += '--------------------------------\n';
          ticket += `Nombre: ${reserva.nombre_huesped || 'N/A'}\n`;
          if (reserva.cantidad_personas) {
            ticket += `Personas: ${reserva.cantidad_personas}\n`;
          }
          ticket += '--------------------------------\n\n';
          
          // Datos de la reserva
          ticket += 'DATOS DE LA RESERVA\n';
          ticket += '--------------------------------\n';
          ticket += `Habitacion: ${reserva.habitacion_id}\n`;
          ticket += `Check-in: ${checkIn}\n`;
          ticket += `Check-out: ${checkOut}\n`;
          if (noches > 0) {
            ticket += `Noches: ${noches}\n`;
          }
          ticket += '--------------------------------\n\n';
          
          // Información de precios
          ticket += 'INFORMACION DE PAGO\n';
          ticket += '--------------------------------\n';
          
          if (precioLista && precioEfectivo) {
            ticket += `Precio Lista: $${precioLista.toFixed(2)}\n`;
            ticket += `Precio Efectivo: $${precioEfectivo.toFixed(2)}\n`;
            const descuento = precioLista - precioEfectivo;
            if (descuento > 0) {
              ticket += `Descuento: $${descuento.toFixed(2)}\n`;
            }
            ticket += '--------------------------------\n';
            ticket += `TOTAL: $${precioMostrar.toFixed(2)}\n`;
          } else {
            ticket += `TOTAL: $${precioMostrar.toFixed(2)}\n`;
          }
          
          if (reserva.seña && reserva.seña > 0) {
            ticket += `Sena: $${reserva.seña.toFixed(2)}\n`;
            const pendiente = precioMostrar - reserva.seña;
            if (pendiente > 0) {
              ticket += `Pendiente: $${pendiente.toFixed(2)}\n`;
            }
          }
          
          ticket += `Forma de Pago: ${reserva.forma_pago ? reserva.forma_pago.toUpperCase() : 'PENDIENTE'}\n`;
          ticket += '--------------------------------\n\n';
          
          // Información adicional
          if (reserva.mascota) {
            ticket += 'NOTA: Viaja con mascota\n';
            if (reserva.observaciones_mascota) {
              ticket += `${reserva.observaciones_mascota}\n`;
            }
            ticket += '\n';
          }
          
          // Pie de página
          ticket += '--------------------------------\n';
          ticket += 'Gracias por elegirnos\n';
          ticket += 'Hotel Santino\n';
          ticket += 'Hospitalidad familiar\n';
          ticket += '--------------------------------\n';
          ticket += `Emitido: ${fechaHoy} ${horaHoy}\n`;
          ticket += '================================\n';
          
          return ticket;
        };
        
        const ticketTexto = generarTicketTexto();
        
        ventanaImpresion.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Ticket Alojamiento - Reserva #${reserva.id}</title>
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
              ventanaImpresion.print();
            } catch (error) {
              console.error("Error al imprimir:", error);
            }
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
  }, [reserva, onClose]);

  // Este componente no renderiza nada visible, solo maneja la impresión
  return null;
}

