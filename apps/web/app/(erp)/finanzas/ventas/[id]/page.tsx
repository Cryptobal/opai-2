import type { SearchParams } from "@/lib/parametros";

import { tituloVenta } from "../_componentes/etiquetas-venta";
import { cargarFichaVenta } from "../_componentes/ficha-datos";
import { PaginaVentas } from "../_componentes/pagina-ventas";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const d = await cargarFichaVenta(id);
    return { title: d.venta ? tituloVenta(d.venta) : "Venta" };
  } catch {
    return { title: "Venta" };
  }
}

/** Ficha de una venta: el Libro sigue a la izquierda y el detalle (borrador o emitida) se abre a la derecha (CAR-255). */
export default function VentaDetallePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: SearchParams }) {
  return <PaginaVentas params={params} searchParams={searchParams} />;
}
