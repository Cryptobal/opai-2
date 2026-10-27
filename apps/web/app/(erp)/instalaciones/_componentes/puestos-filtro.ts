import { activosPrimero } from "@/app/_components/maestros/badge-puesto";
import type { Puesto } from "@/lib/tipos-maestros";

export type ConteosPuestos = { todos: number; activos: number; inactivos: number; ppc: number };

/** Conteos para el subtítulo y los chips (Brief 11): activos, inactivos y por cubrir (PPC). */
export function conteosPuestos(ps: Puesto[]): ConteosPuestos {
  const activos = ps.filter((p) => p.estado === "activo");
  const ppc = activos.filter((p) => p.cobertura === "ppc").length;
  return { todos: ps.length, activos: activos.length, inactivos: ps.length - activos.length, ppc };
}

// Minúsculas sin tildes para que «portería» encuentre «Porteria» y viceversa.
const normaliza = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");

/** Filtra por el chip (`?filtro=`) y el buscador (`?q=`), con los inactivos siempre al final. */
export function filtrarPuestos(ps: Puesto[], q?: string, filtro?: string): Puesto[] {
  let f = ps;
  if (filtro === "ppc") f = f.filter((p) => p.estado === "activo" && p.cobertura === "ppc");
  else if (filtro === "inactivos") f = f.filter((p) => p.estado !== "activo");
  const n = q?.trim() ? normaliza(q) : "";
  if (n) f = f.filter((p) => normaliza(p.nombre).includes(n));
  return activosPrimero(f);
}

/** Subtítulo de la cabecera: «6 activos · 2 inactivos · 3 por cubrir (PPC)». */
export function subtituloPuestos(c: ConteosPuestos): string {
  const partes = [
    `${c.activos} ${c.activos === 1 ? "activo" : "activos"}`,
    `${c.inactivos} ${c.inactivos === 1 ? "inactivo" : "inactivos"}`,
  ];
  if (c.ppc) partes.push(`${c.ppc} por cubrir (PPC)`);
  return partes.join(" · ");
}
