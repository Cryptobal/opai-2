import { PaginaPortal } from "@/app/_components/pagina-portal";
import { puedeDeIdentidad } from "@/lib/permisos-ui";
import type { SearchParams } from "@/lib/parametros";
import { leerParametros } from "@/lib/parametros";
import { requerirIdentidad } from "@/lib/servidor";

import { ContenidoPauta } from "./_componentes/contenido-pauta";
import { cargarPauta } from "./_componentes/datos";

export const metadata = { title: "Pauta" };

type Props = { searchParams: SearchParams };

/**
 * Pauta · Mensual y Diaria (Operaciones, Brief 11b PR 1–2). Sin `?inst` muestra todas las instalaciones; con una
 * instalación, su grilla o la vista diaria (CAR-86).
 */
export default function Pauta({ searchParams }: Props) {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Pauta"
      ruta="/pauta"
      completo
      cargar={async () => {
        const identidad = await requerirIdentidad("/pauta");
        const puedeEditar = puedeDeIdentidad(identidad)("pauta:write");
        return { d: await cargarPauta(await leerParametros(searchParams)), puedeEditar };
      }}
    >
      {({ d, puedeEditar }) => <ContenidoPauta d={d} puedeEditar={puedeEditar} />}
    </PaginaPortal>
  );
}
