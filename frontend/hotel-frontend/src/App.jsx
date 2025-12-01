import { Routes, Route } from "react-router-dom";
import Login from "./Login";
import EmpleadoPanel from "./EmpleadoPanel";
import RegistrarPedido from "./RegistrarPedido";
import RegistrarGasto from "./RegistrarGasto";
import AgregarHabitacion from "./AgregarHabitacion";
import VerPedidos from "./VerPedidos";
import VerReservas from "./VerReservas";
import RutaPrivada from "./RutaPrivada";
import DuenoPanel from "./DuenoPanel";
import ReservasDia from "./ReservasDia";
import RegistrarCliente from "./RegistrarCliente";
import DashboardAnalytics from "./DashboardAnalytics";
import ConfiguracionPrecios from "./ConfiguracionPrecios";

function App() {
  return (
    <Routes>
      {/* RUTA PÚBLICA */}
      <Route path="/" element={<Login />} />

      {/* PANELES PRINCIPALES */}
      <Route path="/empleado" element={
        <RutaPrivada rol="empleado">
          <EmpleadoPanel />
        </RutaPrivada>
      } />

      <Route path="/dueno" element={
        <RutaPrivada rol="dueño">
          <DuenoPanel />
        </RutaPrivada>
      } />

      {/* RUTAS EXCLUSIVAS DEL DUEÑO */}
      <Route path="/analytics" element={
        <RutaPrivada rol="dueño">
          <DashboardAnalytics />
        </RutaPrivada>
      } />

      <Route path="/agregar-habitacion" element={
        <RutaPrivada rol="dueño">
          <AgregarHabitacion />
        </RutaPrivada>
      } />

      <Route path="/ver-pedidos" element={
        <RutaPrivada rol="dueño">
          <VerPedidos />
        </RutaPrivada>
      } />

      {/* RUTAS COMPARTIDAS - Accesibles para AMBOS roles */}
      <Route path="/configuracion-precios" element={
        <RutaPrivada rol={["empleado", "dueño"]}>
          <ConfiguracionPrecios />
        </RutaPrivada>
      } />

      <Route path="/ver-reservas" element={
        <RutaPrivada rol={["empleado", "dueño"]}>
          <VerReservas />
        </RutaPrivada>
      } />

      <Route path="/registrar-gasto" element={
        <RutaPrivada rol={["empleado", "dueño"]}>
          <RegistrarGasto />
        </RutaPrivada>
      } />

      <Route path="/registrar-cliente" element={
        <RutaPrivada rol={["empleado", "dueño"]}>
          <RegistrarCliente />
        </RutaPrivada>
      } />

      {/* RUTAS PRINCIPALMENTE DEL EMPLEADO */}
      <Route path="/reservas-dia" element={
        <RutaPrivada rol="empleado">
          <ReservasDia />
        </RutaPrivada>
      } />

      <Route path="/registrar-pedido" element={
        <RutaPrivada rol="empleado">
          <RegistrarPedido />
        </RutaPrivada>
      } />
    </Routes>
  );
}

export default App;