import { activosPrimero } from "@/app/_components/maestros/badge-puesto";
import type { Puesto } from "@/lib/tipos-maestros";

export type ConteosPuestos = { todos: number; activos: number; inactivos: number; ppc: number };

/** Conteos para el subtítulo (Brief 11): activos, inactivos y por cubrir (PPC). */
export function conteosPuestos(ps: Puesto[]): ConteosPuestos {
  const activos = ps.filter((p) => p.estado === "activo");
  const ppc = activos.filter((p) => p.cobertura === "ppc").length;
  return { todos: ps.length, activos: activos.length, inactivos: ps.length - activos.length, ppc };
}

/** Valor del chip de patrón para los puestos sin patrón asignado. */
export const SIN_PATRON = "sin-patron";

/** Opciones del chip de patrón (review 5662449808 punto 3): solo los patrones en uso aquí. */
export function opcionesPatron(ps: readonly Puesto[]): { valor: string; etiqueta: string }[] {
  const vistos = new Map<string, string>();
  let sinPatron = false;
  for (const p of ps) {
    if (p.patronId) vistos.set(p.patronId, p.patron ?? p.patronId);
    else sinPatron = true;
  }
  const opciones = [...vistos.entries()]
    .sort((a, b) => a[1].localeCompare(b[1]))
    .map(([valor, etiqueta]) => ({ valor, etiqueta }));
  return sinPatron ? [...opciones, { valor: SIN_PATRON, etiqueta: "Sin patrón" }] : opciones;
}

// Minúsculas sin tildes para que «portería» encuentre «Porteria» y viceversa.
const normaliza = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");

export type FiltroPuestos = { q?: string; estado?: string; cobertura?: string; patron?: string };

/**
 * Filtra por los chips (`?estado=`, `?cobertura=`, `?patron=`) y el buscador (`?q=`), con los
 * inactivos siempre al final (review 5662449808 punto 3: chips de activo y de patrón).
 */
export function filtrarPuestos(ps: Puesto[], f: FiltroPuestos): Puesto[] {
  let r = ps;
  if (f.estado === "activo") r = r.filter((p) => p.estado === "activo");
  else if (f.estado === "inactivo") r = r.filter((p) => p.estado !== "activo");
  if (f.cobertura === "ppc") r = r.filter((p) => p.estado === "activo" && p.cobertura === "ppc");
  else if (f.cobertura === "cubierto") r = r.filter((p) => p.cobertura === "cubierto");
  if (f.patron === SIN_PATRON) r = r.filter((p) => !p.patronId);
  else if (f.patron) r = r.filter((p) => p.patronId === f.patron);
  const n = f.q?.trim() ? normaliza(f.q) : "";
  if (n) r = r.filter((p) => normaliza(p.nombre).includes(n));
  return activosPrimero(r);
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
