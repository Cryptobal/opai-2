import { PERMISOS_CORE } from "@opai/domain";

import { PaginaPortal } from "@/app/_components/pagina-portal";
import { leerParametros, type SearchParams } from "@/lib/parametros";
import { vocabularioActual } from "@/lib/vocabulario";
import { puedeDeIdentidad } from "@/lib/permisos-ui";
import { requerirIdentidad } from "@/lib/servidor";

import { cargarCargosLista } from "./_componentes/datos";
import { HojaCargo } from "./_componentes/diferidas";
import { AvisoRetiro } from "./_componentes/aviso-retiro";
import { ListaCargos } from "./_componentes/lista-cargos";

export const metadata = { title: "Cargos" };

/** Cargos (14): catálogo sin montos. Solo se llega desde el menú lateral. */
export default function Cargos({ searchParams }: { searchParams: SearchParams }) {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Cargos"
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
          <AvisoRetiro />
          <ListaCargos state={d.state} items={d.items} puedeGestionar={d.puedeGestionar} />
          {d.puedeGestionar ? <HojaCargo puedeVerSensible={d.puedeVerSensible} /> : null}
        </div>
      )}
    </PaginaPortal>
  );
}
