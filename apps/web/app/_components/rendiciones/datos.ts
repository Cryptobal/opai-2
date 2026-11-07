import { notFound } from "next/navigation";

import { exigirDatos } from "@/lib/carga";
import { ejecutarComoUsuario } from "@/lib/servidor";

import type {
  DetalleRendicion,
  OpcionesRendicion,
  PortalRendicion,
  ResumenRendicion,
} from "./tipos";

/** Mis rendiciones (una consulta): las pestañas y sus contadores salen de esta misma lista. */
export async function cargarMias(portal: PortalRendicion): Promise<ResumenRendicion[]> {
  const r = await ejecutarComoUsuario<{ rendiciones: ResumenRendicion[] }>(
    portal,
    "rendiciones.rendiciones.listar",
    {
      alcance: "propias",
      limite: 100,
    },
  );
  return exigirDatos(r).rendiciones;
}

export async function cargarOpciones(
  portal: PortalRendicion,
  rendicionId?: string,
): Promise<OpcionesRendicion> {
  return exigirDatos(
    await ejecutarComoUsuario<OpcionesRendicion>(
      portal,
      "rendiciones.opciones.obtener",
      rendicionId ? { rendicionId } : {},
    ),
  );
}

export async function cargarRendicion(
  portal: PortalRendicion,
  id: string,
): Promise<DetalleRendicion> {
  const r = await ejecutarComoUsuario<{ rendicion: DetalleRendicion }>(
    portal,
    "rendiciones.rendiciones.obtener",
    { id },
  );
  // Un id que no existe o que la persona no puede ver da el mismo «no encontrado» (ADR-022).
  if (!r.ok && (r.error.code === "NOT_FOUND" || r.error.code === "INVALID_INPUT")) notFound();
  return exigirDatos(r).rendicion;
}

/** Nombre del administrador de la empresa para el «sin permiso»; si falla o no hay, null (texto genérico). */
export async function cargarAdministrador(portal: PortalRendicion): Promise<string | null> {
  const r = await ejecutarComoUsuario<{ nombre: string | null }>(
    portal,
    "rendiciones.administrador.consultar",
    {},
  );
  return r.ok ? r.data.nombre : null;
}
