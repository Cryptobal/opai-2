import { PaginaPortal } from "@/app/_components/pagina-portal";
import { leerParametros } from "@/lib/parametros";

import { CuerpoHistorialRondas } from "./cuerpo-historial";
import { cargarHistorial } from "./datos";
import { RUTA_HISTORIAL } from "./tipos";

type Q = Record<string, string | string[] | undefined>;

export function PaginaHistorialRondas({ searchParams }: { searchParams: Promise<Q> }) {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Historial de rondas"
      ruta={RUTA_HISTORIAL}
      cargando="lista"
      cargar={async () => cargarHistorial(await leerParametros(searchParams))}
    >
      {(d) => <CuerpoHistorialRondas d={d} />}
    </PaginaPortal>
  );
}