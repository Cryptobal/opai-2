import { Badge, SeccionTarjeta } from "@opai/ds";

import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";

import { usd } from "../../_componentes/formato";
import { type Resumen, textoVence } from "../../facturacion/_componentes/cobro";
import type { PanelTenant, Trabajo } from "./tipos";

type Props = {
  problemas: Trabajo[];
  keys: PanelTenant["keys"];
  faltaRut: boolean;
  pruebas: Resumen["pruebasPorVencer"];
};

/** "Atención" (49): trabajos fallidos o reintentando y keys sobre el 80 % de su presupuesto. */
export function AtencionTenant({ problemas, keys: keysAlerta, faltaRut, pruebas }: Props) {
  return (
    <SeccionTarjeta titulo="Atención" sinRelleno>
      {problemas.length || keysAlerta.length || faltaRut || pruebas.length ? (
        <ul>
          {faltaRut ? (
            <li className="flex items-center gap-2 border-b border-border px-4 py-2.5 last:border-b-0">
              <Badge tono="warning">Falta el RUT</Badge>
              <span className="min-w-0 flex-1 truncate text-base text-fg">
                Sin RUT no se puede abrir una prueba ni facturar a esta empresa.
              </span>
            </li>
          ) : null}
          {pruebas.map((p) => (
            <li
              key={p.moduloId}
              className="flex items-center gap-2 border-b border-border px-4 py-2.5 last:border-b-0"
            >
              <Badge tono="warning">{textoVence(p.diasRestantes)}</Badge>
              <span className="min-w-0 flex-1 truncate text-base text-fg">
                Prueba de {p.nombre} ·{" "}
                {p.pasaACobro ? "luego se cobra" : "luego queda en solo lectura"}
              </span>
              <EnlaceBoton href={`/platform/tenants/${p.tenantId}/cobro`} variante="ghost">
                Abrir
              </EnlaceBoton>
            </li>
          ))}
          {problemas.map((p) => (
            <li
              key={p.id}
              className="flex items-center gap-2 border-b border-border px-4 py-2.5 last:border-b-0"
            >
              <Badge tono={p.estado === "fallido" ? "danger" : "warning"}>
                {p.estado === "fallido" ? "Fallido" : "Reintentando"}
              </Badge>
              <span className="min-w-0 flex-1 truncate text-base text-fg">
                <span className="t-mono">{p.tipo}</span>
                {p.ultimoError ? ` · ${p.ultimoError}` : ""}
              </span>
              <EnlaceBoton href={`/platform/trabajos?ver=${p.tenantId}:${p.id}`} variante="ghost">
                Abrir
              </EnlaceBoton>
            </li>
          ))}
          {keysAlerta.map((k) => (
            <li
              key={k.id}
              className="flex items-center gap-2 border-b border-border px-4 py-2.5 last:border-b-0"
            >
              <Badge tono="warning">
                Al {Math.round((k.gastadoUsd / (k.presupuestoUsd ?? 1)) * 100)} %
              </Badge>
              <span className="truncate text-base text-fg">
                Key {k.nombre} · {usd(k.gastadoUsd)} de {usd(k.presupuestoUsd)}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="px-4 py-4 text-base text-fg-muted">Nada requiere atención.</p>
      )}
    </SeccionTarjeta>
  );
}
