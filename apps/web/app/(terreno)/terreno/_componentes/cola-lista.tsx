import type { ReactNode } from "react";

import { Button } from "@opai/ds";

import type { HechoLocal, ResultadoLocal } from "@/lib/terreno/cola";
import { etiquetaTipo, motivoRechazo } from "@/lib/terreno/motivos";

const hora = (iso: string) =>
  new Date(iso).toLocaleString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

/** Sección de la cola con su título y cuenta (pendiente · sincronizado · rechazado). */
export function SeccionCola({
  titulo,
  cuenta,
  children,
}: {
  titulo: string;
  cuenta: number;
  children: ReactNode;
}) {
  return (
    <section aria-label={titulo} className="flex flex-col gap-2">
      <h2 className="t-heading text-fg">
        {titulo} <span className="text-fg-muted">({cuenta})</span>
      </h2>
      {children}
    </section>
  );
}

const Lista = ({ children }: { children: ReactNode }) => (
  <ul className="overflow-hidden rounded-lg border border-border bg-surface">{children}</ul>
);

const Fila = ({ children }: { children: ReactNode }) => (
  <li className="flex flex-col gap-1 border-b border-border px-4 py-3 last:border-b-0">
    {children}
  </li>
);

export function ListaPendientes({ hechos }: { hechos: HechoLocal[] }) {
  return (
    <Lista>
      {hechos.map((h) => (
        <Fila key={h.clave}>
          <span className="flex items-center justify-between gap-3">
            <span className="text-base text-fg">{etiquetaTipo(h.tipo)}</span>
            <span className="t-mono text-sm text-fg-muted">{hora(h.horaHecho)}</span>
          </span>
          <span className="text-sm text-fg-muted">Guardado en este teléfono, falta enviarlo.</span>
        </Fila>
      ))}
    </Lista>
  );
}

export function ListaSincronizados({ hechos }: { hechos: ResultadoLocal[] }) {
  return (
    <Lista>
      {hechos.slice(0, 5).map((h) => (
        <Fila key={h.clave}>
          <span className="flex items-center justify-between gap-3">
            <span className="text-base text-fg">{etiquetaTipo(h.tipo)}</span>
            <span className="t-mono text-sm text-fg-muted">{hora(h.horaHecho)}</span>
          </span>
          <span className="text-sm text-fg-muted">Ya llegó al servidor.</span>
        </Fila>
      ))}
    </Lista>
  );
}

export function ListaRechazados({
  hechos,
  onDescartar,
}: {
  hechos: ResultadoLocal[];
  onDescartar: (clave: string) => void;
}) {
  return (
    <Lista>
      {hechos.map((h) => (
        <Fila key={h.clave}>
          <span className="flex items-center justify-between gap-3">
            <span className="text-base text-fg">{etiquetaTipo(h.tipo)}</span>
            <span className="t-mono text-sm text-fg-muted">{hora(h.horaHecho)}</span>
          </span>
          <span role="alert" className="text-sm font-medium text-danger-fg">
            No se envió. {motivoRechazo(h.motivo)}
          </span>
          <Button variant="secondary" onClick={() => onDescartar(h.clave)}>
            Quitar de la lista
          </Button>
        </Fila>
      ))}
    </Lista>
  );
}
