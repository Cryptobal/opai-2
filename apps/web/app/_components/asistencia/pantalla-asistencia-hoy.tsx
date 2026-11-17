import { PaginaPortal } from "@/app/_components/pagina-portal";
import { leerParametros, type SearchParams } from "@/lib/parametros";
import { ejecutarComoUsuario } from "@/lib/servidor";

import { ListaAsistenciaHoy, type DatosAsistenciaHoy } from "./pantalla-asistencia-hoy-lista";

/** Lista compartida de Asistencia de hoy (ERP y Supervisor; ADR-022 en la capacidad). */
export function PantallaAsistenciaHoy({
  portal,
  ruta,
  searchParams,
}: {
  portal: "erp" | "supervisor";
  ruta: string;
  searchParams: SearchParams;
}) {
  return (
    <PaginaPortal
      portal={portal}
      titulo="Asistencia de hoy"
      ruta={ruta}
      completo
      cargar={async () => {
        const p = await leerParametros(searchParams);
        return ejecutarComoUsuario<DatosAsistenciaHoy>(
          portal,
          "asistencia.dias.hoy",
          p["estado"] ? { estado: p["estado"] } : {},
        );
      }}
    >
      {(r) => <ListaAsistenciaHoy resultado={r} />}
    </PaginaPortal>
  );
}