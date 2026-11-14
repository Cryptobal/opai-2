import { Badge, Empty } from "@opai/ds";
import { formatearFechaHora } from "@opai/domain";

import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";

import { nombreDeMes } from "../../_componentes/mes";

export type NovedadLibro = {
  id: string;
  codigo: string | null;
  fecha: string;
  gravedad: string;
  estado: string;
  tipo: string | null;
  resumen: string;
  detalle: string | null;
};

export type Libro = {
  instalacionId: string;
  instalacionNombre: string;
  mes: string;
  items: NovedadLibro[];
  siguiente: string | null;
};

const GRAVEDAD: Record<string, { tono: "danger" | "warning" | "neutro"; texto: string }> = {
  alta: { tono: "danger", texto: "Alta" },
  media: { tono: "warning", texto: "Media" },
  baja: { tono: "neutro", texto: "Baja" },
};

const ESTADO: Record<string, string> = {
  abierta: "Abierta",
  en_atencion: "En atención",
  resuelta: "Resuelta",
  cerrada: "Cerrada",
  derivada: "Derivada",
};

/** Libro de novedades del mes (CAR-502): lo que escribió el guardia, de la más reciente a la más antigua. */
export function LibroNovedades({ l }: { l: Libro }) {
  const base = `/cliente/libro/${l.instalacionId}?mes=${l.mes}`;
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="t-title text-fg">{l.instalacionNombre}</h2>
        <p className="t-caption">{nombreDeMes(l.mes)}</p>
      </div>
      {l.items.length === 0 ? (
        <Empty
          titulo="Sin novedades este mes"
          descripcion="Cuando el guardia registre una novedad, la verás aquí."
        />
      ) : (
        <ul className="overflow-hidden rounded-lg border border-border bg-surface">
          {l.items.map((n) => {
            const g = GRAVEDAD[n.gravedad];
            return (
              <li
                key={n.id}
                className="flex flex-col gap-1 border-b border-border px-4 py-3 last:border-b-0"
              >
                <span className="flex flex-wrap items-center gap-2">
                  {g ? <Badge tono={g.tono}>{g.texto}</Badge> : null}
                  <span className="t-caption">{ESTADO[n.estado] ?? n.estado}</span>
                  <span className="t-caption t-numeric">{formatearFechaHora(n.fecha)}</span>
                  {n.tipo ? <span className="t-caption">{n.tipo}</span> : null}
                </span>
                <span className="text-base font-medium text-fg">{n.resumen}</span>
                {n.detalle ? (
                  <span className="t-body-sm whitespace-pre-line text-fg-muted">{n.detalle}</span>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
      {l.siguiente ? (
        <div>
          <EnlaceBoton href={`${base}&desde=${l.siguiente}`} variante="secondary">
            Ver más antiguas
          </EnlaceBoton>
        </div>
      ) : null}
    </div>
  );
}
