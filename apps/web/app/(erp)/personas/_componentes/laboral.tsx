import { Check } from "lucide-react";

import { cn, ParesGrid, SeccionTarjeta } from "@opai/ds";

import { TIPO_CONTRATO } from "@/app/_components/maestros/estados";
import { fecha } from "@/lib/fechas";
import type { Cargo, PersonaDetalle } from "@/lib/tipos-maestros";
import type { Vinculo } from "@/lib/tipos-sueldo";

/** Vínculo vigente (13): cargo, tipo, ingreso y término pactado. */
export function VinculoVigente({ p }: { p: PersonaDetalle }) {
  const v = p.vinculoVigente;
  return (
    <SeccionTarjeta titulo="Vínculo vigente">
      {v ? (
        <ParesGrid
          items={[
            { etiqueta: "Cargo", valor: v.cargo },
            { etiqueta: "Tipo", valor: TIPO_CONTRATO[v.tipo] ?? v.tipo },
            { etiqueta: "Ingreso", valor: fecha(v.inicio) },
            { etiqueta: "Término", valor: v.termino ? fecha(v.termino) : null },
          ]}
        />
      ) : (
        <p className="text-base text-fg-muted">
          Sin vínculo vigente. Crea uno nuevo desde “Nuevo vínculo”.
        </p>
      )}
    </SeccionTarjeta>
  );
}

/** Historial de vínculos (13): el vigente marcado y los terminados con su periodo. */
export function HistorialVinculos({ vinculos, cargos }: { vinculos: Vinculo[]; cargos: Pick<Cargo, "id" | "nombre">[] }) {
  const nombre = (id: string) => cargos.find((c) => c.id === id)?.nombre ?? "Cargo";
  if (!vinculos.length) return null;
  return (
    <SeccionTarjeta titulo="Historial de vínculos">
      <ol className="flex flex-col">
        {vinculos.map((v, i) => {
          const vigente = v.estado === "vigente";
          return (
            <li key={v.id} className="relative flex gap-3 pb-4 last:pb-0">
              {i < vinculos.length - 1 ? (
                <span aria-hidden className="absolute top-6 bottom-0 left-[11px] w-px bg-border" />
              ) : null}
              <span
                aria-hidden
                className={cn(
                  "z-10 flex size-6 flex-none items-center justify-center rounded-full border",
                  vigente ? "border-fg bg-fg text-bg" : "border-border-strong bg-surface",
                )}
              >
                {vigente ? <Check className="size-3.5" /> : null}
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="text-base font-medium text-fg">
                  {TIPO_CONTRATO[v.tipo] ?? v.tipo} · {nombre(v.cargoId)}
                </span>
                <span className="t-caption">
                  {vigente
                    ? `desde ${fecha(v.inicio)}`
                    : `${fecha(v.inicio)} – ${fecha(v.termino)}`}
                  {v.motivoTermino ? ` · ${v.motivoTermino}` : ""}
                </span>
              </span>
            </li>
          );
        })}
      </ol>
    </SeccionTarjeta>
  );
}
