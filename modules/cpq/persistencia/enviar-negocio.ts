import type { Contexto } from "@opai/capabilities";
import type { TenantTx } from "@opai/db";

import { aplicarEtapa } from "@opai/capabilities";

const ETAPA_PROPUESTA = "Propuesta enviada";

type NegocioEnvio = {
  id: string;
  etapaId: string;
  estado: string;
  createdAt: Date;
  embudoId: string;
};

/** Tras enviar CPQ: etapa «Propuesta enviada» e historial (diseño Comercial / cpq envío). */
export async function moverNegocioPropuestaEnviada(
  ctx: Contexto,
  tx: TenantTx,
  negocio: NegocioEnvio,
  ahora: Date,
) {
  if (negocio.estado !== "abierto") return;
  const destino = await tx.etapa.findFirst({
    where: { embudoId: negocio.embudoId, nombre: ETAPA_PROPUESTA, activa: true },
    select: { id: true, tipo: true },
  });
  if (!destino || destino.id === negocio.etapaId) return;
  await aplicarEtapa(ctx, tx, negocio, destino, {
    evento: "comercial.negocio.etapa_cambiada",
    datos: { cotizacionEnviadaEn: ahora },
  });
}
