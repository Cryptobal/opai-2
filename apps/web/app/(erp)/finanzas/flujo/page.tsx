import type { SearchParams } from "@/lib/parametros";

import { PaginaPortal } from "@/app/_components/pagina-portal";

import { cargarPlanilla } from "./_componentes/datos";
import { PlanillaFlujo } from "./_componentes/planilla-flujo";

export const metadata = { title: "Flujo de caja" };

/** Planilla del flujo de caja (Brief 20 PR 2, CAR-136): lectura, escritura, móvil, metas y aviso in-app. */
export default function FlujoDeCaja({ searchParams }: { searchParams: SearchParams }) {
  return (
    <PaginaPortal portal="erp" titulo="Flujo de caja" ruta="/finanzas/flujo" completo cargar={() => cargarPlanilla(searchParams)}>
      {(d) => (
        <PlanillaFlujo
          state={d.state}
          planilla={d.planilla}
          gestiona={d.gestiona}
          cierra={d.cierra}
          configura={d.configura}
          movil={d.movil}
        />
      )}
    </PaginaPortal>
  );
}
