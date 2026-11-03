import { Plus } from "lucide-react";
import { type ReactNode, Suspense } from "react";

import { Loading, SplitScreen } from "@opai/ds";

import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";
import { PaginaPortal } from "@/app/_components/pagina-portal";
import { conBusqueda, leerParametros, type SearchParams } from "@/lib/parametros";

import { cargarCotizaciones, cargarFichaCotizacion } from "./datos";
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
      acciones={
        <EnlaceBoton href="/cotizaciones/nueva" icono={Plus} className="max-lg:hidden">
          Nueva cotización
        </EnlaceBoton>
      }
      opciones={(d) => ({ volver: { href: conBusqueda("/cotizaciones", d.p.q), etiqueta: "Cotizaciones" } })}
      cargar={async () => {
        const [{ id }, p] = await Promise.all([params, leerParametros(searchParams)]);
        const datos = cargarFichaCotizacion(id);
        datos.catch(() => undefined);
        const lista = await cargarCotizaciones(p["cursor"]);
        return { id, p, datos, lista };
      }}
    >
      {({ id, p, datos, lista }) => (
        <SplitScreen
          telefono="detalle"
          unPanelHastaLg
          etiquetaLista="Lista de cotizaciones"
          lista={
            <ListaCotizaciones
              datos={lista}
              seleccionada={id}
              {...(p.q !== undefined && p.q !== "" ? { q: p.q } : {})}
            />
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
