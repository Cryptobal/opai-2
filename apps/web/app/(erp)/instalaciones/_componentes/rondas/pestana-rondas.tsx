import { Empty, Segmentado } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";
import { puedeConfigurarRondas } from "@/lib/pestanas-modulos";

import { PanelPlantillas } from "./panel-plantillas";
import { PanelProgramaciones } from "./panel-programaciones";
import { PanelPuntos } from "./panel-puntos";

const SUBS = ["puntos", "plantillas", "programacion", "historial"] as const;
export type SubRondas = (typeof SUBS)[number];

function subDe(v: string | undefined): SubRondas {
  return (SUBS as readonly string[]).includes(v ?? "") ? (v as SubRondas) : "puntos";
}

/**
 * Pestaña «Rondas» de la ficha de instalación (Brief 14, c13p/c13t/c13s/c13h): segmentado Puntos ·
 * Plantillas · Programación · Historial por `?sub=`. Cada panel carga sus datos por capacidad; el
 * alcance se aplica en la consulta (ADR-022). El Historial queda como contenedor vacío hasta el PR 3.
 */
export async function PestanaRondas({
  instalacionId,
  instalacionNombre,
  sub,
}: {
  instalacionId: string;
  instalacionNombre: string;
  sub: string | undefined;
}) {
  const activa = subDe(sub);
  const puede = await puedeConfigurarRondas();
  return (
    <div className="flex flex-col gap-4">
      <Segmentado
        etiqueta="Sección de rondas"
        activa={activa}
        Link={LinkNext}
        className="self-start"
        opciones={[
          { id: "puntos", etiqueta: "Puntos", href: "?sub=puntos" },
          { id: "plantillas", etiqueta: "Plantillas", href: "?sub=plantillas" },
          { id: "programacion", etiqueta: "Programación", href: "?sub=programacion" },
          { id: "historial", etiqueta: "Historial", href: "?sub=historial" },
        ]}
      />
      {activa === "puntos" ? (
        <PanelPuntos
          instalacionId={instalacionId}
          instalacionNombre={instalacionNombre}
          puede={puede}
        />
      ) : activa === "plantillas" ? (
        <PanelPlantillas instalacionId={instalacionId} puede={puede} />
      ) : activa === "programacion" ? (
        <PanelProgramaciones instalacionId={instalacionId} puede={puede} />
      ) : (
        <Empty
          titulo="Aún no hay historial de rondas"
          descripcion="Cuando se ejecuten rondas en terreno, aquí verás cada recorrido, sus marcas y las novedades. Se habilita en una próxima entrega."
        />
      )}
    </div>
  );
}
