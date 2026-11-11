import type { EventoDeDominio } from "../module";

/** Grupos o equipos de usuarios para autorización (CAR-251). Payload solo con ids. */
export const EVENTOS_GRUPOS: readonly EventoDeDominio[] = [
  { id: "core.grupo.creado", descripcion: "Se creó un grupo o equipo de usuarios." },
  { id: "core.grupo.actualizado", descripcion: "Cambió el nombre o la descripción de un grupo." },
  { id: "core.grupo.archivado", descripcion: "Se archivó un grupo o equipo de usuarios." },
  { id: "core.grupo.miembros_agregados", descripcion: "Se agregaron usuarios a un grupo." },
  { id: "core.grupo.miembro_quitado", descripcion: "Se quitó a un usuario de un grupo." },
];
