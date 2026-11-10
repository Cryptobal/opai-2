import type { Contexto } from "../types";

type Tx = Parameters<Parameters<Contexto["transaccion"]>[0]>[0];

/**
 * Marca como leídos los avisos in-app de una solicitud para todos sus destinatarios. Se enlazan por
 * el evento `comercial.solicitud.creada` de esa solicitud (`eventoId`), no por el texto. Corre dentro
 * de la transacción del cambio de estado: sin ventana entre el estado y el aviso, y sin `dryRun`.
 */
export async function resolverAvisosSolicitud(tx: Tx, tenantId: string, solicitudId: string) {
  const eventos = await tx.evento.findMany({
    where: {
      tenantId,
      tipo: "comercial.solicitud.creada",
      entidadTipo: "solicitud",
      entidadId: solicitudId,
    },
    select: { id: true },
  });
  if (eventos.length === 0) return 0;
  const r = await tx.notificacion.updateMany({
    where: { tenantId, eventoId: { in: eventos.map((e) => e.id) }, leidaEn: null },
    data: { leidaEn: new Date() },
  });
  return r.count;
}
