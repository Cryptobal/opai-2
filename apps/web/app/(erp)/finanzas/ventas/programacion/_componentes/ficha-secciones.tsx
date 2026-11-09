import { Badge, Card } from "@opai/ds";

import { fecha, pesos } from "@/lib/fechas";

import type { DetalleProgramacion } from "./tipos";

export type PeriodoPrevio = {
  periodo: string;
  fecha: string;
  estado: string;
  motivo: string | null;
  montoTotal: number | null;
};

const FRECUENCIA: Record<string, string> = {
  mensual: "Mensual",
  quincenal: "Quincenal",
  semanal: "Semanal",
  anual: "Anual",
};
const diaTexto = (d: number) => (d === -1 ? "último día" : `día ${d}`);

export function Resumen({
  item,
  acciones,
}: {
  item: DetalleProgramacion;
  acciones: React.ReactNode;
}) {
  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="t-title text-fg">{item.nombre}</h2>
        <Badge tono={item.activa ? "success" : "neutro"}>
          {item.activa ? "Activa" : "Pausada"}
        </Badge>
      </div>
      <p className="text-sm text-fg-muted">
        {item.cuentaNombre}
        {item.instalacionNombre ? ` · ${item.instalacionNombre}` : ""} · Factura{" "}
        {item.tipoDte === 34 ? "exenta" : "afecta"} ·{" "}
        {FRECUENCIA[item.frecuencia] ?? item.frecuencia}, {diaTexto(item.diaGeneracion)} · cobro a{" "}
        {item.plazoPagoDias} días
      </p>
      {item.autoEnvioProforma || item.autoEnvioEstadoPago ? (
        <p className="flex flex-wrap gap-2 text-sm">
          {item.autoEnvioProforma ? <Badge tono="info">Proforma antes de facturar</Badge> : null}
          {item.autoEnvioEstadoPago ? <Badge tono="info">Estado de pago antes de facturar</Badge> : null}
        </p>
      ) : null}
      <p className="text-sm">
        Neto por período{item.moneda === "UF" ? " (estimado con la UF de hoy)" : ""}:{" "}
        <span className="t-numeric">{pesos(item.montoTotal)}</span>
      </p>
      {item.activa ? (
        <p className="text-sm text-fg-muted">
          Próximo borrador:{" "}
          {item.proximaEjecucionEn ? fecha(item.proximaEjecucionEn) : "sin períodos pendientes"}
        </p>
      ) : null}
      {item.ultimoPeriodo10 ? (
        <p className="text-sm text-fg-muted">
          Último período facturado en OPAI 1.0: {item.ultimoPeriodo10}
        </p>
      ) : null}
      {acciones}
    </Card>
  );
}

export function Lineas({ item }: { item: DetalleProgramacion }) {
  return (
    <Card className="flex flex-col gap-2 p-4">
      <h2 className="t-label text-fg">Líneas</h2>
      <ul className="divide-y divide-border text-sm">
        {item.lineas.map((l, i) => (
          <li key={i} className="flex justify-between gap-3 py-2">
            <span>{l.glosa}</span>
            <span className="t-numeric">{pesos(l.monto)}</span>
          </li>
        ))}
      </ul>
      <h2 className="t-label mt-2 text-fg">Destinatarios</h2>
      {item.destinatarios.length === 0 ? (
        <p className="text-sm text-fg-muted">Sin destinatarios: agrégalos al editar.</p>
      ) : (
        <ul className="flex flex-col gap-1 text-sm">
          {item.destinatarios.map((d) => (
            <li key={d.contactoId}>
              {d.nombres} {d.apellidos}
              {d.email ? ` · ${d.email}` : ""}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export function Proximos({ periodos }: { periodos: PeriodoPrevio[] }) {
  return (
    <Card className="flex flex-col gap-2 p-4">
      <h2 className="t-label text-fg">Próximos períodos</h2>
      {periodos.length === 0 ? (
        <p className="text-sm text-fg-muted">La agenda no tiene períodos pendientes.</p>
      ) : (
        <ul className="divide-y divide-border text-sm">
          {periodos.map((p) => (
            <li key={p.periodo} className="flex justify-between gap-3 py-2">
              <span>
                {p.periodo} · {fecha(p.fecha)}
                {p.motivo ? <span className="block text-warning-fg">{p.motivo}</span> : null}
              </span>
              <span className="t-numeric">{p.montoTotal !== null ? pesos(p.montoTotal) : "—"}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
