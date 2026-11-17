import { Tabs } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";

import {
  BASE,
  PESTANAS,
  type EstadoRendicion,
  type PestanaId,
  type PortalRendicion,
} from "./tipos";

/** Pestañas por ruta de «Mis rendiciones» (server-first, ADR-037), con contador del servidor. */
export function PestanasRendiciones({
  portal,
  activa,
  contadores,
}: {
  portal: PortalRendicion;
  activa: PestanaId;
  contadores: Partial<Record<EstadoRendicion, number>>;
}) {
  return (
    <Tabs
      Link={LinkNext}
      activa={activa}
      tabs={PESTANAS.map((p) => ({
        id: p.id,
        etiqueta: p.etiqueta,
        href: `${BASE[portal]}${p.segmento}`,
        contador: contadores[p.estado] ?? 0,
      }))}
    />
  );
}