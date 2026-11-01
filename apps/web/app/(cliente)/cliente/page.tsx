import { PaginaPortal } from "@/app/_components/pagina-portal";
import { tituloPagina } from "@/app/_components/portales";
import { exigirDatos } from "@/lib/carga";
import { leerParametros, type SearchParams } from "@/lib/parametros";
import { ejecutarComoUsuario } from "@/lib/servidor";

import { ResumenDelMes, type ResumenMes } from "./_componentes/resumen-mes";

export const metadata = { title: tituloPagina("cliente", "Resumen") };

/**
 * Resumen del mes del Portal Cliente (01, CAR-88): el informe mensual por instalación habilitada.
 * Sin un acceso activo la capacidad responde FORBIDDEN y la página muestra «sin permisos»: el
 * alcance lo aplica el servidor, no la pantalla (ADR-022).
 */
export default function Pagina({ searchParams }: { searchParams: SearchParams }) {
  return (
    <PaginaPortal
      portal="cliente"
      titulo="Resumen"
      ruta="/cliente"
      cargando="lista"
      cargar={async () => {
        const { mes } = await leerParametros(searchParams);
        return exigirDatos(
          await ejecutarComoUsuario<ResumenMes>("cliente", "portal_cliente.resumen.leer", mes ? { mes } : {}),
        );
      }}
    >
      {(r) => <ResumenDelMes r={r} />}
    </PaginaPortal>
  );
}
