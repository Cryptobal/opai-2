import { FileText } from "lucide-react";
import { type ReactNode, Suspense } from "react";

import { Loading, SplitScreen } from "@opai/ds";

import { PaginaPortal } from "@/app/_components/pagina-portal";
import { leerParametros, type SearchParams } from "@/lib/parametros";

import { cargarLibro, periodosRecientes } from "./datos";
import { HojaCompra, HojaLote, HojaRcv, HojaSii } from "./diferidas";
import { DetalleCompra } from "./ficha-compra";
import { cargarFichaCompra } from "./ficha-datos";
import { conFiltrosCompras } from "./filtros-url";
import { ListaComprasMaestro } from "./lista-compras-maestro";

type Props = {
  searchParams: SearchParams;
  /** Con `id`, el panel derecho muestra ese documento; sin `id`, un vacío («Elige un documento»). */
  params?: Promise<{ id: string }>;
};

/**
 * Libro de compras con maestro-detalle (CAR-256), como Ventas (CAR-255): el libro a la izquierda y el documento
 * elegido a la derecha. En teléfono y bajo 1024 px es una pantalla a la vez: el detalle con «Atrás».
 */
export function PaginaCompras({ searchParams, params }: Props): ReactNode {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Compras"
      ruta="/finanzas/compras"
      completo
      {...(params ? { cargando: "detalle" as const, volverSoloTelefono: true, volverBajoLg: true } : {})}
      opciones={(d) => (params ? { volver: { href: conFiltrosCompras("/finanzas/compras", d.p), etiqueta: "Compras" } } : {})}
      cargar={async () => {
        const [id, p] = await Promise.all([params?.then((x) => x.id), leerParametros(searchParams)]);
        const ficha = id ? cargarFichaCompra(id) : undefined;
        ficha?.catch(() => undefined);
        const libro = await cargarLibro(searchParams);
        return { id, p, ficha, libro };
      }}
    >
      {({ id, p, ficha, libro }) => (
        <>
          <SplitScreen
            telefono={ficha ? "detalle" : "lista"}
            unPanelHastaLg
            etiquetaLista="Libro de compras"
            etiquetaDetalle="Detalle del documento"
            vacio={{ texto: "Elige un documento", icono: FileText }}
            lista={<ListaComprasMaestro datos={libro} params={p} {...(id ? { seleccionada: id } : {})} />}
            {...(ficha
              ? {
                  detalle: (
                    <Suspense fallback={<Loading variante="detalle" />}>
                      <DetalleCompra datos={ficha} centros={libro.centros} gestiona={libro.gestiona} />
                    </Suspense>
                  ),
                }
              : {})}
          />
          {libro.gestiona ? (
            <>
              <HojaCompra proveedores={libro.proveedores} centros={libro.centros} puedeCrearProveedores={libro.puedeCrearProveedores} />
              <HojaRcv puedeCrearProveedores={libro.puedeCrearProveedores} />
              <HojaSii periodos={periodosRecientes().slice(0, 3)} />
              <HojaLote centros={libro.centros} documentos={(libro.libro?.items ?? []).filter((c) => !c.centroCostoId)} />
            </>
          ) : null}
        </>
      )}
    </PaginaPortal>
  );
}
