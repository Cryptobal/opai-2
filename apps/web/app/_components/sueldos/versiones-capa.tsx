import { TablaEstructura, VersionesVigencia } from "@opai/ds";
import type { EstructuraVista, Nivel } from "@/lib/tipos-sueldo";
import { AnularCapa } from "./anular-capa";

export function VersionesCapa({
  versiones,
  nivel,
  gestionar,
}: {
  versiones: EstructuraVista[];
  nivel: Nivel;
  gestionar: boolean;
}) {
  return (
    <VersionesVigencia
      versiones={versiones.map((v) => ({
        id: v.id,
        desde: v.vigenteDesde,
        hasta: v.vigenteHasta,
        estado: v.estado,
        contenido: (
          <>
            <TablaEstructura estructura={v} origen={{ capa: nivel, version: v.vigenteDesde }} />
            {v.motivo ? <p className="t-body-sm">Motivo: {v.motivo}</p> : null}
            {gestionar && v.estado !== "anulada" ? <AnularCapa id={v.id} /> : null}
          </>
        ),
      }))}
    />
  );
}
