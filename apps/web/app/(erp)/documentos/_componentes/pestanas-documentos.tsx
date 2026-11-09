import { Tabs } from "@opai/ds";
import { PERMISOS_CORE } from "@opai/domain";

import { LinkNext } from "@/app/_components/link-next";
import { puedeDeIdentidad } from "@/lib/permisos-ui";
import { requerirIdentidad } from "@/lib/servidor";

export type PestanaDocumentos = "explorador" | "vencimientos" | "firmas";

/**
 * Secciones de Documentos como rutas reales (server-first, ADR-037), según el diseño v4: Explorador,
 * Vencimientos y Firmas pendientes. «Plantillas» se suma con su pantalla (05). Cada pestaña solo
 * aparece si la persona puede leer lo que muestra; la identidad es la misma del render (`cache`).
 */
export async function PestanasDocumentos({ activa }: { activa: PestanaDocumentos }) {
  const puede = puedeDeIdentidad(await requerirIdentidad("/documentos"));
  const tabs = [
    { id: "explorador", etiqueta: "Explorador", href: "/documentos", ver: true },
    { id: "vencimientos", etiqueta: "Vencimientos", href: "/documentos/vencimientos", ver: true },
    {
      id: "firmas",
      etiqueta: "Firmas pendientes",
      href: "/documentos/firmas",
      ver: puede(PERMISOS_CORE.firmasRead),
    },
  ].filter((t) => t.ver);
  return (
    <Tabs
      Link={LinkNext}
      activa={activa}
      tabs={tabs.map(({ id, etiqueta, href }) => ({ id, etiqueta, href }))}
    />
  );
}
