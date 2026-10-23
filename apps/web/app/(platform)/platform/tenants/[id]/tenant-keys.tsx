"use client";

import { Badge, Empty } from "@opai/ds";

import { fechaHora } from "@/lib/formato";

import type { DetalleTenant } from "./tenant-detalle";

/** API keys del tenant (solo lectura en Plataforma). */
export function ApiKeysTenant({ detalle }: { detalle: DetalleTenant }) {
  if (detalle.apiKeys.length === 0) return <Empty titulo="Sin API keys" />;
  return (
    <ul className="divide-y divide-border">
      {detalle.apiKeys.map((k) => (
        <li key={k.id} className="flex min-h-14 items-center justify-between gap-3 py-2">
          <span className="min-w-0">
            <span className="block truncate text-base font-medium text-fg">{k.nombre}</span>
            <span className="t-mono block truncate text-sm text-fg-muted">{k.prefijo}…</span>
            <span className="t-caption block">Último uso {fechaHora(k.ultimoUsoEn)}</span>
          </span>
          {k.revocadaEn ? <Badge>Revocada</Badge> : <Badge tono="success">Activa</Badge>}
        </li>
      ))}
    </ul>
  );
}
