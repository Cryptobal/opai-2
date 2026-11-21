import { Badge } from "@opai/ds";

export type Esperado = {
  visitanteId: string;
  nombre: string;
  empresa: string | null;
  documento: string;
  desdeMin: number | null;
  hastaMin: number | null;
  anfitrion: string;
  motivo: string | null;
  nota: string | null;
  ingreso: boolean;
};

const hhmm = (m: number) =>
  `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
const horario = (e: Esperado) =>
  e.desdeMin === null || e.hastaMin === null
    ? "Todo el día"
    : `${hhmm(e.desdeMin)} – ${hhmm(e.hastaMin)}`;
/** Lista de los esperados de hoy con su horario, anfitrión y si ya entraron. */
export function ListaEsperados({ items }: { items: Esperado[] }) {
  return (
    <ul className="flex flex-col divide-y divide-border">
      {items.map((e) => (
        <li key={e.visitanteId} className="flex items-center justify-between gap-3 py-2">
          <span className="flex min-w-0 flex-col">
            <span className="t-body truncate text-fg">{e.nombre}</span>
            <span className="t-caption">
              {[e.empresa, horario(e), e.anfitrion].filter(Boolean).join(" · ")}
            </span>
          </span>
          <Badge tono={e.ingreso ? "success" : "info"} punto>
            {e.ingreso ? "Ingresó" : "Esperado"}
          </Badge>
        </li>
      ))}
    </ul>
  );
}
