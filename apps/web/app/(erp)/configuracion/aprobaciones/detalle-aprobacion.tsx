import { Bot, MessageSquareQuote } from "lucide-react";

import { Badge, Table, Td, Th, Tr } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";
import { margenPctTexto } from "@/lib/cpq-presentacion";
import { fecha, hora, pesos } from "@/lib/fechas";
import { etiquetaCapacidad } from "../auditoria/_componentes/capacidad";

import { AccionesDetalle } from "./acciones-detalle";
import { type Aprobacion, ESTADO, quien, RIESGO } from "./tipos";

const OCULTAS = new Set(["motivo", "idempotencyKey"]);
const texto = (v: unknown) =>
  v === null || v === undefined ? "—" : typeof v === "object" ? JSON.stringify(v) : String(v);

/** Detalle de una aprobación (44): riesgo, quién la propone, motivo del agente y valores propuestos. */
export function DetalleAprobacion({ a }: { a: Aprobacion }) {
  const input = a.input && typeof a.input === "object" ? (a.input as Record<string, unknown>) : {};
  const motivo = typeof input["motivo"] === "string" ? input["motivo"] : null;
  const comentario =
    typeof input["comentario"] === "string" ? input["comentario"] : a.ambito === "cpq" ? null : motivo;
  const campos = Object.entries(input).filter(
    ([k]) => !OCULTAS.has(k) && !["comentario", "tipo", "cotizacionId"].includes(k),
  );
  const esCpq = a.ambito === "cpq";
  return (
    <article className="flex min-h-full flex-1 flex-col gap-4">
      <p className="flex flex-wrap items-center gap-2">
        <Badge tono={RIESGO[a.riesgo].tono}>{RIESGO[a.riesgo].etiqueta}</Badge>
        <span className="t-caption">
          {a.riesgo === "alto"
            ? "Acción irreversible · requiere aprobación"
            : esCpq
              ? "Aprobación CPQ · margen o envío conjunto"
              : "Requiere aprobación"}
        </span>
        {a.estado !== "pendiente" ? (
          <Badge tono={ESTADO[a.estado].tono}>{ESTADO[a.estado].etiqueta}</Badge>
        ) : null}
      </p>
      <h2 className="t-heading text-fg">{a.resumen}</h2>
      <p className="flex items-start gap-2 text-base text-fg-muted">
        {esCpq ? null : <Bot className="mt-0.5 size-4 flex-none text-accent" aria-hidden />}
        <span>
          {esCpq ? "Pedido por" : "Propuesto por"}{" "}
          <strong className="font-semibold text-fg">{quien(a)}</strong> · {fecha(a.creadaEn)}{" "}
          {hora(a.creadaEn)}
          {!esCpq ? (
            <>
              {" "}
              · <span>{etiquetaCapacidad(a.capability)}</span>
            </>
          ) : null}
        </span>
      </p>
      {esCpq ? (
        <Table>
          <tbody>
            <Tr>
              <Td className="t-mono text-sm">Cotización</Td>
              <Td>
                <LinkNext href={`/cotizaciones/${String(input.cotizacionId)}`} className="text-accent">
                  {String(input.codigo ?? "")} · {String(input.titulo ?? "")}
                </LinkNext>
              </Td>
            </Tr>
            <Tr>
              <Td className="t-mono text-sm">Cliente</Td>
              <Td>{String(input.cuentaNombre ?? "—")}</Td>
            </Tr>
            <Tr>
              <Td className="t-mono text-sm">Venta mensual</Td>
              <Td className="t-numeric">
                {typeof input.ventaMensualClp === "number"
                  ? pesos(input.ventaMensualClp as number)
                  : "Pendiente"}
              </Td>
            </Tr>
            <Tr>
              <Td className="t-mono text-sm">Margen vs mínimo</Td>
              <Td className="t-numeric">
                {typeof input.margenEfectivoPct === "number"
                  ? `${margenPctTexto(input.margenEfectivoPct as number)} (mín. ${margenPctTexto(input.margenMinimoPct as number)})`
                  : "—"}
              </Td>
            </Tr>
          </tbody>
        </Table>
      ) : null}
      {comentario ? (
        <p className="flex items-start gap-2 rounded-md bg-fill p-3 text-base text-fg">
          <MessageSquareQuote className="mt-0.5 size-4 flex-none text-fg-muted" aria-hidden />“
          {comentario}”
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
      {a.estado === "pendiente" ? (
        <AccionesDetalle id={a.id} plataforma={a.ambito === "plataforma"} />
      ) : null}
    </article>
  );
}
