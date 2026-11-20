import { PaginaPortal } from "@/app/_components/pagina-portal";
import { leerParametros, type SearchParams } from "@/lib/parametros";
import { ejecutarComoUsuario } from "@/lib/servidor";

import { ListaAsistenciaHoyErp, type DatosAsistenciaHoy } from "./_componentes/lista-asistencia-hoy";

export const metadata = { title: "Asistencia de hoy" };
type Props = { searchParams: SearchParams };

/** «Asistencia de hoy» (A3): presentes, sin marca, atrasos y correcciones pendientes de los turnos del día. */
export default async function AsistenciaHoy({ searchParams }: Props) {
  const p = await leerParametros(searchParams);
  return (
    <PaginaPortal
      portal="erp"
      titulo="Asistencia de hoy"
      ruta="/asistencia"
      completo
      cargar={async () =>
        ejecutarComoUsuario<DatosAsistenciaHoy>("erp", "asistencia.dias.hoy", {
          ...(p.estado ? { estado: p.estado } : {}),
          ...(p.q ? { q: p.q } : {}),
          ...(p.cursor ? { cursor: p.cursor } : {}),
        })
      }
    >
      {(r) => <ListaAsistenciaHoyErp resultado={r} parametros={p} />}
    </PaginaPortal>
  );
}