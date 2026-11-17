import { notFound } from "next/navigation";

import { POR_PAGINA } from "@/app/_components/maestros/paginacion-cursor";

import { exigirDatos } from "@/lib/carga";
import type { Parametros } from "@/lib/parametros";
import { ejecutarComoUsuario } from "@/lib/servidor";

import type {
  DetalleRendicion,
  OpcionesRendicion,
  PortalRendicion,
  ResumenRendicion,
} from "./tipos";

type PaginaMias = { rendiciones: ResumenRendicion[]; siguiente: string | null };

/** Mis rendiciones de la pestaña activa, paginadas por cursor (CAR-624). */
export async function cargarMias(
  portal: PortalRendicion,
  p: Parametros,
  estado?: ResumenRendicion["estado"],
): Promise<PaginaMias> {
  const r = await ejecutarComoUsuario<PaginaMias>(portal, "rendiciones.rendiciones.listar", {
    alcance: "propias",
    limite: POR_PAGINA,
    ...(estado ? { estado } : {}),
    ...(p["cursor"] ? { cursor: p["cursor"] } : {}),
  });
  return exigirDatos(r);
}

/** Contadores de pestañas: una página por estado (tope 100 por pestaña, suficiente para el badge). */
export async function cargarContadoresPestanas(portal: PortalRendicion): Promise<ResumenRendicion[]> {
  const estados: ResumenRendicion["estado"][] = [
    "borrador",
    "enviada",
    "aprobada",
    "rechazada",
    "devuelta",
    "pagada",
  ];
  const paginas = await Promise.all(
    estados.map((estado) =>
      ejecutarComoUsuario<PaginaMias>(portal, "rendiciones.rendiciones.listar", {
        alcance: "propias",
        limite: POR_PAGINA,
        estado,
      }),
    ),
  );
  return paginas.flatMap((r) => (r.ok ? r.data.rendiciones : []));
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
