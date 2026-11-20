import { cargarPeriodos, permisosNomina } from "./datos";
import { SegmentoRemuneraciones } from "./segmento-remuneraciones";

/** Período de la ruta `/remuneraciones/[id]/…` con los permisos de Nómina del usuario. */
export async function periodoDeRuta(params: Promise<{ id: string }>) {
  const [{ id }, per, perm] = await Promise.all([params, cargarPeriodos(), permisosNomina()]);
  const periodo = per.ok ? (per.data.find((p) => p.id === id) ?? null) : null;
  return { id, periodo, perm };
}

/** Insignia, vuelta al período y título «Sección · Mes año» de las subpáginas del período. */
export const opcionesPeriodo =
  (seccion: string) =>
  (d: { id: string; periodo: { etiqueta: string } | null }) => ({
    insignia: <SegmentoRemuneraciones activa="periodos" />,
    volver: { href: `/remuneraciones/${d.id}`, etiqueta: d.periodo?.etiqueta ?? "Período" },
    ...(d.periodo ? { titulo: `${seccion} · ${d.periodo.etiqueta}` } : {}),
  });
