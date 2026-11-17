import { PaginaPortal } from "@/app/_components/pagina-portal";
import { identidadActual } from "@/lib/servidor";

import { cargarBandeja, cargarDetalleBandeja } from "./datos";
import { filtrosDe, RUTA_BANDEJA } from "./tipos";
import { VistaBandeja } from "./vista-bandeja";

type Q = Record<string, string | string[] | undefined>;

/** Bandeja del aprobador: totales, filtros y lista a la izquierda; detalle a la derecha (en teléfono, una pantalla cada uno). */
export function PaginaBandeja({ searchParams, params }: { searchParams: Promise<Q>; params?: Promise<{ id: string }> }) {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Bandeja del aprobador"
      ruta={RUTA_BANDEJA}
      cargando="lista"
      {...(params ? { volver: { href: RUTA_BANDEJA, etiqueta: "Bandeja" } } : {})}
      cargar={async () => {
        const filtros = filtrosDe(await searchParams);
        const id = params ? (await params).id : null;
        const [bandeja, detalle, identidad] = await Promise.all([
          cargarBandeja(filtros),
          id ? cargarDetalleBandeja(id) : null,
          identidadActual(),
        ]);
        return { filtros, bandeja, detalle, id, yoId: identidad?.usuario.id ?? "" };
      }}
    >
      {(props) => <VistaBandeja {...props} />}
    </PaginaPortal>
  );
}