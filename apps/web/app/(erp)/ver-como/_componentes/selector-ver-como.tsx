import { Search } from "lucide-react";

import { Button, Empty, Enlace, Input, Tabs } from "@opai/ds";
import type { PortalVerComo } from "@opai/domain";

import { LinkNext } from "@/app/_components/link-next";

import { BotonVer } from "./boton-ver";

export type Objetivo = { id: string; nombre: string; detalle: string | null };

const PORTALES: { id: PortalVerComo; etiqueta: string; vacio: string }[] = [
  {
    id: "terreno",
    etiqueta: "Terreno",
    vacio: "No hay instalaciones con un equipo de Terreno emparejado.",
  },
  {
    id: "trabajador",
    etiqueta: "Trabajador",
    vacio: "No hay personas activas para previsualizar el portal del trabajador.",
  },
  { id: "cliente", etiqueta: "Cliente", vacio: "No hay contactos con acceso al Portal Cliente." },
  {
    id: "supervisor",
    etiqueta: "Supervisor",
    vacio: "No hay supervisores con acceso a instalaciones.",
  },
];

function Buscador({ portal, q }: { portal: PortalVerComo; q: string }) {
  return (
    <form method="get" action="/ver-como" role="search" className="flex gap-2">
      <Input type="hidden" name="portal" value={portal} />
      <Input
        name="q"
        defaultValue={q}
        placeholder="Buscar por nombre"
        aria-label="Buscar por nombre"
      />
      <Button type="submit" variant="secondary">
        <Search aria-hidden className="size-4" />
        Buscar
      </Button>
    </form>
  );
}

type Props = { portal: PortalVerComo; q: string; items: Objetivo[]; siguiente: string | null };

/** Portal → instalación, persona o cliente → «Ver». La búsqueda es un GET: sin JS hasta el botón. */
export function SelectorVerComo({ portal, q, items, siguiente }: Props) {
  const actual = PORTALES.find((p) => p.id === portal) ?? PORTALES[0]!;
  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <p className="t-body-sm text-fg-muted">
        Mira un portal tal como lo ve otra persona de esta empresa, en solo lectura y por 30
        minutos. Queda en la auditoría.
      </p>
      <Tabs
        activa={portal}
        Link={LinkNext}
        tabs={PORTALES.map((p) => ({
          id: p.id,
          etiqueta: p.etiqueta,
          href: `/ver-como?portal=${p.id}`,
        }))}
      />
      <Buscador portal={portal} q={q} />
      {items.length === 0 ? (
        <Empty
          titulo={q ? "Sin resultados" : "Nada que ver todavía"}
          descripcion={q ? "Prueba con otro nombre." : actual.vacio}
        />
      ) : (
        <ul className="overflow-hidden rounded-lg border border-border bg-surface">
          {items.map((o) => (
            <li
              key={o.id}
              className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 last:border-b-0"
            >
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-base text-fg">{o.nombre}</span>
                {o.detalle ? (
                  <span className="truncate text-sm text-fg-muted">{o.detalle}</span>
                ) : null}
              </span>
              <BotonVer portal={portal} objetivoId={o.id} nombre={o.nombre} />
            </li>
          ))}
        </ul>
      )}
      {siguiente ? (
        <Enlace
          Link={LinkNext}
          href={`/ver-como?${new URLSearchParams({ portal, q, cursor: siguiente })}`}
        >
          Ver más
        </Enlace>
      ) : null}
    </div>
  );
}
