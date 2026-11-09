import { Badge, Card } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";
import { pesos } from "@/lib/fechas";

import type { DetalleProgramacion, TrazaPeriodo } from "./tipos";

const COBRO: Record<string, string> = { pendiente: "Cobro pendiente", pagada_parcial: "Cobro parcial", pagada: "Cobrada", cedida: "Cedida" };

/** Una insignia por paso del período: proforma, estado de pago, factura y cobro. */
function Pasos({ t }: { t: TrazaPeriodo }) {
  const previos = t.previos.map((p) => (
    <Badge key={p.tipo} tono={p.estado === "enviado" ? "info" : "warning"}>
      {p.tipo === "proforma" ? "Proforma" : "Estado de pago"} {p.estado === "enviado" ? "enviado" : "no salió"}
    </Badge>
  ));
  const factura =
    t.folio !== null ? <Badge tono="success">Factura N° {t.folio}</Badge> : <Badge tono="neutro">Borrador</Badge>;
  const cobro = t.estadoCobro ? <Badge tono={t.estadoCobro === "pagada" ? "success" : "neutro"}>{COBRO[t.estadoCobro] ?? t.estadoCobro}</Badge> : null;
  return (
    <span className="flex flex-wrap gap-1">
      {previos}
      {factura}
      {cobro}
    </span>
  );
}

export function Historial({ item }: { item: DetalleProgramacion }) {
  return (
    <Card className="flex flex-col gap-2 p-4">
      <h2 className="t-label text-fg">Borradores generados</h2>
      {item.corridas.length === 0 ? (
        <p className="text-sm text-fg-muted">Todavía no se genera ningún borrador.</p>
      ) : (
        <ul className="divide-y divide-border text-sm">
          {item.corridas.map((c) => (
            <li key={c.periodo} className="flex flex-col gap-1 py-2">
              <span className="flex justify-between gap-3">
                {c.documentoId ? (
                  <LinkNext href={`/finanzas/ventas/${c.documentoId}`} className="underline">
                    {c.periodo}
                  </LinkNext>
                ) : (
                  <span>{c.periodo} · importado de OPAI 1.0</span>
                )}
                <span className="t-numeric">{c.montoTotal !== null ? pesos(c.montoTotal) : "—"}</span>
              </span>
              {c.traza ? <Pasos t={c.traza} /> : null}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
