import { ErrorCarga } from "@/app/_components/error-carga";
import { PaginaPortal } from "@/app/_components/pagina-portal";

import { cargarCuentasProgramacion, vistaDeCarga } from "../_componentes/cargar-cuentas";
import { FormularioProgramacion } from "../_componentes/formulario-programacion";

export const metadata = { title: "Nueva programación" };

/** Nueva programación de facturación recurrente (BRIEF-26 · CAR-159). */
export default function NuevaProgramacionPage() {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Nueva programación"
      ruta="/finanzas/ventas/programacion"
      cargando="formulario"
      cargar={() => cargarCuentasProgramacion("/finanzas/ventas/programacion/nueva")}
      opciones={() => ({
        titulo: "Nueva programación",
        volver: { href: "/finanzas/ventas/programacion", etiqueta: "Programación" },
      })}
    >
      {(d) => {
        const vista = vistaDeCarga(d.state);
        if (vista === "formulario") return <FormularioProgramacion cuentas={d.cuentas} />;
        return <ErrorCarga fallo={vista} ruta="/finanzas/ventas/programacion/nueva" />;
      }}
    </PaginaPortal>
  );
}
