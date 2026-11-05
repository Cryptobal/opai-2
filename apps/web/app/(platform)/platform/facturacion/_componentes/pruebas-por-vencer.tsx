import { Badge, SeccionTarjeta } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";

import { type Resumen, textoVence } from "./cobro";

/** Pruebas de módulos que vencen en siete días o menos: el aviso a Plataforma (ADR-071, adenda). */
export function PruebasPorVencer({ pruebas }: { pruebas: Resumen["pruebasPorVencer"] }) {
  if (pruebas.length === 0) return null;
  return (
    <SeccionTarjeta titulo="Pruebas por vencer" sinRelleno>
      <ul>
        {pruebas.map((p) => (
          <li
            key={`${p.tenantId}-${p.moduloId}`}
            className="border-b border-border last:border-b-0"
          >
            <LinkNext
              href={`/platform/tenants/${p.tenantId}/cobro`}
              className="flex min-h-12 flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2"
            >
              <span className="min-w-0 flex-1 truncate text-base text-fg">
                {p.empresa} · {p.nombre}
              </span>
              <Badge tono={p.diasRestantes <= 2 ? "danger" : "warning"}>
                {textoVence(p.diasRestantes)}
              </Badge>
              <span className="t-caption">
                {p.pasaACobro ? "Luego se cobra" : "Luego solo lectura"}
              </span>
            </LinkNext>
          </li>
        ))}
      </ul>
    </SeccionTarjeta>
  );
}
