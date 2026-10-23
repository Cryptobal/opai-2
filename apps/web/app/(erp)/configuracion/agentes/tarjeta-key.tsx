import { Badge, BarraProgreso, tonoUso } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";
import { haceCuanto } from "@/lib/fechas";

import { type ApiKey, usd } from "./datos";

export function estadoKey(k: ApiKey, uso: number) {
  if (k.revocadaEn) return <Badge>Revocada</Badge>;
  if (!k.valida) return <Badge tono="danger">Inválida</Badge>;
  if (uso >= 0.8) return <Badge tono="warning">Al {Math.round(uso * 100)} %</Badge>;
  return <Badge tono="success">Activa</Badge>;
}

/** Fila de una key (24): nombre y prefijo, scopes, responsable y último uso; estado y presupuesto. */
export function TarjetaKey({ k, gasto }: { k: ApiKey; gasto: number }) {
  const tope = k.presupuestoMensualUsd;
  const uso = tope ? gasto / tope : 0;
  return (
    <li className="relative flex flex-col gap-3 border-b border-border p-4 last:border-b-0 md:flex-row md:items-start">
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <LinkNext
          href={`/configuracion/agentes/${k.id}`}
          className="flex min-w-0 items-baseline gap-2 after:absolute after:inset-0 focus-visible:outline-2 focus-visible:outline-focus"
        >
          <span className="truncate text-base font-semibold text-fg">{k.nombre}</span>
          <span className="t-mono truncate text-sm text-fg-muted">{k.prefijo}…</span>
        </LinkNext>
        <span className="flex flex-wrap gap-1.5">
          {(k.scopes.includes("*") ? ["todos los módulos"] : k.scopes).map((s) => (
            <Badge key={s} punto={false}>
              {s}
            </Badge>
          ))}
        </span>
        <span className="t-caption">
          Responsable {k.responsable.nombre} ·{" "}
          {k.ultimoUsoEn ? `último uso ${haceCuanto(k.ultimoUsoEn)}` : "sin uso todavía"}
        </span>
      </div>
      <div className="flex flex-col gap-1.5 md:w-48">
        <span className="flex items-center justify-between gap-2">
          {estadoKey(k, uso)}
          <span className="t-numeric text-sm text-fg-muted">
            {tope ? `${Math.round(uso * 100)} %` : ""}
          </span>
        </span>
        <BarraProgreso
          valor={uso}
          tono={tonoUso(uso)}
          etiqueta={`Presupuesto usado de ${k.nombre}`}
        />
        <span className="t-caption">
          {tope ? `${usd(gasto)} de ${usd(tope)}` : `${usd(gasto)} · sin tope`}
        </span>
      </div>
    </li>
  );
}
