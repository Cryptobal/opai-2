import { z } from "zod";

import { defineCapability, prohibido, reglaDeNegocio } from "@opai/capabilities";

import { estadoEfectivo, type Severidad, transicion } from "../domain";
import { CANALES, siguientePaso } from "../domain/cadena";
import { PERMISO_ATENDER, uuidSchema } from "./esquemas";
import { bloquearAlerta, cadenaDe, contactarPaso, TRABAJO_REVISAR } from "./motor";
import { alertaVisible, exigirPersona, registrarHecho } from "./util";

const salida = z.object({ id: uuidSchema, estado: z.string() });

export const alertasHacerseCargo = defineCapability({
  id: "central.alertas.hacerse_cargo",
  descripcion:
    "Quien atiende responde «me hago cargo»: la cadena se detiene y la alerta queda en atención a su nombre, con un plazo para resolverla; si vence, la cadena sigue.",
  permiso: PERMISO_ATENDER,
  soloPersonas: true, // R8 y R13: quien se hace cargo es una persona, nunca el agente.
  input: z.object({ id: uuidSchema }),
  output: salida.extend({ venceEn: z.date() }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, i, { dryRun }) {
    if (!ctx.usuario) throw prohibido("Se necesita una persona para hacerse cargo.");
    const a = await alertaVisible(ctx, i.id);
    const desde = estadoEfectivo(a, new Date());
    if (!transicion(desde, "hacerse_cargo")) throw reglaDeNegocio(`No te puedes hacer cargo de una alerta «${desde}».`);
    return ctx.transaccion(async (tx) => {
      const { plazoMin } = await cadenaDe(tx, a);
      const venceEn = new Date(Date.now() + plazoMin * 60_000);
      if (dryRun) return { id: a.id, estado: "en_atencion", venceEn };
      const { count } = await tx.centralAlerta.updateMany({
        where: { id: a.id, updatedAt: a.updatedAt },
        data: { estado: "en_atencion", atencionPorId: ctx.usuario!.id, atencionVenceEn: venceEn, pasoVenceEn: null, estadoPrevio: null, pospuestaHasta: null },
      });
      if (count !== 1) throw reglaDeNegocio("La alerta cambió mientras la atendías: vuelve a abrirla.");
      await registrarHecho(ctx, tx, { alertaId: a.id, tipo: "en_atencion", estadoDesde: desde, estadoHacia: "en_atencion" });
      await ctx.trabajos.encolar(tx, { tipo: TRABAJO_REVISAR, payload: { alertaId: a.id }, programadoPara: venceEn, claveUnica: `${a.id}:${venceEn.toISOString()}` });
      return { id: a.id, estado: "en_atencion", venceEn };
    });
  },
});

export const alertasContactar = defineCapability({
  id: "central.alertas.contactar",
  descripcion:
    "Registra un contacto hecho a mano dentro de una alerta (por ejemplo, una llamada): a quién, por qué canal y qué pasó. Queda en la bitácora y no se puede editar.",
  permiso: PERMISO_ATENDER,
  input: z.object({
    id: uuidSchema,
    canal: z.enum(CANALES),
    destinatarioId: uuidSchema.optional().describe("Usuario contactado, si es miembro de la empresa."),
    resultado: z.enum(["contesto", "no_contesto", "rechazo"]),
    nota: z.string().trim().min(1).max(1000).optional(),
  }),
  output: z.object({ id: uuidSchema }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, i, { dryRun }) {
    const a = await alertaVisible(ctx, i.id);
    if (["resuelta", "falsa_alarma"].includes(a.estado)) throw reglaDeNegocio("La alerta ya está cerrada.");
    if (i.destinatarioId && !(await ctx.db.membership.findFirst({ where: { userId: i.destinatarioId, estado: "activa" }, select: { id: true } })))
      throw reglaDeNegocio("La persona contactada no es miembro de la empresa.");
    if (dryRun) return { id: a.id };
    const intento = await ctx.transaccion(async (tx) => {
      const r = await tx.centralIntento.create({
        data: { tenantId: ctx.tenantId, alertaId: a.id, paso: 0, destinatarioId: i.destinatarioId ?? null, canal: i.canal, resultado: i.resultado, nota: i.nota ?? null, registradoPorId: ctx.usuario?.id ?? null },
      });
      const estado = estadoEfectivo(a, new Date());
      await registrarHecho(ctx, tx, { alertaId: a.id, tipo: "contacto", estadoDesde: estado, estadoHacia: estado, nota: `${i.canal}: ${i.resultado}` });
      return r;
    });
    return { id: intento.id };
  },
});

export const alertasEscalar = defineCapability({
  id: "central.alertas.escalar",
  descripcion:
    "Pasa la alerta al siguiente paso de su cadena sin esperar a que venza el plazo (o al primero si aún no se contactó a nadie).",
  permiso: PERMISO_ATENDER,
  input: z.object({ id: uuidSchema }),
  output: salida,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, i, { dryRun }) {
    const visible = await alertaVisible(ctx, i.id);
    return ctx.transaccion(async (tx) => {
      const a = (await bloquearAlerta(ctx, tx, visible.id)) ?? visible;
      const estado = estadoEfectivo(a, new Date());
      if (!["nueva", "en_contacto", "escalada", "en_atencion"].includes(estado))
        throw reglaDeNegocio(`No se puede escalar una alerta «${estado}».`);
      // R8 y R13: el agente no le quita la alerta a la persona que se hizo cargo.
      if (estado === "en_atencion") exigirPersona(ctx, "escalar una alerta que una persona está atendiendo");
      const total = (await cadenaDe(tx, a)).pasos.length;
      const siguiente = a.pasoActual === 0 ? 1 : siguientePaso(a.pasoActual, total, a.severidad as Severidad);
      if (!siguiente) throw reglaDeNegocio("La alerta ya está en el último paso de su cadena.");
      if (!dryRun) await contactarPaso(ctx, tx, { ...a, estado }, siguiente);
      return { id: a.id, estado: siguiente === 1 ? "en_contacto" : "escalada" };
    });
  },
});
