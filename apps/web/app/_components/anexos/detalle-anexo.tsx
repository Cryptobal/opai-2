import { Alerta, AvisoAnexo, DocumentoBorrador, Estado } from "@opai/ds";

import { estadoPantalla } from "@/lib/formato";
import { ejecutarComoUsuario } from "@/lib/servidor";

import { AccionesAnexo } from "./acciones-anexo";
import type { AnexoDetalle } from "./tipos";

/** Anexo en borrador (26-29): documento con plantilla base y marca, panel de aprobación. */
export async function DetalleAnexo({
  personaId,
  anexoId,
  puedeResolver,
}: {
  personaId: string;
  anexoId: string;
  puedeResolver: boolean;
}) {
  const r = await ejecutarComoUsuario<AnexoDetalle>("erp", "core.anexos.get", { id: anexoId });
  if (!r.ok) {
    return (
      <Estado state={estadoPantalla(r)} variante="detalle">
        <p>{r.error.message}</p>
      </Estado>
    );
  }
  const a = r.data;
  return (
    <div className="flex flex-col gap-4">
      <AvisoAnexo estado={a.estado} motivoCambio={a.motivoCambio} motivoRechazo={a.motivoRechazo} />
      <DocumentoBorrador filas={a.filas} />
      {a.estado === "borrador" ? (
        puedeResolver ? (
          <AccionesAnexo anexo={a} personaId={personaId} />
        ) : (
          <Alerta tono="neutral" titulo="Sin permiso para aprobar o rechazar">
            Solo owner y admin resuelven el anexo.
          </Alerta>
        )
      ) : null}
    </div>
  );
}
