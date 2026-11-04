import { Wallet } from "lucide-react";

import { Badge, Card, type EstadoPantalla, ListScreen } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";
import { fecha, pesos, rut } from "@/lib/fechas";

import { TRAMO } from "./etiquetas";
import type { Deudor, ResumenCobranza, Tramo } from "./tipos";

const TRAMOS_VENCIDOS: Tramo[] = ["1_30", "31_60", "61_mas"];

function Tramos({ r }: { r: ResumenCobranza }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {TRAMOS_VENCIDOS.map((t) => (
        <Card key={t} className="p-3 flex flex-col gap-1">
          <span className="text-xs text-fg-muted">{TRAMO[t].etiqueta}</span>
          <span className="t-numeric font-medium">{pesos(r.tramos[t])}</span>
        </Card>
      ))}
    </div>
  );
}

/** Deudores con facturas vencidas, del más atrasado al menos. */
export function ListaCobranza(p: { state: EstadoPantalla; resumen: ResumenCobranza | null }) {
  const r = p.resumen;
  return (
    <ListScreen<Deudor>
      state={p.state}
      titulo="Cobranza"
      subtitulo={r ? `Vencido ${pesos(r.totalVencido)} · ${r.deudores.length} deudores` : "Facturas vencidas por tramo"}
      filtros={r ? <Tramos r={r} /> : undefined}
      items={r?.deudores ?? []}
      clave={(d) => d.cuentaId}
      href={(d) => `/finanzas/cobranza/${d.cuentaId}`}
      Link={LinkNext}
      textos={{
        vacio: { titulo: "Sin deudas vencidas", descripcion: "Cuando una factura venza, el deudor aparece en su tramo." },
      }}
      tarjeta={(d) => (
        <>
          <span className="flex size-10 flex-none items-center justify-center rounded-sm bg-fill text-fg-muted">
            <Wallet className="size-4" aria-hidden />
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="truncate font-medium">{d.nombre}</span>
            <span className="text-sm text-fg-muted">
              {d.facturasVencidas} {d.facturasVencidas === 1 ? "factura" : "facturas"} ·{" "}
              {d.ultimaGestion ? `última gestión ${fecha(d.ultimaGestion.slice(0, 10))}` : "sin gestión"}
            </span>
          </span>
          <span className="flex flex-none flex-col items-end gap-1">
            <span className="t-numeric font-medium">{pesos(d.saldoVencido)}</span>
            <Badge tono={TRAMO[d.tramo].tono}>{TRAMO[d.tramo].etiqueta}</Badge>
          </span>
        </>
      )}
      columnas={[
        {
          id: "cliente",
          etiqueta: "Cliente",
          render: (d) => (
            <span className="flex flex-col">
              <span>{d.nombre}</span>
              <span className="t-mono text-xs text-fg-muted">{d.rut ? rut(d.rut) : "—"}</span>
            </span>
          ),
        },
        { id: "facturas", etiqueta: "Facturas", className: "text-right t-numeric", render: (d) => d.facturasVencidas },
        { id: "saldo", etiqueta: "Saldo vencido", className: "text-right t-numeric", render: (d) => pesos(d.saldoVencido) },
        { id: "tramo", etiqueta: "Tramo", render: (d) => <Badge tono={TRAMO[d.tramo].tono}>{TRAMO[d.tramo].etiqueta}</Badge> },
        {
          id: "gestion",
          etiqueta: "Última gestión",
          render: (d) => (d.ultimaGestion ? fecha(d.ultimaGestion.slice(0, 10)) : "Sin gestión"),
        },
      ]}
    />
  );
}
