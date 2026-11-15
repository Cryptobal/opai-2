import { type ReactNode, Suspense } from "react";

import { Loading, SplitScreen } from "@opai/ds";

import { PaginaPortal } from "@/app/_components/pagina-portal";
import { leerParametros, type SearchParams } from "@/lib/parametros";

import { cargarCotizaciones, cargarFichaCotizacion } from "./datos";
import { conFiltrosCotizaciones } from "./filtros-cotizaciones";
import { DetalleCotizacion } from "./detalle-cotizacion";
import { ListaCotizaciones } from "./lista-cotizaciones";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: SearchParams;
  children: (datos: Awaited<ReturnType<typeof cargarFichaCotizacion>>) => ReactNode;
};

/** Lista a la izquierda y ficha a la derecha; en teléfono solo el detalle con «Atrás». */
export function PaginaCotizacion({ params, searchParams, children }: Props) {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Cotizaciones"
      ruta="/cotizaciones"
      completo
      cargando="detalle"
      volverSoloTelefono
      volverBajoLg
      opciones={(d) => ({ volver: { href: conFiltrosCotizaciones("/cotizaciones", d.p), etiqueta: "Cotizaciones" } })}
      cargar={async () => {
        const [{ id }, p] = await Promise.all([params, leerParametros(searchParams)]);
        const datos = cargarFichaCotizacion(id);
        datos.catch(() => undefined);
        const lista = await cargarCotizaciones(p);
        return { id, p, datos, lista };
      }}
    >
      {({ id, datos, lista }) => (
        <SplitScreen
          telefono="detalle"
          unPanelHastaLg
          etiquetaLista="Lista de cotizaciones"
          lista={
            <ListaCotizaciones datos={lista} seleccionada={id} />
          }
          detalle={
            <Suspense fallback={<Loading variante="detalle" />}>
              <DetalleCotizacion datos={datos}>{children}</DetalleCotizacion>
            </Suspense>
          }
        />
      )}
    </PaginaPortal>
  );
}
