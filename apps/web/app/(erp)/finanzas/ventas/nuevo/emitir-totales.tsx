import { totalesVenta } from "@opai/domain/ventas-lineas";

import { pesos } from "@/lib/fechas";

/** Totales de la factura con el mismo cálculo que el servidor: afecta = neto + IVA 19 %; exenta = solo exento. */
export function EmitirTotales({ tipoDte, montos }: { tipoDte: "33" | "34"; montos: (number | null)[] }) {
  const t = totalesVenta(tipoDte === "34" ? 34 : 33, montos.filter((m): m is number => m != null));
  const filas =
    tipoDte === "33"
      ? [["Neto", t.neto], ["IVA (19 %)", t.iva], ["Total", t.total]]
      : [["Exento", t.exento], ["Total", t.total]];
  return (
    <dl className="grid gap-1 border-t border-border pt-3 text-sm" aria-label="Totales de la factura">
      {filas.map(([etiqueta, valor]) => (
        <div key={etiqueta} className={`flex justify-between gap-3 ${etiqueta === "Total" ? "t-label text-fg" : "text-fg-muted"}`}>
          <dt>{etiqueta}</dt>
          <dd className="t-numeric">{pesos(valor as number)}</dd>
        </div>
      ))}
    </dl>
  );
}
