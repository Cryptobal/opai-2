import type { ClaseFirma, NivelFirma } from "@opai/domain";

import type { Contexto } from "../../types";
import type { FirmanteInput } from "./enviar-util";
import { construirFirmantes } from "./enviar-util";
import { registrarEvidencia } from "./comun-flujo";
import { vistaSolicitud } from "./vistas";

type DocFirma = { id: string; version: number; sha256: string | null };

export async function crearSolicitudFirma(
  ctx: Contexto,
  doc: DocFirma,
  input: {
    clase: ClaseFirma;
    nivel: NivelFirma;
    orden: "secuencial" | "paralelo";
    mensaje?: string | undefined;
    firmantes: readonly FirmanteInput[];
  },
  vence: Date,
) {
  const base = {
    documentoId: doc.id,
    documentoVersion: doc.version,
    sha256: doc.sha256!,
    clase: input.clase,
    nivel: input.nivel,
    orden: input.orden,
    mensaje: input.mensaje ?? null,
    plazoVence: vence,
  };
  const firmantes = construirFirmantes(ctx.tenantId, input.firmantes, vence);
  const creada = await ctx.transaccion(async (tx) => {
    const s = await tx.solicitudFirma.create({
      data: {
        tenantId: ctx.tenantId,
        ...base,
        estado: "enviada",
        enviadaPorTipo: ctx.actor.tipo,
        enviadaPorId: ctx.actor.tipo === "user" ? ctx.actor.id : null,
        viaUserId: ctx.actor.viaUserId ?? null,
      },
    });
    for (const f of firmantes) await tx.firmante.create({ data: { ...f.row, solicitudId: s.id } });
    const hecho = await registrarEvidencia(ctx, tx, s, {
      tipo: "enviada",
      nivel: input.nivel,
      sha256: doc.sha256!,
    });
    await tx.solicitudFirma.update({ where: { id: s.id }, data: { bitacoraSeq: hecho.seq } });
    await ctx.eventos.emitir(tx, {
      tipo: "documentos.firma.solicitada",
      entidadTipo: "solicitud_firma",
      entidadId: s.id,
      payload: { clase: input.clase, nivel: input.nivel, orden: input.orden, pendientes: firmantes.length },
    });
    return tx.solicitudFirma.findUniqueOrThrow({
      where: { id: s.id },
      include: { firmantes: true },
    });
  });
  return vistaSolicitud(creada);
}