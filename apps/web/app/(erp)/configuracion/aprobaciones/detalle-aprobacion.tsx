import { Bot, MessageSquareQuote } from "lucide-react";

import { Badge, Table, Td, Th, Tr } from "@opai/ds";

import { fecha, hora } from "@/lib/fechas";

import { AccionesDetalle } from "./acciones-detalle";
import { type Aprobacion, ESTADO, quien, RIESGO } from "./tipos";

const OCULTAS = new Set(["motivo", "idempotencyKey"]);
const texto = (v: unknown) =>
  v === null || v === undefined ? "—" : typeof v === "object" ? JSON.stringify(v) : String(v);

/** Detalle de una aprobación (44): riesgo, quién la propone, motivo del agente y valores propuestos. */
export function DetalleAprobacion({ a }: { a: Aprobacion }) {
  const input = a.input && typeof a.input === "object" ? (a.input as Record<string, unknown>) : {};
  const motivo = typeof input["motivo"] === "string" ? input["motivo"] : null;
  const campos = Object.entries(input).filter(([k]) => !OCULTAS.has(k));
  return (
    <article className="flex min-h-full flex-1 flex-col gap-4">
      <p className="flex flex-wrap items-center gap-2">
        <Badge tono={RIESGO[a.riesgo].tono}>{RIESGO[a.riesgo].etiqueta}</Badge>
        <span className="t-caption">
          {a.riesgo === "alto"
            ? "Capacidad irreversible · requiere aprobación (ADR-032)"
            : "Requiere aprobación"}
        </span>
        {a.estado !== "pendiente" ? (
          <Badge tono={ESTADO[a.estado].tono}>{ESTADO[a.estado].etiqueta}</Badge>
        ) : null}
      </p>
      <h2 className="t-heading text-fg">{a.resumen}</h2>
      <p className="flex items-start gap-2 text-base text-fg-muted">
        <Bot className="mt-0.5 size-4 flex-none text-accent" aria-hidden />
        <span>
          Propuesto por <strong className="font-semibold text-fg">{quien(a)}</strong> ·{" "}
          {fecha(a.creadaEn)} {hora(a.creadaEn)} · <span className="t-mono">{a.capability}</span>
        </span>
      </p>
      {motivo ? (
        <p className="flex items-start gap-2 rounded-md bg-fill p-3 text-base text-fg">
          <MessageSquareQuote className="mt-0.5 size-4 flex-none text-fg-muted" aria-hidden />“
          {motivo}”
        </p>
      ) : null}
      {campos.length ? (
        <Table>
          <thead>
            <tr>
              <Th>Campo</Th>
              <Th>Valor propuesto</Th>
            </tr>
          </thead>
          <tbody>
            {campos.map(([k, v]) => (
              <Tr key={k}>
                <Td className="t-mono text-sm">{k}</Td>
                <Td className="bg-success-muted whitespace-normal text-success-fg">{texto(v)}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      ) : null}
      {a.estado === "rechazada" && a.motivo ? (
        <p className="text-base text-fg-muted">Motivo del rechazo: “{a.motivo}”</p>
      ) : null}
      {a.estado === "pendiente" ? <AccionesDetalle id={a.id} /> : null}
    </article>
  );
}
