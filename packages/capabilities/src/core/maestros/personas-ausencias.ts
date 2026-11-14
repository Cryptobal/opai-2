// Ausencias de la persona en el Núcleo (CAR-393 parte 2; referente Rippling / BambooHR / Deel): el registro no depende
// de tener turnos ni del módulo Pauta. Si la empresa tiene Pauta, la misma transacción marca los turnos que la persona
// tiene como titular en esas fechas; sin Pauta (o sin turnos) queda solo el registro.
import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../../define";
import { noEncontrado, prohibido, reglaDeNegocio } from "../../errores";
import { anotar } from "../../pauta/anotar";
import { escribirAusencia, salidaAusencia } from "../../pauta/ausencias-escribir";
import {
  entradaListaAusencias,
  listarAusencias,
  salidaListaAusencias,
} from "../../pauta/ausencias-listar";
import { ausenciaPersonaInput, personaParaAusencia } from "../../pauta/ausencias-plan";
import { fechaIso } from "../../pauta/comun";
import { uuidSchema } from "../esquemas";
import { dondePuesto } from "./alcance";
import { ausenciasClases } from "./ausencias-clases";

export const personasAusenciasRegistrar = defineCapability({
  id: "core.ausencias.registrar",
  descripcion:
    "Registra un permiso, licencia, vacaciones o ausencia de una persona para un día o un rango, aunque no tenga turnos o la empresa no use la pauta. Si la empresa usa la pauta, en el mismo acto marca los turnos que la persona tiene como titular en esas fechas.",
  permiso: PERMISOS_CORE.personasLaboralManage,
  input: ausenciaPersonaInput,
  output: salidaAusencia,
  efecto: "escritura",
  // El motivo es texto libre y puede ser de salud: no llega en claro a la auditoría (CAR-393).
  sensibles: ["motivo"],
  dryRun: true,
  handler: (ctx, input, { dryRun }) =>
    escribirAusencia(ctx, input, {
      dryRun,
      conPauta: ctx.modulosActivos.includes("pauta"),
      exigirTurnos: false,
      exigirPermisoPauta: true,
    }),
});

export const personasAusenciasListar = defineCapability({
  id: "core.ausencias.listar",
  descripcion:
    "Lista los permisos, licencias, vacaciones y ausencias registrados de una persona, con sus fechas, si siguen vigentes o se anularon y, si la empresa usa la pauta, los turnos e instalaciones que marcan. Pagina con cursor.",
  permiso: PERMISOS_CORE.personasLaboralRead,
  input: entradaListaAusencias.extend({ cursor: z.string().optional() }),
  output: z.object({
    personaId: z.string(),
    items: salidaListaAusencias.shape.grupos,
    siguiente: z.string().nullable(),
  }),
  // El motivo es texto libre y puede ser de salud: la lectura queda auditada con lo revelado.
  auditarLectura: (s) => [s.personaId, ...s.items.map((g) => g.ausenciaId)],
  efecto: "lectura",
  dryRun: false,
  handler: async (ctx, input) => {
    const { personaId, grupos, siguiente } = await listarAusencias(ctx, input);
    return { personaId, items: grupos, siguiente };
  },
});

export const personasAusenciasAnular = defineCapability({
  id: "core.ausencias.anular",
  descripcion:
    "Anula un registro de ausencia de una persona (permiso, licencia, vacaciones o ausencia): queda en el historial como anulado y, si marcaba turnos en la pauta, esos turnos vuelven a cubrirse según su serie.",
  permiso: PERMISOS_CORE.personasLaboralManage,
  input: z.object({ personaId: uuidSchema, ausenciaId: uuidSchema }),
  output: z.object({ ausenciaId: z.string(), turnosLiberados: z.number().int() }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, { personaId, ausenciaId }, { dryRun }) {
    await personaParaAusencia(ctx, personaId);
    const cargar = async (db: typeof ctx.db) => {
      const a = await db.ausencia.findFirst({
        where: { id: ausenciaId, personaId },
        select: { estado: true },
      });
      if (!a) throw noEncontrado("La ausencia");
      if (a.estado !== "aprobada" && a.estado !== "solicitada")
        throw reglaDeNegocio("La ausencia ya está anulada o rechazada.");
      const turnos = await db.excepcionPauta.findMany({
        where: { ausenciaId, estado: "activa" },
        select: { id: true, puestoId: true, fecha: true },
      });
      const puestos = await db.puesto.findMany({
        where: { id: { in: [...new Set(turnos.map((t) => t.puestoId))] }, AND: [dondePuesto(ctx)] },
        select: { id: true, instalacionId: true },
      });
      // Alcance (ADR-022): no se liberan turnos de instalaciones que el actor no gestiona.
      if (puestos.length < new Set(turnos.map((t) => t.puestoId)).size)
        throw reglaDeNegocio("La ausencia marca turnos en instalaciones fuera de tu alcance.");
      if (turnos.length && !ctx.autorizar("pauta:write"))
        throw prohibido("Liberar turnos de la pauta requiere el permiso de editar la pauta.");
      return { turnos, puestos };
    };
    if (dryRun) return { ausenciaId, turnosLiberados: (await cargar(ctx.db)).turnos.length };
    return ctx.transaccion(async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`pauta:${ctx.tenantId}:${personaId}`}, 0))::text`;
      // Mismo orden que la pauta (persona → puestos → registro) para no cruzarse con `pauta.excepciones.anular`.
      const deTurnos = await tx.excepcionPauta.findMany({
        where: { ausenciaId },
        select: { puestoId: true },
        distinct: ["puestoId"],
      });
      for (const p of deTurnos.map((t) => t.puestoId).sort())
        await tx.$queryRaw`SELECT id FROM core.puestos WHERE id = ${p}::uuid AND tenant_id = ${ctx.tenantId}::uuid FOR UPDATE`;
      await tx.$queryRaw`SELECT id FROM core.ausencias WHERE id = ${ausenciaId}::uuid AND tenant_id = ${ctx.tenantId}::uuid FOR UPDATE`;
      const { turnos, puestos } = await cargar(tx);
      const usuario = ctx.usuario?.id ?? null;
      const ahora = new Date();
      if (turnos.length)
        await tx.excepcionPauta.updateMany({
          where: { id: { in: turnos.map((t) => t.id) }, estado: "activa" },
          data: { estado: "anulada", anuladaEn: ahora, anuladaPor: usuario },
        });
      for (const p of puestos) {
        const fechas = turnos
          .filter((t) => t.puestoId === p.id)
          .map((t) => fechaIso(t.fecha))
          .sort();
        const rango = { desde: fechas[0]!, hasta: fechas[fechas.length - 1]! };
        await anotar(tx, ctx, {
          instalacionId: p.instalacionId,
          puestoId: p.id,
          accion: "excepcion_anulada",
          ...rango,
          detalle: { dias: fechas.length, origen: "ficha" },
        });
        await ctx.eventos.emitir(tx, {
          tipo: "pauta.excepcion.anulada",
          entidadTipo: "puesto",
          entidadId: p.id,
          payload: { puestoId: p.id, ...rango },
        });
      }
      await tx.ausencia.update({
        where: { id: ausenciaId },
        data: { estado: "anulada", anuladaPor: usuario, anuladaEn: ahora },
      });
      return { ausenciaId, turnosLiberados: turnos.length };
    });
  },
});

export const capacidadesAusencias = [
  personasAusenciasRegistrar,
  personasAusenciasListar,
  personasAusenciasAnular,
  ausenciasClases,
];
