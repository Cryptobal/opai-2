import { PaginaPortal } from "@/app/_components/pagina-portal";
import { leerParametros } from "@/lib/parametros";

import { CuerpoTurnosExtra } from "./cuerpo-turnos-extra";
import { cargarTurnosExtra } from "./datos";
import { RUTA_TURNOS_EXTRA } from "./tipos";

type Q = Record<string, string | string[] | undefined>;

export function PaginaTurnosExtra({ searchParams }: { searchParams: Promise<Q> }) {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Turnos extra"
      ruta={RUTA_TURNOS_EXTRA}
      cargando="lista"
      cargar={async () => cargarTurnosExtra(await leerParametros(searchParams))}
    >
      {(d) => <CuerpoTurnosExtra d={d} />}
    </PaginaPortal>
  );
}