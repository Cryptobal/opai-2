import { esRol, tienePermiso } from "@opai/domain";

import type { Contadores } from "@/lib/navegacion";
import { ejecutarComoUsuario, requerirIdentidad } from "@/lib/servidor";

import { seccionModulo } from "./seccion-modulo";
import { SECCIONES, type Seccion } from "./secciones";

type Modulo = { id: string; nombre: string; estado: string | null };

/** Índice visible para el usuario: ámbitos según su rol y módulos activos con ajustes propios. */
export async function cargarIndice() {
  const identidad = await requerirIdentidad("/configuracion");
  const rol = identidad.actual?.rol;
  const puede = (p: string | null) =>
    p === null || Boolean(rol && esRol(rol) && tienePermiso(rol, p));
  const [mods, esquema, n] = await Promise.all([
    ejecutarComoUsuario<Modulo[]>("erp", "core.modules.list"),
    ejecutarComoUsuario<{ modulo: string }[]>("erp", "core.config.schema", {}),
    ejecutarComoUsuario<Contadores>("erp", "core.resumen.contadores", {}),
  ]);
  const conAjustes = new Set(esquema.ok ? esquema.data.map((c) => c.modulo) : []);
  const modulos = (mods.ok ? mods.data : [])
    .filter((m) => (m.estado === "activo" || m.estado === "trial") && conAjustes.has(m.id))
    .map((m) => seccionModulo(m.id, m.nombre));
  const secciones: Seccion[] = [...SECCIONES, ...modulos].filter((x) => puede(x.permiso));
  return {
    secciones,
    aprobaciones: n.ok ? (n.data.aprobacionesPendientes ?? 0) : 0,
    nombre: identidad.usuario.nombre,
    empresa: identidad.actual?.tenant.nombre ?? "",
    rol: rol ?? null,
  };
}

export type Indice = Awaited<ReturnType<typeof cargarIndice>>;
