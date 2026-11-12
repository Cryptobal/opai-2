import { FileText } from "lucide-react";

import { Badge, type Columna, ListScreen } from "@opai/ds";
import { formatearClp } from "@opai/domain";

import { LinkNext } from "@/app/_components/link-next";
import { fecha } from "@/lib/fechas";

import type { ItemCotizacion } from "./tipos";

const total = (c: ItemCotizacion) => (c.netoMensualClp === null ? "—" : `${formatearClp(c.netoMensualClp)} / mes`);

/** Vigente = enviada y dentro de su plazo; vencida si pasó «válida hasta» (se calcula al leer, sin tareas). */
export function estadoCotizacion(c: ItemCotizacion, hoy = new Date()): { etiqueta: string; tono: "success" | "neutro" } {
  const vence = c.validaHasta ? new Date(`${c.validaHasta}T23:59:59`) : null;
  return vence && vence < hoy ? { etiqueta: "Vencida", tono: "neutro" } : { etiqueta: "Vigente", tono: "success" };
}

const columnas: Columna<ItemCotizacion>[] = [
  { id: "codigo", etiqueta: "Número", render: (c) => <span className="t-numeric">{c.codigo}</span> },
  { id: "enviada", etiqueta: "Fecha", render: (c) => <span className="t-numeric">{c.enviadaEn ? fecha(c.enviadaEn) : "—"}</span> },
  { id: "titulo", etiqueta: "Servicio", render: (c) => <span className="font-medium">{c.titulo}</span> },
  { id: "estado", etiqueta: "Estado", render: (c) => <Badge tono={estadoCotizacion(c).tono}>{estadoCotizacion(c).etiqueta}</Badge> },
  { id: "total", etiqueta: "Total neto", className: "text-right", render: (c) => <span className="t-numeric font-medium">{total(c)}</span> },
];

/** Lista de cotizaciones enviadas (08): tabla en pantallas anchas, filas-tarjeta en teléfono; cada fila abre el detalle. */
export function ListaCotizaciones({ items }: { items: readonly ItemCotizacion[] }) {
  return (
    <ListScreen
      state="ready"
      titulo="Cotizaciones"
      soloTelefono
      items={items}
      clave={(c) => c.cotizacionId}
      href={(c) => `/cliente/cotizaciones/${c.cotizacionId}`}
      Link={LinkNext}
      columnas={columnas}
      tarjeta={(c) => (
        <>
          <FileText aria-hidden className="mt-0.5 size-5 shrink-0 text-fg-subtle" />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate font-medium">{c.titulo}</span>
            <span className="t-caption t-numeric">
              {c.codigo} · {c.enviadaEn ? fecha(c.enviadaEn) : "—"} · {total(c)}
            </span>
          </span>
          <Badge tono={estadoCotizacion(c).tono}>{estadoCotizacion(c).etiqueta}</Badge>
        </>
      )}
      textos={{ vacio: { titulo: "Aún no tienes cotizaciones", descripcion: "Cuando tu empresa de seguridad te envíe una, aparecerá aquí." } }}
    />
  );
}
