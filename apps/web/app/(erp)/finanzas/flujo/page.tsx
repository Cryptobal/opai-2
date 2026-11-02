import type { SearchParams } from "@/lib/parametros";

import { PaginaPortal } from "@/app/_components/pagina-portal";

import { cargarPlanilla } from "./_componentes/datos-servidor";
import { PlanillaFlujo } from "./_componentes/planilla-flujo";

export const metadata = { title: "Flujo de caja" };

/** Planilla del flujo de caja (Brief 20 PR 2 / flujo v2 PR A): lectura con cartola en semanas pasadas, escritura y aviso in-app. */
export default function FlujoDeCaja({ searchParams }: { searchParams: SearchParams }) {
  return (
    <PaginaPortal portal="erp" titulo="Flujo de caja" ruta="/finanzas/flujo" completo cargar={() => cargarPlanilla(searchParams)}>
      {(d) => (
        <PlanillaFlujo
          state={d.state}
          planilla={d.planilla}
          gestiona={d.gestiona}
          configura={d.configura}
          movil={d.movil}
        />
      )}
    </PaginaPortal>
  );
}
