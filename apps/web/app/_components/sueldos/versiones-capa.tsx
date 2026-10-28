import { Alerta, TablaEstructura, VersionesVigencia } from "@opai/ds";
import type { EstructuraVista, Nivel } from "@/lib/tipos-sueldo";
import { AnularCapaDiferida } from "./anular-capa-diferida";

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
            {v.conceptosFaltantes?.length ? (
              <Alerta
                tono="warning"
                titulo="Estructura incompleta: define los conceptos faltantes en una nueva versión"
              >
                Faltan: {v.conceptosFaltantes.join(", ")}
              </Alerta>
            ) : null}
            <TablaEstructura estructura={v} origen={{ capa: nivel, version: v.vigenteDesde }} />
            {v.motivo ? <p className="t-body-sm">Motivo: {v.motivo}</p> : null}
            {gestionar && v.estado !== "anulada" ? <AnularCapaDiferida id={v.id} /> : null}
          </>
        ),
      }))}
    />
  );
}
