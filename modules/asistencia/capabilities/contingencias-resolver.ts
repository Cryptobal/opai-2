import type { Contexto } from "@opai/capabilities";
import { conflicto, reglaDeNegocio } from "@opai/capabilities";
import type { TenantTx } from "@opai/db";

import { agregarMarcaDeContingencia } from "./contingencias-aceptar";

type Fila = {
  id: string;
  personaId: string;
  instalacionId: string;
  tipo: string;
  horaDeclarada: Date;
  motivo: string;
  estado: string;
  evidenciaDocumentoId: string | null;
  marcaId: string | null;
  autorId: string;
};

export async function resolverContingencia(
  ctx: Contexto,
  tx: TenantTx,
  c: Fila,
  decision: "aceptada" | "rechazada",
  comentario: string | undefined,
  resueltaPorId: string,
) {
  if (c.estado !== "pendiente") throw conflicto("Esta contingencia ya fue respondida.");
  if (c.autorId === resueltaPorId && resueltaPorId) throw conflicto("Quien propuso la contingencia no puede responderla.");
  if (decision === "rechazada" && (comentario?.trim().length ?? 0) < 3) throw reglaDeNegocio("Para objetar escribe un comentario.");
  const marcaId = decision === "aceptada" ? await agregarMarcaDeContingencia(ctx, tx, c) : null;
  const hecho = await tx.contingencia.updateMany({
    where: { id: c.id, estado: "pendiente" },
    data: {
      estado: decision,
      marcaId,
      resueltaPorId: resueltaPorId || null,
      resueltaEn: new Date(),
      motivoResolucion: comentario ?? null,
    },
  });
  if (hecho.count !== 1) throw conflicto("Esta contingencia ya fue respondida.");
  await ctx.bitacora.registrar(tx, {
    tipo: "asistencia.contingencia.respondida",
    entidadTipo: "contingencia",
    entidadId: c.id,
    payload: { decision, marcaId },
  });
  await ctx.eventos.emitir(tx, {
    tipo: "asistencia.contingencia.respondida",
    entidadTipo: "contingencia",
    entidadId: c.id,
    payload: { contingenciaId: c.id, personaId: c.personaId, decision },
  });
  return marcaId;
}