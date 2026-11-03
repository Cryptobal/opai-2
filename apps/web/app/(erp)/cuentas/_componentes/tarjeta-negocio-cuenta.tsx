import { Badge } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";
import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";
import { pesos } from "@/lib/fechas";

import type { NegocioFila } from "../../negocios/_componentes/datos";

export type CotizacionCuenta = {
  id: string;
  codigo: string;
  titulo: string;
  negocioId: string;
  version: { estado: string; ventaMensualClp: number | null } | null;
};

const ESTADO_COT: Record<string, string> = {
  borrador: "Borrador",
  en_aprobacion: "En aprobación",
  lista: "Lista",
  enviada: "Enviada",
};

export function TarjetaNegocioCuenta({
  negocio,
  cotizaciones,
  cpqLeer,
  cpqCrear,
}: {
  negocio: NegocioFila;
  cotizaciones: CotizacionCuenta[];
  cpqLeer: boolean;
  cpqCrear: boolean;
}) {
  return (
    <li className="rounded-lg border border-border bg-surface px-3 py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <LinkNext href={`/negocios/${negocio.id}`} className="font-medium text-accent">
          {negocio.titulo}
        </LinkNext>
        <span className="t-caption text-fg-muted">{negocio.etapaNombre}</span>
      </div>
      {cpqLeer ? (
        <div className="mt-2 flex flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            <EnlaceBoton href={`/negocios/${negocio.id}/cotizaciones`} variante="ghost">
              Cotizaciones del negocio
            </EnlaceBoton>
            {cpqCrear && negocio.estado === "abierto" ? (
              <EnlaceBoton href={`/cotizaciones/nueva?negocio=${negocio.id}`} variante="ghost">
                Nueva cotización
              </EnlaceBoton>
            ) : null}
          </div>
          {cotizaciones.length === 0 ? (
            <p className="t-caption text-fg-muted">Sin cotizaciones en este negocio.</p>
          ) : (
            <ul className="divide-y divide-border rounded-md border border-border">
              {cotizaciones.map((c) => (
                <li
                  key={c.id}
                  className="flex flex-col gap-1 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <LinkNext href={`/cotizaciones/${c.id}`} className="text-accent underline">
                      {c.codigo}
                    </LinkNext>
                    <span className="t-caption text-fg-muted"> · {c.titulo}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {c.version ? (
                      <Badge tono="neutro">
                        {ESTADO_COT[c.version.estado] ?? c.version.estado}
                      </Badge>
                    ) : null}
                    {c.version?.ventaMensualClp != null ? (
                      <span className="t-caption t-numeric">
                        {pesos(c.version.ventaMensualClp)}/mes
                      </span>
                    ) : null}
                    <LinkNext
                      href={`/cotizaciones/${c.id}/propuesta-tecnica`}
                      className="t-caption text-accent underline"
                    >
                      Propuesta técnica
                    </LinkNext>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </li>
  );
}
