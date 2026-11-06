import { randomBytes } from "node:crypto";
import { z } from "zod";

import { ajuste, defineConsumidor, enviarCorreo, type Contexto } from "@opai/capabilities";

import { codigoVerificacion, type SnapshotMarca } from "../domain";
import { hashDeToken } from "./correcciones-enlace";
import { ETIQUETA_METODO, ETIQUETA_TIPO, fechaHora, nombreCompleto, tenantBasico } from "./formato";

const payloadMarca = z.object({ marcaId: z.string().uuid(), personaId: z.string().uuid() });
const payloadCorreccion = z.object({ correccionId: z.string().uuid(), personaId: z.string().uuid() });

const destino = (ctx: Contexto, eventoId: string | null) => ({
  db: ctx.db, tenantId: ctx.tenantId, correo: ctx.servicios.correo, urlBase: ctx.servicios.urlBase, eventoId,
});

/** Alerta (idempotente por clave) de que el trabajador no tiene correo personal: aviso al empleador. */
export async function alertarSinCorreo(ctx: Contexto, personaId: string, nombre: string, dia: string) {
  await ctx.transaccion(async (tx) => {
    const r = await tx.alerta.createMany({
      data: [{ tenantId: ctx.tenantId, tipo: "sin_correo_personal", clave: `${personaId}:${dia}`, personaId, datos: { nombre } }],
      skipDuplicates: true,
    });
    if (r.count === 0) return;
    await ctx.eventos.emitir(tx, {
      tipo: "asistencia.alerta.sin_correo_personal", entidadTipo: "persona", entidadId: personaId,
      payload: { trabajador: { nombre }, url: `${ctx.servicios.urlBase}/personas/${personaId}` },
    });
  });
}

/**
 * Comprobante inmediato de cada marca al correo PERSONAL del trabajador (ORD 770/2025, L-04): nunca a uno
 * corporativo. Sin correo personal no hay comprobante: se alerta al empleador. Idempotente: el despacho
 * reintenta, y una marca ya comprobada no se manda dos veces (registro en `core.envios` por evento).
 */
export const consumidorComprobante = defineConsumidor({
  id: "asistencia.comprobante",
  descripcion: "Envía el comprobante de cada marca al correo personal del trabajador.",
  eventos: ["asistencia.marca.registrada"],
  async handler(ctx, evento) {
    const p = payloadMarca.safeParse(evento.payload);
    if (!p.success) return;
    const [marca, persona, t] = await Promise.all([
      ctx.db.marca.findUnique({ where: { id: p.data.marcaId } }),
      ctx.db.persona.findUnique({ where: { id: p.data.personaId }, select: { nombres: true, apellidos: true, emailPersonal: true } }),
      tenantBasico(ctx),
    ]);
    if (!marca || !persona) return;
    const correo = persona.emailPersonal?.trim();
    if (!correo) return alertarSinCorreo(ctx, p.data.personaId, nombreCompleto(persona), marca.horaServidor.toISOString().slice(0, 10));
    const ya = await ctx.db.envio.count({ where: { eventoId: evento.id, plantillaEvento: "asistencia.marca.comprobante", estado: "enviado" } });
    if (ya > 0) return;
    const s = marca.snapshot as unknown as SnapshotMarca;
    // Con empresa usuaria (EST o subcontrato) el comprobante se copia al correo del EST, si la empresa lo configuró.
    const est = s.mandanteRazonSocial ? (await ajuste<string>(ctx, "asistencia", "correo_copia_est")).trim() : "";
    const enviado = await enviarCorreo(destino(ctx, evento.id), "asistencia.marca.comprobante", correo, {
      trabajador: { nombre: nombreCompleto(persona) },
      marca: {
        tipo: ETIQUETA_TIPO[marca.tipo] ?? marca.tipo,
        fecha_hora: fechaHora(marca.horaServidor, t.zona),
        metodo: ETIQUETA_METODO[marca.metodo] ?? marca.metodo,
        lugar: s.establecimiento ?? "—",
        hash: marca.hash,
        codigo: await codigoVerificacion(marca.hash),
        resolucion: s.resolucionJornada ? `Res. ${s.resolucionJornada.numero} del ${s.resolucionJornada.fecha}` : "No aplica",
        empresa_usuaria: s.mandanteRazonSocial ? `${s.mandanteRazonSocial}${s.mandanteRut ? ` · ${s.mandanteRut}` : ""}` : "No aplica",
      },
      empresa: { nombre: t.nombre },
      url: `${ctx.servicios.urlBase}/verificar/marca/${t.slug}/${marca.hash}`,
    }, est ? { cc: [est] } : undefined);
    if (!enviado) throw new Error("No se pudo enviar el comprobante; se reintenta.");
  },
});

/** Avisa al trabajador de una corrección por responder, con su enlace personal (solo se guarda el hash). */
export const consumidorAvisoCorreccion = defineConsumidor({
  id: "asistencia.correccion.aviso",
  descripcion: "Avisa al trabajador, en su correo personal, que se propuso corregir una de sus marcas.",
  eventos: ["asistencia.correccion.propuesta"],
  async handler(ctx, evento) {
    const p = payloadCorreccion.safeParse(evento.payload);
    if (!p.success) return;
    const [c, persona, t] = await Promise.all([
      ctx.db.correccion.findUnique({ where: { id: p.data.correccionId } }),
      ctx.db.persona.findUnique({ where: { id: p.data.personaId }, select: { nombres: true, apellidos: true, emailPersonal: true } }),
      tenantBasico(ctx),
    ]);
    if (!c || !persona) return;
    const correo = persona.emailPersonal?.trim();
    if (!correo) return alertarSinCorreo(ctx, p.data.personaId, nombreCompleto(persona), c.horaServidor.toISOString().slice(0, 10));
    if ((await ctx.db.correccionEnlace.count({ where: { correccionId: c.id } })) > 0) return; // ya avisado
    const marca = await ctx.db.marca.findUniqueOrThrow({ where: { id: c.marcaId } });
    const token = randomBytes(32).toString("base64url");
    const vence = c.venceEn ?? new Date(c.horaServidor.getTime() + c.plazoHoras * 3_600_000);
    const enlace = await ctx.db.correccionEnlace.create({
      data: { tenantId: ctx.tenantId, correccionId: c.id, tokenHash: hashDeToken(token), venceEn: vence },
    });
    const etiqueta = (tipo: string, hora: Date) => `${ETIQUETA_TIPO[tipo] ?? tipo} · ${fechaHora(hora, t.zona)}`;
    const enviado = await enviarCorreo(destino(ctx, evento.id), "asistencia.correccion.propuesta", correo, {
      trabajador: { nombre: nombreCompleto(persona) },
      correccion: {
        original: etiqueta(marca.tipo, marca.horaServidor), propuesta: etiqueta(c.tipoPropuesto, c.horaPropuesta),
        motivo: c.motivo, vence: fechaHora(vence, t.zona),
      },
      empresa: { nombre: t.nombre },
      url: `${ctx.servicios.urlBase}/correccion/${t.slug}/${token}`,
    });
    if (!enviado) {
      await ctx.db.correccionEnlace.delete({ where: { id: enlace.id } });
      throw new Error("No se pudo avisar de la corrección; se reintenta.");
    }
  },
});
