import { PaginaPortal } from "@/app/_components/pagina-portal";
import { leerParametros, type SearchParams } from "@/lib/parametros";

import { MisTareas } from "./_componentes/mis-tareas";

export const metadata = { title: "Mis tareas" };

/** Mis tareas (CAR-162): vencidas, hoy, esta semana y más adelante; las propias o las del equipo. */
export default function Tareas({ searchParams }: { searchParams: SearchParams }) {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Mis tareas"
      ruta="/tareas"
      cargar={async () => ({ ver: (await leerParametros(searchParams))["ver"] })}
    >
      {(d) => <MisTareas ver={d.ver === "equipo" ? "equipo" : "yo"} />}
    </PaginaPortal>
  );
}
