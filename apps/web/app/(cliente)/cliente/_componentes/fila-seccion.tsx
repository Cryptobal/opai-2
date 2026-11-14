import { Badge } from "@opai/ds";
import { formatearNumero } from "@opai/domain";

export type Cobertura = { programados: number; cubiertos: number; porCubrir: number; porcentaje: number | null };
export type Seccion = { seccion: string; disponibilidad: "disponible" | "pendiente" };

const SECCION: Record<string, string> = {
  cobertura: "Cobertura",
  rondas: "Rondas realizadas",
  novedades: "Novedades por gravedad",
};

/** Cifra de cobertura: «95,5 % · 21 de 22 turnos» (sin personas ni costos, CAR-491). */
function CifraCobertura({ c }: { c: Cobertura }) {
  if (c.programados === 0) return <span className="t-caption">Sin turnos programados</span>;
  return (
    <span className="flex flex-col items-end gap-0.5 text-right">
      <span className="t-numeric font-medium text-fg">{`${formatearNumero(c.porcentaje ?? 0, 1)}\u00a0%`}</span>
      <span className="t-caption t-numeric">{`${c.cubiertos} de ${c.programados} turnos`}</span>
      {c.porCubrir > 0 ? <Badge tono="warning">{`${c.porCubrir} por cubrir`}</Badge> : null}
    </span>
  );
}

/** Una sección de la tarjeta de instalación: su cifra si ya tiene datos o «Pendiente», sin inventar números. */
export function FilaSeccion({ s, cobertura }: { s: Seccion; cobertura: Cobertura | null }) {
  const cifra = s.seccion === "cobertura" && s.disponibilidad === "disponible" && cobertura;
  return (
    <li className="flex min-h-11 items-center justify-between gap-2 border-t border-border py-2">
      <span className="t-body-sm">{SECCION[s.seccion] ?? s.seccion}</span>
      {cifra ? <CifraCobertura c={cobertura} /> : <Badge tono="neutro">Pendiente</Badge>}
    </li>
  );
}
