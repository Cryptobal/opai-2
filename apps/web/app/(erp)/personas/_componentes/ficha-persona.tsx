import type { PanelSueldo } from "@opai/capabilities";
import type { ReactNode } from "react";

import { Avatar, Badge, DetailScreen, type EstadoPantalla } from "@opai/ds";

import { BandaAprobacion } from "@/app/_components/aprobaciones/banda-aprobacion";
import { LinkNext } from "@/app/_components/link-next";
import { AccionesCabeceraFicha } from "@/app/_components/maestros/acciones-ficha";
import { ESTADO_PERSONA, estadoDe } from "@/app/_components/maestros/estados";
import { fecha, rut } from "@/lib/fechas";
import type { PersonaDetalle } from "@/lib/tipos-maestros";

import { accionesPersona } from "./acciones-persona";
import { pestanasPersona } from "./ficha-persona-pestanas";

export type TabPersona =
  | "resumen"
  | "laboral"
  | "ausencias"
  | "sueldo"
  | "documentos"
  | "actividad"
  | "anexos"
  | "privacidad"
  | "turnos-extra";

/** Ficha de una persona (11/12): avatar, estado, nombre, "cargo · instalación · RUT"; tabs por ruta, en el orden del export
 * ficha-persona v1 (CAR-124): Resumen · Laboral · Sueldo · Anexos · Documentos · Privacidad · Actividad. */
export function FichaPersona(x: {
  aprobaciones?: PanelSueldo["aprobaciones"];
  state: EstadoPantalla;
  persona: PersonaDetalle | null;
  tab: TabPersona;
  /** Búsqueda, filtros y página de la lista (`?q=…`), para que las pestañas no la reinicien. */
  consulta?: string;
  turnosExtra?: boolean;
  children: ReactNode;
}) {
  const p = x.persona;
  const e = p ? estadoDe(ESTADO_PERSONA, p.bloqueada ? "bloqueada" : p.estado) : null;
  const base = `/personas/${p?.id ?? ""}`;
  const q = x.consulta ?? "";
  const editarHref = q ? `?editar=1&${q.slice(1)}` : "?editar=1";
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
                  {[p.vinculoVigente?.cargo ?? "Sin vínculo vigente", (p.vinculoVigente as { instalacion?: string | null } | null)?.instalacion].filter(Boolean).join(" · ")} ·{" "}
                  <span className="t-mono">{rut(p.rut)}</span>
                </>
              ),
              acciones: (
                <AccionesCabeceraFicha
                  etiqueta="Más acciones"
                  editarHref={editarHref}
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
        tabs={pestanasPersona({
          base,
          q,
          documentos: p?.documentos ?? 0,
          ...(x.turnosExtra !== undefined ? { turnosExtra: x.turnosExtra } : {}),
        })}
      >
        {x.children}
      </DetailScreen>
    </>
  );
}
