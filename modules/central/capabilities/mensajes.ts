import { z } from "zod";

import { ajuste, defineCapability, noEncontrado, reglaDeNegocio } from "@opai/capabilities";

import { SEVERIDAD_URGENCIA, TEXTO_MENSAJE_MAX, TIPOS_MENSAJE, estadoTrasMensaje, textoValido } from "../domain/mensajes";
import { PERMISO_ATENDER, uuidSchema } from "./esquemas";
import {
  abrirAlertaSistema,
  dondeHilos,
  esTrabajador,
  instalacionDePersona,
  personaPropia,
  PORTALES_TERRENO,
  registrarEnBitacora,
  TRABAJO_CONSULTA,
} from "./mensajes-util";
import { ID_VISTA_PREVIA, exigirPersona } from "./util";

const texto = z.string().max(TEXTO_MENSAJE_MAX);

/** El guardia abre un hilo «Mensaje a la central» con un tipo (R16). No es chat (ADR-025). */
export const mensajesEnviar = defineCapability({
  id: "central.mensajes.enviar",
  descripcion:
    "El guardia manda un mensaje a la central desde su portal: novedad, consulta o urgencia. Queda ligado a su instalación; una urgencia abre una alerta crítica al tiro y una consulta sin respuesta entra a la cola.",
  permiso: null,
  portales: ["trabajador"],
  input: z.object({ tipo: z.enum(TIPOS_MENSAJE), texto: texto.default("") }),
  output: z.object({ id: uuidSchema, alertaId: uuidSchema.nullable() }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, i, { dryRun }) {
    if (!esTrabajador(ctx)) throw reglaDeNegocio("El mensaje a la central se manda desde el portal del trabajador.");
    if (!textoValido(i.tipo, i.texto)) throw reglaDeNegocio("Escribe el mensaje (hasta 1.000 caracteres).");
    const persona = await personaPropia(ctx);
    const instalacionId = await instalacionDePersona(ctx, persona.id);
    if (dryRun) return { id: ID_VISTA_PREVIA, alertaId: null };
    const plazo = i.tipo === "consulta" ? await ajuste<number>(ctx, "central", "plazo_consulta_min", ctx.db) : null;
    const vence = plazo ? new Date(Date.now() + plazo * 60_000) : null;
    return ctx.transaccion(async (tx) => {
      const alertaId =
        i.tipo === "urgencia"
          ? await abrirAlertaSistema(ctx, tx, {
              instalacionId,
              personaId: persona.id,
              titulo: "Urgencia desde terreno",
              descripcion: i.texto.trim(),
              severidad: SEVERIDAD_URGENCIA,
              origen: "central.mensaje.urgencia",
            })
          : null;
      const h = await tx.centralHilo.create({
        data: { tenantId: ctx.tenantId, instalacionId, personaId: persona.id, tipo: i.tipo, alertaId, consultaVenceEn: vence },
      });
      if (i.texto.trim())
        await tx.centralHiloMensaje.create({
          data: { tenantId: ctx.tenantId, hiloId: h.id, autorTipo: "persona", autorId: ctx.usuario?.id ?? null, texto: i.texto.trim() },
        });
      if (vence)
        await ctx.trabajos.encolar(tx, { tipo: TRABAJO_CONSULTA, payload: { hiloId: h.id }, programadoPara: vence, claveUnica: `consulta:${h.id}` });
      await registrarEnBitacora(ctx, tx, "central.mensaje.enviado", "central.hilo", h.id);
      await ctx.eventos.emitir(tx, { tipo: "central.mensaje.recibido", entidadTipo: "central.hilo", entidadId: h.id, payload: { tipo: i.tipo, instalacionId } });
      return { id: h.id, alertaId };
    });
  },
});

/** Responde en el mismo hilo: el guardia agrega mientras está abierto; la central responde (R16). */
export const mensajesResponder = defineCapability({
  id: "central.mensajes.responder",
  descripcion:
    "Agrega un mensaje a un hilo abierto de la central: la central responde al guardia, o el guardia agrega información a su propio hilo. Un hilo cerrado no acepta mensajes.",
  permiso: null,
  portales: PORTALES_TERRENO,
  input: z.object({ id: uuidSchema, texto: texto.trim().min(1) }),
  output: z.object({ id: uuidSchema }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, i, { dryRun }) {
    const trabajador = esTrabajador(ctx);
    if (!trabajador) {
      if (!ctx.autorizar(PERMISO_ATENDER)) throw reglaDeNegocio("Responder exige el permiso central:alertas.atender.");
      exigirPersona(ctx, "responder un hilo");
    }
    const h = await ctx.db.centralHilo.findFirst({ where: { id: i.id, ...(await dondeHilos(ctx)) } });
    if (!h) throw noEncontrado("El hilo");
    const autor = trabajador ? "persona" : "central";
    const estado = estadoTrasMensaje(h.estado as "enviado", autor);
    if (!estado) throw reglaDeNegocio("El hilo está cerrado.");
    if (dryRun) return { id: ID_VISTA_PREVIA };
    return ctx.transaccion(async (tx) => {
      const n = await tx.centralHilo.updateMany({ where: { id: h.id, estado: { not: "cerrado" } }, data: { estado } });
      if (n.count === 0) throw reglaDeNegocio("El hilo está cerrado.");
      const m = await tx.centralHiloMensaje.create({
        data: { tenantId: ctx.tenantId, hiloId: h.id, autorTipo: autor, autorId: ctx.usuario?.id ?? null, texto: i.texto },
      });
      await registrarEnBitacora(ctx, tx, "central.mensaje.respuesta", "central.hilo", h.id);
      if (autor === "central")
        await ctx.eventos.emitir(tx, { tipo: "central.mensaje.respondido", entidadTipo: "central.hilo", entidadId: h.id, payload: {} });
      return { id: m.id };
    });
  },
});

/** La central cierra el hilo al resolverlo; el guardia ve el cierre (R16). */
export const mensajesCerrar = defineCapability({
  id: "central.mensajes.cerrar",
  descripcion: "Cierra un hilo de mensajes de terreno cuando la central lo resolvió; el guardia ve el cierre y ya no puede agregar mensajes.",
  permiso: PERMISO_ATENDER,
  portales: ["erp", "supervisor"],
  input: z.object({ id: uuidSchema }),
  output: z.object({ id: uuidSchema }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, i, { dryRun }) {
    exigirPersona(ctx, "cerrar un hilo");
    const h = await ctx.db.centralHilo.findFirst({ where: { id: i.id, ...(await dondeHilos(ctx)) } });
    if (!h) throw noEncontrado("El hilo");
    if (h.estado === "cerrado") throw reglaDeNegocio("El hilo ya está cerrado.");
    if (dryRun) return { id: h.id };
    return ctx.transaccion(async (tx) => {
      const n = await tx.centralHilo.updateMany({
        where: { id: h.id, estado: { not: "cerrado" } },
        data: { estado: "cerrado", cerradoEn: new Date(), cerradoPorId: ctx.usuario?.id ?? null },
      });
      if (n.count === 0) throw reglaDeNegocio("El hilo ya está cerrado.");
      await registrarEnBitacora(ctx, tx, "central.mensaje.cerrado", "central.hilo", h.id);
      return { id: h.id };
    });
  },
});
