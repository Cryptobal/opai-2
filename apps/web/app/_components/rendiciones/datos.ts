import { notFound } from "next/navigation";

import { exigirDatos } from "@/lib/carga";
import type { Parametros } from "@/lib/parametros";
import { ejecutarComoUsuario } from "@/lib/servidor";

import type {
  DetalleRendicion,
  EstadoRendicion,
  OpcionesRendicion,
  PortalRendicion,
  ResumenRendicion,
} from "./tipos";

type PaginaRendiciones = {
  items: (ResumenRendicion & { solicitanteNombre?: string | null })[];
  siguiente: string | null;
  contadores?: Partial<Record<EstadoRendicion, number>>;
};

export async function cargarListaPropias(
  portal: PortalRendicion,
  p: Parametros,
  estado?: EstadoRendicion,
): Promise<PaginaRendiciones> {
  const r = await ejecutarComoUsuario<PaginaRendiciones>(portal, "rendiciones.rendiciones.listar", {
    alcance: "propias",
    incluirContadores: true,
    limite: 50,
    ...(estado ? { estado } : {}),
    ...(p.q ? { q: p.q } : {}),
    ...(p.cursor ? { cursor: p.cursor } : {}),
  });
  return exigirDatos(r);
}

export async function cargarTodas(p: Parametros): Promise<PaginaRendiciones> {
  const r = await ejecutarComoUsuario<PaginaRendiciones>("erp", "rendiciones.rendiciones.listar", {
    alcance: "todas",
    limite: 50,
    ...(p.estado ? { estado: p.estado as EstadoRendicion } : {}),
    ...(p.q ? { q: p.q } : {}),
    ...(p.persona ? { solicitanteId: p.persona } : {}),
    ...(p.instalacion ? { instalacionId: p.instalacion } : {}),
    ...(p.centro ? { centroCosto: p.centro as "instalacion" | "administracion" } : {}),
    ...(p.desde ? { desde: p.desde } : {}),
    ...(p.hasta ? { hasta: p.hasta } : {}),
    ...(p.cursor ? { cursor: p.cursor } : {}),
  });
  return exigirDatos(r);
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
  if (!r.ok && (r.error.code === "NOT_FOUND" || r.error.code === "INVALID_INPUT")) notFound();
  return exigirDatos(r).rendicion;
}

export async function cargarAdministrador(portal: PortalRendicion): Promise<string | null> {
  const r = await ejecutarComoUsuario<{ nombre: string | null }>(
    portal,
    "rendiciones.administrador.consultar",
    {},
  );
  return r.ok ? r.data.nombre : null;
}