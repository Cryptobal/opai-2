import { Badge } from "@opai/ds";

import { descripcionCelda } from "./celda-turno";
import { etiquetaVariante, MOTIVO } from "./etiquetas";
import { etiquetaPresencia } from "./presencia";
import type { CeldaDia } from "./tipos";

export function BadgesEstadoCelda({ celda }: { celda: CeldaDia }) {
  const variante = etiquetaVariante(celda.variante ?? null);
  return (
    <p className="flex flex-wrap items-center gap-2 text-base">
      <Badge tono={celda.estado === "ppc" ? "danger" : celda.estado === "cubierto" ? "success" : "neutro"}>
        {descripcionCelda(celda).split(" · ")[0]}
      </Badge>
      {celda.estado === "ppc" && celda.motivo ? (
        <span className="text-fg-muted">{MOTIVO[celda.motivo]}</span>
      ) : null}
      {variante && celda.estado !== "ppc" ? <Badge tono="info">{variante}</Badge> : null}
      {celda.confirmado ? <Badge tono="neutro">Confirmado</Badge> : null}
      <BadgePresencia celda={celda} />
      {celda.marcaManual ? <Badge tono="warning">Marca manual</Badge> : null}
      {celda.feriado ? <Badge tono="warning">{celda.feriado}</Badge> : null}
    </p>
  );
}

export function BadgesCeldaDiaria({ celda }: { celda: CeldaDia }) {
  const variante = etiquetaVariante(celda.variante ?? null);
  return (
    <span className="flex shrink-0 flex-wrap justify-end gap-1">
      {celda.estado === "ppc" ? (
        <Badge tono="danger">PPC · {celda.motivo ? MOTIVO[celda.motivo] : ""}</Badge>
      ) : (
        <Badge tono="success">Cubierto</Badge>
      )}
      {variante && celda.estado !== "ppc" ? <Badge tono="info">{variante}</Badge> : null}
      {celda.confirmado ? <Badge tono="neutro">Confirmado</Badge> : null}
      <BadgePresencia celda={celda} />
      {celda.marcaManual ? <Badge tono="warning">Marca</Badge> : null}
    </span>
  );
}

/** Evidencia de asistencia real (marcas de Asistencia, por rostro o RUT+PIN) junto al estado de cobertura. */
function BadgePresencia({ celda }: { celda: CeldaDia }) {
  const p = etiquetaPresencia(celda);
  if (!p) return null;
  return <Badge tono={p.tono}>{p.detalle ? `${p.texto} · ${p.detalle}` : p.texto}</Badge>;
}
