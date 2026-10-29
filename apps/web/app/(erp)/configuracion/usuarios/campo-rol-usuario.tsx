"use client";

import { Campo, Select } from "@opai/ds";

import { ETIQUETA_ROL } from "@/app/_components/portales";

import { rolesAsignables } from "./campos";
import type { RolVista } from "./_permisos/roles";
import { type ModuloCatalogo, resumenPermisos } from "./_permisos/etiquetas";
import type { Miembro } from "./usuarios-lista";

/** Selección del campo Rol: `base:<rol>` (rol del sistema) o `rol:<id>` (personalizado). */
export const seleccionDe = (m: Pick<Miembro, "rol" | "roleId">) =>
  m.roleId ? `rol:${m.roleId}` : `base:${m.rol}`;

/**
 * Permisos del rol elegido (sin excepciones): los del sistema vienen expandidos en la lista. null si
 * el rol no está en la lista (archivado o no se pudo cargar): no se afirma que «no da acceso».
 */
export function permisosDeSeleccion(sel: string, roles: readonly RolVista[]): string[] | null {
  const id = sel.startsWith("base:") ? `sistema:${sel.slice(5)}` : sel.slice(4);
  return roles.find((r) => r.id === id)?.permisos ?? null;
}

type Props = {
  miembro: Miembro;
  valor: string;
  onCambiar: (sel: string) => void;
  miRol: string;
  roles: readonly RolVista[];
  /** Puede asignar roles personalizados (owner o admin, §16.2). */
  gestionaRoles: boolean;
  /** Si es el único owner activo de la empresa (no se le cambia el rol). */
  ultimoOwner: boolean;
  catalogo: readonly ModuloCatalogo[];
  /** Permisos efectivos de la selección (rol + excepciones); null si no se conocen. */
  efectivos: readonly string[] | null;
};

/** Rol del usuario (A4 §1): roles del sistema y personalizados, y su resumen «Qué puede hacer». */
export function CampoRolUsuario(p: Props) {
  const esOwner = p.miembro.rol === "owner";
  const bloqueo =
    esOwner && p.ultimoOwner
      ? "Es el único owner de la empresa. Asigna otro owner antes de cambiar su rol."
      : esOwner && p.miRol !== "owner"
        ? "Solo un owner puede cambiar a otro owner"
        : !p.gestionaRoles && p.miembro.roleId
          ? "Solo un owner o un administrador cambia un rol personalizado."
          : undefined;
  const base = rolesAsignables(p.miRol).map((r) => ({
    valor: `base:${r}`,
    etiqueta: ETIQUETA_ROL[r] ?? r,
  }));
  // Owner nunca lleva un rol personalizado (A21): para darle uno, primero se le baja el rol base.
  const propios =
    p.gestionaRoles && !esOwner
      ? p.roles
          .filter((r) => !r.sistema)
          .map((r) => ({ valor: `rol:${r.id}`, etiqueta: r.nombre, descripcion: "Personalizado" }))
      : [];
  const actual = [...base, ...propios].some((o) => o.valor === p.valor)
    ? []
    : [
        {
          valor: p.valor,
          etiqueta: p.miembro.rolNombre ?? ETIQUETA_ROL[p.miembro.rol] ?? p.miembro.rol,
        },
      ];
  const resumen = p.efectivos ? resumenPermisos(p.catalogo, p.efectivos) : null;
  return (
    <div className="flex flex-col gap-3">
      <Campo etiqueta="Rol" htmlFor="edit-rol" {...(bloqueo ? { ayuda: bloqueo } : {})}>
        <Select
          id="edit-rol"
          valor={p.valor}
          onCambiar={p.onCambiar}
          disabled={bloqueo !== undefined}
          opciones={[...actual, ...base, ...propios]}
        />
      </Campo>
      <div className="flex flex-col gap-1">
        <h3 className="t-label text-fg">Qué puede hacer</h3>
        {resumen === null ? (
          <p className="text-sm text-fg-muted">No pudimos cargar los permisos de este rol.</p>
        ) : resumen.length ? (
          <ul className="flex flex-col gap-1 text-sm text-fg-muted">
            {resumen.map((r) => (
              <li key={r.modulo}>
                <strong className="font-medium text-fg">{r.modulo}.</strong> {r.texto}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-fg-muted">Este rol no da acceso a nada todavía.</p>
        )}
      </div>
    </div>
  );
}
