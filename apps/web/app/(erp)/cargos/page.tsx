import { Lock } from "lucide-react";

import { Alerta } from "@opai/ds";
import { PERMISOS_CORE } from "@opai/domain";

import { PaginaPortal } from "@/app/_components/pagina-portal";
import { leerParametros, type SearchParams } from "@/lib/parametros";
import { vocabularioActual } from "@/lib/vocabulario";
import { puedeDeIdentidad } from "@/lib/permisos-ui";
import { requerirIdentidad } from "@/lib/servidor";

import { cargarCargosLista } from "./_componentes/datos";
import { HojaCargo } from "./_componentes/diferidas";
import { ListaCargos } from "./_componentes/lista-cargos";

export const metadata = { title: "Cargos y sueldos" };

/** Cargos y sueldos (14): cada cargo con los montos de su estructura vigente. Solo se llega desde el menú lateral. */
export default function Cargos({ searchParams }: { searchParams: SearchParams }) {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Cargos y sueldos"
      ruta="/cargos"
      cargar={async () => {
        const [p, voc, identidad] = await Promise.all([
          leerParametros(searchParams),
          vocabularioActual(),
          requerirIdentidad("/cargos"),
        ]);
        return {
          ...(await cargarCargosLista(p)),
          voc,
          puedeGestionar: puedeDeIdentidad(identidad)(PERMISOS_CORE.estructurasManage),
          puedeVerSensible: puedeDeIdentidad(identidad)(PERMISOS_CORE.estructurasReadSensible),
        };
      }}
    >
      {(d) => (
        <div className="flex flex-col gap-4">
          <ListaCargos state={d.state} items={d.items} puedeGestionar={d.puedeGestionar} />
          {d.items.some((c) => c.sueldoSensible) ? (
            <Alerta
              tono="neutral"
              icono={Lock}
              titulo="Los cargos con sueldo sensible muestran sus montos solo a quien tiene permiso para ver sueldos sensibles."
            />
          ) : null}
          {d.puedeGestionar ? <HojaCargo puedeVerSensible={d.puedeVerSensible} /> : null}
        </div>
      )}
    </PaginaPortal>
  );
}
