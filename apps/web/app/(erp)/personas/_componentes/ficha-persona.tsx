import type { PanelSueldo } from "@opai/capabilities";
import type { ReactNode } from "react";

import { Avatar, Badge, DetailScreen, type EstadoPantalla } from "@opai/ds";

import { BandaAprobacion } from "@/app/_components/aprobaciones/banda-aprobacion";
import { LinkNext } from "@/app/_components/link-next";
import { type AccionEntidad, AccionesEntidad } from "@/app/_components/maestros/acciones-entidad";
import { ESTADO_PERSONA, estadoDe } from "@/app/_components/maestros/estados";
import { fecha, hoyIso, rut } from "@/lib/fechas";
import type { PersonaDetalle } from "@/lib/tipos-maestros";

export function accionesPersona(p: PersonaDetalle): AccionEntidad[] {
  const v = p.vinculoVigente;
  return [
    { id: "editar", etiqueta: "Editar datos", parametro: { clave: "editar", valor: "1" } },
    p.bloqueada
      ? {
          id: "desbloquear",
          etiqueta: "Desbloquear",
          capacidad: {
            id: "core.personas.desbloquear",
            input: { id: p.id },
            exito: "Persona desbloqueada",
          },
          confirmar: {
            titulo: `Desbloquear a ${p.nombreCompleto}`,
            descripcion: `Bloqueada por: ${p.bloqueoMotivo ?? "sin motivo"}. Indica por qué se levanta.`,
            boton: "Desbloquear",
            motivo: true,
          },
        }
      : {
          id: "bloquear",
          etiqueta: "Bloquear",
          peligro: true,
          capacidad: {
            id: "core.personas.bloquear",
            input: { id: p.id },
            exito: "Persona bloqueada",
          },
          confirmar: {
            titulo: `Bloquear a ${p.nombreCompleto}`,
            descripcion: "No podrá ser asignada a turnos mientras siga bloqueada.",
            boton: "Bloquear",
            peligro: true,
            motivo: true,
          },
        },
    ...(v
      ? [
          {
            id: "terminar",
            etiqueta: "Terminar vínculo",
            peligro: true,
            capacidad: {
              id: "core.vinculos.terminar",
              input: { id: v.id, termino: hoyIso() },
              exito: "Vínculo terminado",
            },
            confirmar: {
              titulo: `Terminar el vínculo de ${p.nombreCompleto}`,
              descripcion: `${v.cargo}, desde ${fecha(v.inicio)}. Termina hoy y no se puede deshacer.`,
              boton: "Terminar vínculo",
              peligro: true,
              motivo: true,
            },
          },
        ]
      : []),
    {
      id: "archivar",
      etiqueta: "Archivar",
      peligro: true,
      capacidad: { id: "core.personas.archive", input: { id: p.id }, exito: "Persona archivada" },
      confirmar: {
        titulo: `Archivar a ${p.nombreCompleto}`,
        descripcion: "Deja de aparecer en las listas; su historial y documentos se conservan.",
        boton: "Archivar",
        peligro: true,
      },
    },
  ];
}

export type TabPersona =
  "resumen" | "laboral" | "sueldo" | "documentos" | "actividad" | "anexos" | "privacidad";

/** Ficha de una persona (11/12): avatar, estado, nombre, "cargo · RUT"; tabs por ruta. */
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
              acciones: <AccionesEntidad etiqueta="Más acciones" acciones={accionesPersona(p)} />,
            }
          : {})}
        tabActiva={x.tab}
        Link={LinkNext}
        tabs={[
          { id: "resumen", etiqueta: "Resumen", href: `${base}${q}` },
          { id: "laboral", etiqueta: "Laboral", href: `${base}/laboral${q}` },
          { id: "sueldo", etiqueta: "Sueldo", href: `${base}/sueldo${q}` },
          {
            id: "documentos",
            etiqueta: "Documentos",
            contador: p?.documentos ?? 0,
            href: `${base}/documentos${q}`,
          },
          { id: "actividad", etiqueta: "Actividad", href: `${base}/actividad${q}` },
          { id: "anexos", etiqueta: "Anexos", href: `${base}/anexos${q}` },
          { id: "privacidad", etiqueta: "Privacidad", href: `${base}/privacidad${q}` },
        ]}
      >
        {x.children}
      </DetailScreen>
    </>
  );
}
