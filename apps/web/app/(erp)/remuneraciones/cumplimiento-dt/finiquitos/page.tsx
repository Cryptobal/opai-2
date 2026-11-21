import { Estado } from "@opai/ds";

import { PaginaPortal } from "@/app/_components/pagina-portal";
import { estadoPantalla, textosComplementoInactivo } from "@/lib/formato";
import { ejecutarComoUsuario, identidadActual } from "@/lib/servidor";

import { permisosNomina } from "../../_componentes/datos";
import { ListaCumplimientoDt, type MovimientoMiDt } from "../../_componentes/lista-cumplimiento-dt";

export const metadata = { title: "Finiquitos · Cumplimiento DT" };

type Salida = { pendientes: number; registrados: number; items: MovimientoMiDt[] };

/** Cumplimiento DT · finiquitos en Mi DT (diseño 08, registro; CAR-99). */
export default function FiniquitosMiDt() {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Finiquitos"
      ruta="/remuneraciones/cumplimiento-dt/finiquitos"
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
        const textos = textosComplementoInactivo(d.r);
        return (
        <Estado state={estadoPantalla(d.r)} variante="lista" {...(textos ? { textos } : {})}>
          {d.r.ok ? (
            (() => {
              const items = d.r.data.items.filter((m) => m.movimientoTipo === "finiquito");
              const pendientes = items.filter((m) => !m.registrado).length;
              return (
                <ListaCumplimientoDt
                  items={items}
                  pendientes={pendientes}
                  gestiona={d.permisos.cumplimientoDt}
                  tenantId={d.tenantId}
                  variante="finiquitos"
                />
              );
            })()
          ) : null}
        </Estado>
        );
      }}
    </PaginaPortal>
  );
}