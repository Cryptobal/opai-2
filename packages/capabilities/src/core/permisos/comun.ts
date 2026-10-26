import {
  coincide,
  moduloDe,
  permisosDe,
  permisosNoConcedibles,
  puedeAsignarRol,
  type Rol,
} from "@opai/domain";

import { prohibido, reglaDeNegocio } from "../../errores";
import type { Contexto } from "../../types";
import { catalogoPermisos } from "../me";

/**
 * §16.2: solo owner y admin (rol base) crean, editan, asignan o anotan excepciones de roles. Tener
 * `core:users.manage` dentro de un rol personalizado no basta: ese permiso gestiona usuarios, no la
 * máquina de roles y permisos. Se mide por el rol base, no por el acceso efectivo.
 */
export function exigeGestionDeRoles(ctx: Contexto): void {
  if (ctx.rol !== "owner" && ctx.rol !== "admin") {
    throw prohibido("Solo un owner o un administrador gestiona los roles y permisos de la empresa.");
  }
}

/** Los `platform:*` nunca se obtienen por un rol o una excepción del tenant (solo por `platformRole`). */
function rechazarPlataforma(permisos: readonly string[]): void {
  const plataforma = permisos.filter((p) => moduloDe(p) === "platform");
  if (plataforma.length) {
    throw reglaDeNegocio(`Un rol del tenant no concede permisos de plataforma: ${plataforma.join(", ")}.`);
  }
}

/** Un permiso puntual de excepción: concreto (sin comodines), del catálogo y nunca de plataforma. */
export function validarEnCatalogo(permisos: readonly string[]): void {
  rechazarPlataforma(permisos);
  const comodines = permisos.filter((p) => p.includes("*"));
  if (comodines.length) {
    throw reglaDeNegocio(`Una excepción es un permiso concreto, sin comodines: ${comodines.join(", ")}.`);
  }
  const catalogo = catalogoPermisos();
  const desconocidos = permisos.filter((p) => !catalogo.includes(p));
  if (desconocidos.length) {
    throw reglaDeNegocio(`Permisos fuera del catálogo: ${desconocidos.join(", ")}.`);
  }
}

/**
 * Expande los comodines (`core:*`) a los permisos concretos del catálogo al guardar un rol: así un
 * rol personalizado nunca hereda permisos que se agreguen al catálogo después (no se regalan). Rechaza
 * plataforma y lo que no exista. Devuelve la lista concreta, sin duplicados.
 */
export function expandirPermisos(permisos: readonly string[]): string[] {
  rechazarPlataforma(permisos);
  const catalogo = catalogoPermisos();
  const salida = new Set<string>();
  const desconocidos: string[] = [];
  for (const p of permisos) {
    if (p.includes("*")) {
      const coincidentes = catalogo.filter((c) => coincide(p, c));
      if (coincidentes.length === 0) desconocidos.push(p);
      for (const c of coincidentes) salida.add(c);
    } else if (catalogo.includes(p)) {
      salida.add(p);
    } else {
      desconocidos.push(p);
    }
  }
  if (desconocidos.length) {
    throw reglaDeNegocio(`Permisos fuera del catálogo: ${desconocidos.join(", ")}.`);
  }
  return [...salida];
}

/** Nadie concede más de lo que tiene (§16.2): se mide por el acceso efectivo del actor (`ctx.autorizar`). */
export function validarConcedibles(ctx: Contexto, permisos: readonly string[]): void {
  const noConcedibles = permisosNoConcedibles((p) => ctx.autorizar(p), permisos, catalogoPermisos());
  if (noConcedibles.length) {
    throw prohibido(`No puedes conceder permisos que tú no tienes: ${[...new Set(noConcedibles)].join(", ")}.`);
  }
}

/** Rol personalizado al guardar: expande comodines, valida catálogo y escalada; lista concreta. */
export function normalizarPermisosRol(ctx: Contexto, permisos: readonly string[]): string[] {
  const expandidos = expandirPermisos(permisos);
  validarConcedibles(ctx, expandidos);
  return expandidos;
}

/**
 * Asignar o invitar con un rol base, o devolver a alguien a su rol base, exige poder conceder TODO lo
 * que ese rol otorga, medido por el acceso REAL del actor (rol personalizado + excepciones), no por su
 * rol base: nadie asigna un rol con permisos que él mismo no tiene (§16.2, ADR-022).
 */
export function validarConcedeRol(ctx: Contexto, rol: Rol): void {
  validarConcedibles(ctx, permisosDe(rol, catalogoPermisos(), ctx.modulosActivos));
}

/**
 * Asignar o invitar con un rol base (§16.2, ADR-022) exige dos cosas distintas: poder conceder todo lo
 * que el rol otorga (`validarConcedeRol`, por acceso efectivo) y no superar la jerarquía del rol base
 * (`puedeAsignarRol` sobre `ctx.rol`). La jerarquía manda aunque un rol personalizado iguale el acceso:
 * un gerente con un rol a medida equivalente a admin no se promueve a admin base ni invita con él.
 */
export function exigeAsignarRol(ctx: Contexto, rol: Rol): void {
  if (ctx.rol && !puedeAsignarRol(ctx.rol, rol)) {
    throw prohibido(`No puedes asignar un rol por encima del tuyo: ${rol}.`);
  }
  validarConcedeRol(ctx, rol);
}
