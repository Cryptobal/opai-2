import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

import { Badge, cn } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";

import { conteoPuestos, type Funcion, type Patron, type Tab } from "./tipos";
import { VistaCiclo } from "./vista-ciclo";

/** Activos primero; los inactivos atenuados al final, sin alterar el orden de la capacidad. */
const activosPrimero = <T extends { activo: boolean }>(xs: T[]): T[] =>
  [...xs].sort((a, b) => Number(!a.activo) - Number(!b.activo));

/** Una fila-tarjeta del catálogo: enlace a su hoja si se puede editar; si no, estática. */
function Fila({
  tab,
  id,
  inactivo,
  puede,
  children,
}: {
  tab: Tab;
  id: string;
  inactivo: boolean;
  puede: boolean;
  children: ReactNode;
}) {
  const clase = cn(
    "flex items-center gap-3 border-b border-border px-4 py-3 last:border-b-0",
    inactivo && "text-fg-muted",
    puede && "transition-colors duration-150 hover:bg-bg",
  );
  const cuerpo = <span className="flex min-w-0 flex-1 flex-col gap-1.5">{children}</span>;
  if (!puede)
    return (
      <li className={clase}>
        {cuerpo}
      </li>
    );
  return (
    <li>
      <LinkNext
        href={`?tab=${tab}&editar=${id}`}
        className={cn(
          clase,
          "outline-none focus-visible:-outline-offset-2 focus-visible:outline-2 focus-visible:outline-focus",
        )}
      >
        {cuerpo}
        <ChevronRight aria-hidden className="size-4 flex-none text-fg-subtle" />
      </LinkNext>
    </li>
  );
}

const Cabeza = ({ nombre, n }: { nombre: string; n: number }) => (
  <span className="flex items-baseline justify-between gap-2">
    <span className="t-label text-[16px]">{nombre}</span>
    <span className="t-body-sm t-numeric text-fg-muted">{conteoPuestos(n)}</span>
  </span>
);

/** Catálogo de patrones de turno (una fila por patrón, con su vista de ciclo). */
export function ListaPatrones({ patrones, puede }: { patrones: Patron[]; puede: boolean }) {
  return (
    <ul className="overflow-hidden rounded-lg border border-border bg-surface">
      {activosPrimero(patrones).map((p) => (
        <Fila key={p.id} tab="patrones" id={p.id} inactivo={!p.activo} puede={puede}>
          <Cabeza nombre={p.nombre} n={p.puestosActivos} />
          <span className="t-body-sm text-fg-muted">{p.resumen}</span>
          <span className="flex flex-wrap items-center gap-3">
            <VistaCiclo patron={p} />
            {p.activo ? null : <Badge tono="neutro">Inactivo</Badge>}
          </span>
        </Fila>
      ))}
    </ul>
  );
}

/** Catálogo de funciones (una fila por función). */
export function ListaFunciones({ funciones, puede }: { funciones: Funcion[]; puede: boolean }) {
  return (
    <ul className="overflow-hidden rounded-lg border border-border bg-surface">
      {activosPrimero(funciones).map((f) => (
        <Fila key={f.id} tab="funciones" id={f.id} inactivo={!f.activo} puede={puede}>
          <Cabeza nombre={f.nombre} n={f.puestosActivos} />
          <span className="flex flex-wrap items-center gap-2 t-body-sm text-fg-muted">
            {f.vertical ? `Vertical: ${f.vertical}` : "Todas las verticales"}
            {f.activo ? null : <Badge tono="neutro">Inactivo</Badge>}
          </span>
        </Fila>
      ))}
    </ul>
  );
}
