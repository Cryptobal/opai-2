import type { PanelSueldo } from "@opai/capabilities";
import type { ReactNode } from "react";

import { Avatar, Badge, DetailScreen, type EstadoPantalla } from "@opai/ds";

import { BandaAprobacion } from "@/app/_components/aprobaciones/banda-aprobacion";
import { LinkNext } from "@/app/_components/link-next";
import { AccionesEntidad } from "@/app/_components/maestros/acciones-entidad";
import { ESTADO_PERSONA, estadoDe } from "@/app/_components/maestros/estados";
import { fecha, rut } from "@/lib/fechas";
import type { PersonaDetalle } from "@/lib/tipos-maestros";

import { accionesPersona } from "./acciones-persona";

export type TabPersona =
  "resumen" | "laboral" | "sueldo" | "documentos" | "actividad" | "anexos" | "privacidad";

/** Ficha de una persona (11/12): avatar, estado, nombre, "cargo · RUT"; tabs por ruta, en el orden del export
 * ficha-persona v1 (CAR-124): Resumen · Laboral · Sueldo · Anexos · Documentos · Privacidad · Actividad. */
export function FichaPersona(x: {
  aprobaciones?: PanelSueldo["aprobaciones"];
  state: EstadoPantalla;
  persona: PersonaDetalle | null;
  tab: TabPersona;
  /** Búsqueda, filtros y página de la lista (`?q=…`), para que las pestañas no la reinicien. */
  consulta?: string;
  children: ReactNode;
}) {
  const p = x.persona;
  const e = p ? estadoDe(ESTADO_PERSONA, p.bloqueada ? "bloqueada" : p.estado) : null;
  const base = `/personas/${p?.id ?? ""}`;
  const q = x.consulta ?? "";
  return (
    <>
      {p ? (
        <BandaAprobacion
          {...(x.aprobaciones ? { aprobaciones: x.aprobaciones } : {})}
          entidad={{ tipo: "persona", id: p.id }}
        />
      ) : null}
      <DetailScreen
        state={p ? x.state : x.state === "ready" ? "error" : x.state}
        titulo={p?.nombreCompleto ?? "Persona"}
        {...(p && e
          ? {
              inicio: <Avatar nombre={p.nombreCompleto} size="xl" />,
              estado: (
                <>
                  <Badge tono={e.tono} punto>
                    {e.etiqueta}
                  </Badge>
                  {p.vinculoVigente ? (
                    <span className="t-caption">desde {fecha(p.vinculoVigente.inicio)}</span>
                  ) : null}
                </>
              ),
              subtitulo: (
                <>
                  {p.vinculoVigente?.cargo ?? "Sin vínculo vigente"} ·{" "}
                  <span className="t-mono">{rut(p.rut)}</span>
                </>
              ),
              acciones: (
                <AccionesEntidad
                  etiqueta="Más acciones"
                  acciones={accionesPersona(p)}
                  agente={{
                    contexto: { tipo: "persona", id: p.id },
                    nombre: p.nombreCompleto,
                    articulo: "esta persona",
                  }}
                />
              ),
            }
          : {})}
        tabActiva={x.tab}
        Link={LinkNext}
        tabs={[
          { id: "resumen", etiqueta: "Resumen", href: `${base}${q}` },
          { id: "laboral", etiqueta: "Laboral", href: `${base}/laboral${q}` },
          { id: "sueldo", etiqueta: "Sueldo", href: `${base}/sueldo${q}` },
          { id: "anexos", etiqueta: "Anexos", href: `${base}/anexos${q}` },
          {
            id: "documentos",
            etiqueta: "Documentos",
            contador: p?.documentos ?? 0,
            href: `${base}/documentos${q}`,
          },

          { id: "privacidad", etiqueta: "Privacidad", href: `${base}/privacidad${q}` },
          { id: "actividad", etiqueta: "Actividad", href: `${base}/actividad${q}` },
        ]}
      >
        {x.children}
      </DetailScreen>
    </>
  );
}
