import { Badge } from "@opai/ds";
import { formatearNumero } from "@opai/domain";

export type Cobertura = { programados: number; cubiertos: number; porCubrir: number; porcentaje: number | null };
export type Rondas = { realizadas: number; completas: number; incompletas: number; porcentaje: number | null };
export type Novedades = { total: number; alta: number; media: number; baja: number; abiertas: number };
export type Seccion = { seccion: string; disponibilidad: "disponible" | "pendiente" };

const SECCION: Record<string, string> = {
  cobertura: "Cobertura",
  rondas: "Rondas realizadas",
  novedades: "Novedades por gravedad",
};

const pct = (n: number | null) => `${formatearNumero(n ?? 0, 1)}\u00a0%`;

/** Cifra de rondas: «50 % · 1 de 2 completas» y «K incompletas» (sin quién las hizo, CAR-492). */
function CifraRondas({ r }: { r: Rondas }) {
  if (r.realizadas === 0) return <span className="t-caption">Sin rondas este mes</span>;
  return (
    <span className="flex flex-col items-end gap-0.5 text-right">
      <span className="t-numeric font-medium text-fg">{pct(r.porcentaje)}</span>
      <span className="t-caption t-numeric">{`${r.completas} de ${r.realizadas} completas`}</span>
      {r.incompletas > 0 ? <Badge tono="warning">{plural(r.incompletas, "incompleta", "incompletas")}</Badge> : null}
    </span>
  );
}

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

/** Novedades por gravedad: «3 en el mes», «1 alta» y «K abiertas» (solo cantidades, CAR-493). */
function CifraNovedades({ n }: { n: Novedades }) {
  if (n.total === 0) return <span className="t-caption">Sin novedades este mes</span>;
  return (
    <span className="flex flex-col items-end gap-0.5 text-right">
      <span className="t-numeric font-medium text-fg">{`${n.total} en el mes`}</span>
      <span className="t-caption t-numeric">{`${plural(n.alta, "alta", "altas")} · ${plural(n.media, "media", "medias")} · ${plural(n.baja, "baja", "bajas")}`}</span>
      {n.abiertas > 0 ? <Badge tono="warning">{plural(n.abiertas, "abierta", "abiertas")}</Badge> : null}
    </span>
  );
}

/** Cifra de cobertura: «95,5 % · 21 de 22 turnos» (sin personas ni costos, CAR-491). */
function CifraCobertura({ c }: { c: Cobertura }) {
  if (c.programados === 0) return <span className="t-caption">Sin turnos programados</span>;
  return (
    <span className="flex flex-col items-end gap-0.5 text-right">
      <span className="t-numeric font-medium text-fg">{pct(c.porcentaje)}</span>
      <span className="t-caption t-numeric">{`${c.cubiertos} de ${c.programados} turnos`}</span>
      {c.porCubrir > 0 ? <Badge tono="warning">{`${c.porCubrir} por cubrir`}</Badge> : null}
    </span>
  );
}

/** Una sección de la tarjeta de instalación: su cifra si ya tiene datos o «Pendiente», sin inventar números. */
type Datos = { cobertura: Cobertura | null; rondas: Rondas | null; novedades: Novedades | null };

function Cifra({ s, d }: { s: Seccion; d: Datos }) {
  if (s.disponibilidad === "disponible") {
    if (s.seccion === "cobertura" && d.cobertura) return <CifraCobertura c={d.cobertura} />;
    if (s.seccion === "rondas" && d.rondas) return <CifraRondas r={d.rondas} />;
    if (s.seccion === "novedades" && d.novedades) return <CifraNovedades n={d.novedades} />;
  }
  return <Badge tono="neutro">Pendiente</Badge>;
}

export function FilaSeccion({ s, datos }: { s: Seccion; datos: Datos }) {
  return (
    <li className="flex min-h-11 items-center justify-between gap-2 border-t border-border py-2">
      <span className="t-body-sm">{SECCION[s.seccion] ?? s.seccion}</span>
      <Cifra s={s} d={datos} />
    </li>
  );
}
