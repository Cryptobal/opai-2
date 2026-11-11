import { FileText } from "lucide-react";
import { type ReactNode, Suspense } from "react";

import { Loading, SplitScreen } from "@opai/ds";

import { PaginaPortal } from "@/app/_components/pagina-portal";
import { leerParametros, type SearchParams } from "@/lib/parametros";

import { cargarVentas } from "./datos";
import { DetalleVenta } from "./detalle-venta";
import { cargarFichaVenta } from "./ficha-datos";
import { conFiltros } from "./filtros-url";
import { ListaVentasMaestro } from "./lista-ventas-maestro";

type Props = {
  searchParams: SearchParams;
  /** Con `id`, el panel derecho muestra esa venta; sin `id`, un vacío («Elige un documento»). */
  params?: Promise<{ id: string }>;
};

/**
 * Libro de ventas con maestro-detalle (CAR-255), como Cotizaciones: el Libro a la izquierda y la factura elegida
 * (borrador o emitida) a la derecha. En teléfono y bajo 1024 px es una pantalla a la vez: el detalle con «Atrás».
 */
export function PaginaVentas({ searchParams, params }: Props): ReactNode {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Ventas (DTE)"
      ruta="/finanzas/ventas"
      completo
      {...(params ? { cargando: "detalle" as const, volverSoloTelefono: true, volverBajoLg: true } : {})}
      opciones={(d) => (params ? { volver: { href: conFiltros("/finanzas/ventas", d.p), etiqueta: "Ventas" } } : {})}
      cargar={async () => {
        const [id, p] = await Promise.all([params?.then((x) => x.id), leerParametros(searchParams)]);
        const editar = p["editar"] === "1";
        const ficha = id ? cargarFichaVenta(id) : undefined;
        ficha?.catch(() => undefined);
        const libro = await cargarVentas(searchParams);
        return { id, p, editar, ficha, libro };
      }}
    >
      {({ id, p, editar, ficha, libro }) => (
        <SplitScreen
          telefono={ficha ? "detalle" : "lista"}
          unPanelHastaLg
          etiquetaLista="Libro de ventas"
          etiquetaDetalle="Detalle de la venta"
          vacio={{ texto: "Elige un documento", icono: FileText }}
          lista={<ListaVentasMaestro datos={libro} params={p} {...(id ? { seleccionada: id } : {})} />}
          {...(ficha
            ? {
                detalle: (
                  <Suspense fallback={<Loading variante="detalle" />}>
                    <DetalleVenta datos={ficha} editar={editar} />
                  </Suspense>
                ),
              }
            : {})}
        />
      )}
    </PaginaPortal>
  );
}
