import { Badge } from "@opai/ds";

import { COBERTURA_PUESTO, estadoDe } from "@/app/_components/maestros/estados";
import type { Puesto } from "@/lib/tipos-maestros";

/**
 * Trozos de una línea que bajan de renglón en vez de cortarse (CAR-8: a 375 px el horario y el
 * patrón se truncaban). Cada trozo es corto y se mantiene entero.
 */
function Trozos({ partes, className }: { partes: (string | null)[]; className: string }) {
  return (
    <span className={`flex flex-wrap gap-x-1 whitespace-normal ${className}`} data-linea-puesto>
      {partes.filter(Boolean).map((t, i, arr) => (
        <span key={i} className="whitespace-nowrap">
          {t}
          {i < arr.length - 1 ? " ·" : ""}
        </span>
      ))}
    </span>
  );
}

export const secundario = (p: Puesto) => (
  <Trozos
    partes={[p.patron ?? "Sin patrón", p.funcion ?? "Sin función"]}
    className="text-fg-muted"
  />
);

export const terciario = (p: Puesto) => (
  <Trozos
    partes={[
      p.horario,
      p.horarioNoche,
      p.horasSemanales != null ? `${p.horasSemanales} h/sem` : null,
    ]}
    className="t-caption"
  />
);

/** Horario de un tramo con el badge «+1 día» cuando cruza medianoche (el dominio lo marca con «(+1)»). */
export function Horario({ valor }: { valor: string }) {
  const cruza = valor.endsWith(" (+1)");
  const base = cruza ? valor.slice(0, -5) : valor;
  return (
    <span className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
      <span className="t-numeric">{base}</span>
      {cruza ? <Badge tono="neutro">+1 día</Badge> : null}
    </span>
  );
}

/**
 * Cobertura del puesto en la tabla. Con el panel angosto (ficha en vista dividida a 1024 px) va corta
 * («PPC»); el texto completo queda para lectores de pantalla (CAR-65). Pide un ancestro `@container`.
 */
export function CoberturaPuesto({ cobertura }: { cobertura: string }) {
  const c = estadoDe(COBERTURA_PUESTO, cobertura);
  if (c.corta === c.etiqueta) return <Badge tono={c.tono}>{c.etiqueta}</Badge>;
  return (
    <Badge tono={c.tono}>
      <span aria-hidden className="hidden @max-[30rem]:inline">
        {c.corta}
      </span>
      <span className="@max-[30rem]:sr-only">{c.etiqueta}</span>
    </Badge>
  );
}
