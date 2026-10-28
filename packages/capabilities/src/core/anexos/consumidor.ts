import { defineConsumidor, type EventoPublicado } from "../../eventos/consumidores";
import type { Contexto } from "../../types";
import { dondePersona } from "../maestros/alcance";
import { dia } from "../maestros/comun";
import { crearBorrador } from "./comun";

type Motivo = "capa" | "monto" | "instalacion" | "rol";

const porActor = (ev: EventoPublicado): "evento" | "usuario" | "agente" =>
  ev.actorTipo === "user" ? "usuario" : ev.actorTipo === "agent" ? "agente" : "evento";

/** Vínculos vigentes que resuelven su capa desde la instalación o el puesto modificados (sin
 *  atribuir por cargo): mismo criterio que la vista previa de impacto de PR 1, pero devuelve la
 *  lista (persona, vínculo) en vez del conteo, para generar un borrador por persona (R11, D3). */
async function vinculosAfectados(ctx: Contexto, nivel: string, ref: string, fecha: string) {
  if (nivel !== "instalacion" && nivel !== "puesto") return [];
  const vigente = {
    estado: "vigente",
    vigenteDesde: { lte: new Date(`${fecha}T00:00:00.000Z`) },
    OR: [{ vigenteHasta: null }, { vigenteHasta: { gte: new Date(`${fecha}T00:00:00.000Z`) } }],
  };
  const vinculos = await ctx.db.vinculoLaboral.findMany({
    where: {
      estado: "vigente",
      persona: dondePersona(ctx),
      ...(nivel === "instalacion" ? { instalacionId: ref } : { puestoId: ref }),
    },
  });
  if (!vinculos.length) return [];
  const capasMasEspecificas = await ctx.db.estructuraSueldo.findMany({
    where: {
      ...vigente,
      OR: [
        { nivel: "persona", personaId: { in: vinculos.map((v) => v.personaId) } },
        ...(nivel === "instalacion"
          ? [
              {
                nivel: "puesto",
                puestoId: { in: vinculos.flatMap((v) => (v.puestoId ? [v.puestoId] : [])) },
              },
            ]
          : []),
      ],
    },
  });
  return vinculos.filter(
    (v) =>
      !capasMasEspecificas.some(
        (c) => c.personaId === v.personaId || (c.nivel === "puesto" && c.puestoId === v.puestoId),
      ),
  );
}

async function porCambioDeEstructura(
  ctx: Contexto,
  ev: EventoPublicado,
  motivoBase: Motivo,
  snapshotDespues: Record<string, unknown>,
  estructuraAntesId: string | null,
) {
  const p = ev.payload as { nivel?: string; ref?: string; desde?: string };
  if (!p.nivel || !p.ref) return;
  const fecha = p.desde ?? dia(ev.createdAt) ?? "";
  const generadoPorTipo = porActor(ev);
  const snapshotAntes = estructuraAntesId
    ? { tipo: "estructura" as const, estructuraId: estructuraAntesId }
    : null;
  if (p.nivel === "persona") {
    const vinculo = await ctx.db.vinculoLaboral.findFirst({
      where: { personaId: p.ref, estado: "vigente", persona: dondePersona(ctx) },
    });
    if (!vinculo) return; // Sin vínculo vigente: no hay contrato al que anexar (caso límite, §10).
    await ctx.transaccion((tx) =>
      crearBorrador(ctx, tx, {
        personaId: p.ref as string,
        vinculoId: vinculo.id,
        motivoCambio: motivoBase,
        snapshotAntes,
        snapshotDespues,
        generadoPorTipo,
        generadoPorId: ev.actorId ?? ev.viaUserId ?? null,
        origenEventoId: ev.id,
      }),
    );
    return;
  }
  if (p.nivel === "instalacion" || p.nivel === "puesto") {
    const afectados = await vinculosAfectados(ctx, p.nivel, p.ref, fecha);
    for (const v of afectados) {
      await ctx.transaccion((tx) =>
        crearBorrador(ctx, tx, {
          personaId: v.personaId,
          vinculoId: v.id,
          motivoCambio: motivoBase,
          snapshotAntes,
          snapshotDespues,
          generadoPorTipo,
          generadoPorId: ev.actorId ?? ev.viaUserId ?? null,
          origenEventoId: ev.id,
        }),
      );
    }
  }
}

async function porCambioDeVinculo(ctx: Contexto, ev: EventoPublicado) {
  const p = ev.payload as {
    personaId?: string;
    antes?: unknown;
    despues?: unknown;
    campos?: string[];
  };
  if (!p.personaId || !ev.entidadId) return;
  // Solo instalación o puesto cambian la capa que rige (R11); la jornada pactada por sí sola no
  // genera anexo.
  if (!p.campos?.some((c) => c === "instalacionId" || c === "puestoId")) return;
  await ctx.transaccion((tx) =>
    crearBorrador(ctx, tx, {
      personaId: p.personaId as string,
      vinculoId: ev.entidadId as string,
      motivoCambio: "instalacion",
      snapshotAntes: p.antes ?? null,
      snapshotDespues: p.despues ?? {},
      generadoPorTipo: porActor(ev),
      generadoPorId: ev.actorId ?? ev.viaUserId ?? null,
      origenEventoId: ev.id,
    }),
  );
}

/**
 * Genera el borrador del anexo cuando cambia la capa de sueldo que rige, el monto de una versión o
 * la instalación/puesto del vínculo (R11, ADR-029). El disparo no depende del orden de merge de los
 * PR: antes de este consumidor, los eventos se publican sin efecto (§15 del brief).
 */
export const consumidorAnexos = defineConsumidor({
  id: "core.anexos",
  descripcion: "Genera el borrador del anexo de contrato cuando cambia la capa, el monto o la instalación de una persona.",
  eventos: ["core.estructura.creada", "core.estructura.anulada", "core.vinculo.actualizado"],
  async handler(ctx, ev) {
    if (ev.tipo === "core.estructura.creada") {
      const p = ev.payload as { nivel?: string; cierra?: string | null };
      const snapshotDespues = { tipo: "estructura" as const, nivel: p.nivel, estructuraId: ev.entidadId };
      await porCambioDeEstructura(ctx, ev, p.cierra ? "monto" : "capa", snapshotDespues, p.cierra ?? null);
    } else if (ev.tipo === "core.estructura.anulada") {
      const p = ev.payload as { nivel?: string; ref?: string; anterior?: string | null };
      const snapshotDespues = { tipo: "anulacion" as const, nivel: p.nivel, ref: p.ref };
      await porCambioDeEstructura(ctx, ev, "capa", snapshotDespues, p.anterior ?? null);
    } else if (ev.tipo === "core.vinculo.actualizado") {
      await porCambioDeVinculo(ctx, ev);
    }
  },
});
