import { Tabs } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";

import {
  BASE,
  PESTANAS,
  type PestanaId,
  type PortalRendicion,
  type ResumenRendicion,
} from "./tipos";

/** Pestañas por ruta de «Mis rendiciones» (server-first, ADR-037), con su contador. */
export function PestanasRendiciones({
  portal,
  activa,
  rendiciones,
}: {
  portal: PortalRendicion;
  activa: PestanaId;
  rendiciones: readonly ResumenRendicion[];
}) {
  return (
    <Tabs
      Link={LinkNext}
      activa={activa}
      tabs={PESTANAS.map((p) => ({
        id: p.id,
        etiqueta: p.etiqueta,
        href: `${BASE[portal]}${p.segmento}`,
        contador: rendiciones.filter((r) => r.estado === p.estado).length,
      }))}
    />
  );
}
