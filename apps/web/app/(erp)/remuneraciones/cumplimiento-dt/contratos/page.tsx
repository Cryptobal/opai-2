import { PaginaPortal } from "@/app/_components/pagina-portal";
import { ejecutarComoUsuario, identidadActual } from "@/lib/servidor";

import { permisosNomina } from "../../_componentes/datos";
import { EstadoMiDt } from "../../_componentes/estado-mi-dt";
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
      {(d) => {
        const items = d.r.ok ? d.r.data.items.filter((m) => m.movimientoTipo !== "finiquito") : [];
        const pendientes = items.filter((m) => !m.registrado).length;
        return (
          <EstadoMiDt r={d.r} variante="lista">
            <ListaCumplimientoDt
              items={items}
              pendientes={pendientes}
              gestiona={d.permisos.cumplimientoDt}
              tenantId={d.tenantId}
              variante="contratos"
            />
          </EstadoMiDt>
        );
      }}
    </PaginaPortal>
  );
}