import { Tabs } from "@opai/ds";
import { PERMISOS_CORE } from "@opai/domain";

import { LinkNext } from "@/app/_components/link-next";
import { puedeDeIdentidad } from "@/lib/permisos-ui";
import { requerirIdentidad } from "@/lib/servidor";

export type PestanaDocumentos = "explorador" | "vencimientos" | "plantillas" | "firmas";

/**
 * Secciones de Documentos como rutas reales (server-first, ADR-037), según el diseño v4: Explorador,
 * Vencimientos, Plantillas y Firmas pendientes. Cada pestaña solo aparece si la persona puede leer
 * lo que muestra (Plantillas: owner y admin, decisión 8 de Carlos del 9-nov-2026); la identidad es la misma del render (`cache`).
 */
export async function PestanasDocumentos({ activa }: { activa: PestanaDocumentos }) {
  const puede = puedeDeIdentidad(await requerirIdentidad("/documentos"));
  const tabs = [
    { id: "explorador", etiqueta: "Explorador", href: "/documentos", ver: true },
    { id: "vencimientos", etiqueta: "Vencimientos", href: "/documentos/vencimientos", ver: true },
    {
      id: "plantillas",
      etiqueta: "Plantillas",
      href: "/documentos/plantillas",
      ver: puede(PERMISOS_CORE.documentosPlantillasManage),
    },
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
