import { Badge, Empty } from "@opai/ds";
import { formatearClp, formatearFecha } from "@opai/domain";

import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";

import { BotonPdf } from "./boton-pdf";

export type Factura = {
  id: string;
  tipo: string;
  folio: number;
  fechaEmision: string | null;
  fechaVencimiento: string | null;
  montoTotal: number;
  estadoDte: string;
  estadoCobro: string;
  instalacion: string | null;
};

const COBRO: Record<string, { tono: "success" | "warning" | "neutro" | "info"; texto: string }> = {
  pendiente: { tono: "warning", texto: "Por pagar" },
  pagada_parcial: { tono: "info", texto: "Pago parcial" },
  pagada: { tono: "success", texto: "Pagada" },
  cedida: { tono: "neutro", texto: "Cedida" },
};

/** Facturas y notas emitidas a la cuenta (CAR-518), de la más reciente a la más antigua, con su PDF. */
export function ListaFacturas({
  items,
  siguiente,
}: {
  items: Factura[];
  siguiente: string | null;
}) {
  if (items.length === 0)
    return (
      <Empty
        titulo="Sin facturas"
        descripcion="Cuando tu empresa de seguridad te emita una factura, la verás aquí."
      />
    );
  return (
    <div className="flex flex-col gap-4">
      <ul className="overflow-hidden rounded-lg border border-border bg-surface">
        {items.map((f) => {
          const cobro =
            f.estadoDte === "anulado_nc"
              ? { tono: "neutro" as const, texto: "Anulada" }
              : COBRO[f.estadoCobro];
          return (
            <li
              key={f.id}
              className="flex min-h-16 items-center gap-3 border-b border-border px-4 py-2.5 last:border-b-0"
            >
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-base font-medium text-fg">{`${f.tipo} N° ${f.folio}`}</span>
                  {cobro ? <Badge tono={cobro.tono}>{cobro.texto}</Badge> : null}
                </span>
                <span className="block truncate text-sm text-fg-muted">
                  {[
                    `Emitida el ${formatearFecha(f.fechaEmision)}`,
                    f.fechaVencimiento ? `vence el ${formatearFecha(f.fechaVencimiento)}` : null,
                    f.instalacion,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </span>
              <span className="t-numeric font-medium text-fg">{formatearClp(f.montoTotal)}</span>
              <BotonPdf documentoId={f.id} nombre={`documento-${f.folio}.pdf`} />
            </li>
          );
        })}
      </ul>
      {siguiente ? (
        <div>
          <EnlaceBoton href={`/cliente/facturas?desde=${siguiente}`} variante="secondary">
            Ver más antiguas
          </EnlaceBoton>
        </div>
      ) : null}
    </div>
  );
}
