import { PlanillaScreen } from "@opai/ds";

import { PaginaPortal } from "@/app/_components/pagina-portal";
import { estadoPantalla } from "@/lib/formato";

import { armarPlanilla, cargarPlanilla } from "./_componentes/datos";

export const metadata = { title: "Flujo de caja" };

/**
 * Planilla del flujo de caja (Brief 20, ADR-026): 12 semanas con capas por celda, totales y saldo
 * acumulado. Lectura de `finanzas.planilla.obtener`; las escrituras (fijar, mover, cumplir, sellar)
 * son capacidades y las pantallas que las invocan llegan en el PR 2 (ver BRIEF-20 §Plan).
 */
export default function FlujoDeCaja() {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Flujo de caja"
      ruta="/finanzas/flujo"
      completo
      cargar={cargarPlanilla}
    >
      {(r) => {
        const { columnas, filas, celda } = armarPlanilla(
          r.ok ? r.data : { umbral: 0, filas: [], celdas: [], semanas: [] },
        );
        return (
          <PlanillaScreen
            state={estadoPantalla(r)}
            titulo="Flujo de caja"
            subtitulo="Próximas 12 semanas · montos en CLP"
            filas={filas.length > 3 ? filas : []}
            columnas={columnas}
            celda={celda}
            textos={{
              vacio: {
                titulo: "Sin filas en el flujo",
                descripcion:
                  "Agrega las filas de ingresos y egresos para ver la planilla por semana.",
              },
            }}
          />
        );
      }}
    </PaginaPortal>
  );
}
