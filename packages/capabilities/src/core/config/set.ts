import { z } from "zod";

import { defineCapability } from "../../define";
import { conflicto, noEncontrado, prohibido, reglaDeNegocio } from "../../errores";
import { campoAjuste } from "./catalogo";
import { puedeEditar } from "./vista";

export const configSet = defineCapability({
  id: "core.config.set",
  descripcion:
    "Cambia un ajuste en su ámbito: de la empresa (requiere permiso) o una preferencia propia. valor null vuelve al heredado. Los ajustes de plataforma los fija OPAI.",
  permiso: null,
  input: z.object({
    modulo: z.string(),
    clave: z.string(),
    valor: z.unknown(),
    versionEsperada: z.number().int().nonnegative().optional(),
  }),
  output: z.object({
    modulo: z.string(),
    clave: z.string(),
    valor: z.unknown(),
    ambito: z.string(),
    version: z.number(),
  }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const c = campoAjuste(input.modulo, input.clave);
    if (!c) throw noEncontrado(`El ajuste ${input.modulo}.${input.clave}`);
    if (c.meta.ambito === "plataforma") throw prohibido("Este ajuste lo fija OPAI.");
    if (!puedeEditar(ctx, c)) throw prohibido("No tienes permiso para cambiar este ajuste.");
    if (c.meta.soloPersonas && ctx.actor.tipo === "agent")
      throw prohibido("Este ajuste lo cambia una persona, no un agente.");
    const reiniciar = input.valor === null;
    const r = reiniciar ? null : c.schema.safeParse(input.valor);
    if (r && !r.success)
      throw reglaDeNegocio(`Valor inválido: ${r.error.issues[0]?.message ?? ""}`);
    const sujetoId = c.meta.ambito === "usuario" ? (ctx.usuario?.id ?? "") : ctx.tenantId;
    const clave = {
      tenantId: ctx.tenantId,
      ambito: c.meta.ambito,
      sujetoId,
      modulo: c.modulo,
      clave: c.clave,
    };
    return ctx.transaccion(async (tx) => {
      // Serializa incluso el primer INSERT. Siempre dentro de enTransaccion (nunca sobre forTenant).
      if (typeof (tx as { $executeRaw?: unknown }).$executeRaw === "function") {
        const bloqueo = JSON.stringify(clave);
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${bloqueo}, 0))`;
      }
      const previo = await tx.ajuste.findUnique({
        where: { tenantId_ambito_sujetoId_modulo_clave: clave },
      });
      if (input.versionEsperada !== undefined && input.versionEsperada !== (previo?.version ?? 0))
        throw conflicto("La preferencia cambió. Recarga e inténtalo de nuevo.");
      if (dryRun)
        return {
          modulo: c.modulo,
          clave: c.clave,
          valor: r?.data ?? null,
          ambito: c.meta.ambito,
          version: (previo?.version ?? 0) + 1,
        };
      // Tombstone inválido para el esquema: se lee el defecto, conservando revisión monotónica.
      const valorNuevo = reiniciar
        ? { reiniciado: true }
        : JSON.parse(JSON.stringify(r?.data ?? null));
      // Sin cambio real (p. ej. varios clics seguidos al mismo valor, o una respuesta tardía que
      // llega después de una más reciente): ni escritura ni evento de auditoría, y menos tiempo con
      // el advisory lock de esta clave tomado (regresión del PR #109, incidente del 28-oct-2026).
      const sinFilaQueBorrar = reiniciar && !c.clave.startsWith("navegacion_") && previo === null;
      const sinCambio =
        sinFilaQueBorrar ||
        (previo !== null && JSON.stringify(previo.valor) === JSON.stringify(valorNuevo));
      const salida = {
        modulo: c.modulo,
        clave: c.clave,
        valor: r?.data ?? null,
        ambito: c.meta.ambito,
        version: sinCambio ? (previo?.version ?? 0) : (previo?.version ?? 0) + 1,
      };
      if (sinCambio) return salida;
      if (reiniciar && !c.clave.startsWith("navegacion_"))
        await tx.ajuste.deleteMany({ where: clave });
      else
        await tx.ajuste.upsert({
          where: { tenantId_ambito_sujetoId_modulo_clave: clave },
          create: { ...clave, valor: valorNuevo, actualizadoPor: ctx.usuario?.id ?? null },
          update: {
            valor: valorNuevo,
            version: salida.version,
            actualizadoPor: ctx.usuario?.id ?? null,
          },
        });
      await ctx.eventos.emitir(tx, {
        tipo: "core.config.cambiada",
        entidadTipo: "ajuste",
        payload: {
          modulo: c.modulo,
          clave: c.clave,
          ambito: c.meta.ambito,
          version: salida.version,
        },
      });
      return salida;
    });
  },
});
