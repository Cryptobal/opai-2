import { Estado } from "@opai/ds";

import { PaginaPortal } from "@/app/_components/pagina-portal";
import { estadoPantalla } from "@/lib/formato";
import { ejecutarComoUsuario, identidadActual } from "@/lib/servidor";

import { permisosNomina } from "../../_componentes/datos";
import { ListaCumplimientoDt, type MovimientoMiDt } from "../../_componentes/lista-cumplimiento-dt";

export const metadata = { title: "Contratos y anexos · Cumplimiento DT" };

type Salida = { pendientes: number; registrados: number; items: MovimientoMiDt[] };

/** Cumplimiento DT · contratos y anexos (diseño 07, CAR-99). */
export default function ContratosMiDt() {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Contratos y anexos"
      ruta="/remuneraciones/cumplimiento-dt/contratos"
      cargar={async () => {
        const [r, permisos, identidad] = await Promise.all([
          ejecutarComoUsuario<Salida>("erp", "nomina.midt.listar", {}),
          permisosNomina(),
          identidadActual(),
        ]);
        return { r, permisos, tenantId: identidad?.actual?.tenantId ?? "" };
      }}
    >
      {(d) => (
        <Estado state={estadoPantalla(d.r)} variante="lista">
          {d.r.ok ? (
            <ListaCumplimientoDt
              items={d.r.data.items}
              pendientes={d.r.data.pendientes}
              gestiona={d.permisos.cumplimientoDt}
              tenantId={d.tenantId}
            />
          ) : null}
        </Estado>
      )}
    </PaginaPortal>
  );
}