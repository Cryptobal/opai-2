import type { AccionEntidad } from "@/app/_components/maestros/acciones-entidad";
import { fecha, hoyIso } from "@/lib/fechas";
import type { PersonaDetalle } from "@/lib/tipos-maestros";

/** Menú ⋯ de la ficha de persona: editar, bloquear o desbloquear, terminar el vínculo y archivar. */
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
