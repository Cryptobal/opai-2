import { z } from "zod";

import type { Contexto } from "@opai/capabilities";
import type { TenantTx } from "@opai/db";

import {
  CADENA_POR_DEFECTO,
  CANALES,
  CANALES_ACTIVOS,
  elegirCadena,
  type Paso,
  pasosSimultaneos,
  PLAZO_ATENCION_POR_DEFECTO_MIN,
} from "../domain/cadena";
import type { EstadoAlerta, Severidad } from "../domain";
import { registrarHecho } from "./util";

export const pasoSchema = z.object({
  destinatario: z.discriminatedUnion("tipo", [
    z.object({ tipo: z.literal("guardia") }),
    z.object({ tipo: z.literal("supervisores") }),
    z.object({ tipo: z.literal("rol"), rol: z.enum(["owner", "admin", "gerente", "supervisor"]) }),
    z.object({ tipo: z.literal("usuario"), usuarioId: z.uuid() }),
  ]),
  canales: z.array(z.enum(CANALES)).min(1).max(CANALES.length),
  esperaMin: z.number().int().min(1).max(240),
  exigeConfirmacion: z.boolean(),
});

export const TRABAJO_REVISAR = "central.alertas.revisar";

type Alerta = { id: string; instalacionId: string; personaId: string | null; severidad: string; titulo: string };

/** Pasos y plazo de la cadena que rige la alerta (la más específica, o la plantilla). */
export async function cadenaDe(tx: TenantTx, a: Alerta) {
  const cadenas = await tx.centralCadena.findMany({
    where: { OR: [{ instalacionId: null }, { instalacionId: a.instalacionId }] },
  });
  const c = elegirCadena(cadenas, a.instalacionId, a.severidad as Severidad);
  const pasos = c ? z.array(pasoSchema).safeParse(c.pasos) : null;
  return {
    cadenaId: c && pasos?.success ? c.id : null,
    pasos: (c && pasos?.success ? pasos.data : CADENA_POR_DEFECTO) as readonly Paso[],
    plazoMin: c?.plazoAtencionMin ?? PLAZO_ATENCION_POR_DEFECTO_MIN,
  };
}

/** Usuarios a contactar en un paso: solo miembros activos de la empresa. */
async function destinatarios(tx: TenantTx, a: Alerta, paso: Paso): Promise<string[]> {
  const d = paso.destinatario;
  if (d.tipo === "guardia") {
    if (!a.personaId) return [];
    const p = await tx.persona.findFirst({ where: { id: a.personaId }, select: { usuarioId: true } });
    return p?.usuarioId ? [p.usuarioId] : [];
  }
  const where =
    d.tipo === "supervisores"
      ? { instalacionesACargo: { some: { instalacionId: a.instalacionId } } }
      : d.tipo === "rol"
        ? { rol: d.rol }
        : { userId: d.usuarioId };
  const m = await tx.membership.findMany({ where: { ...where, estado: "activa" }, select: { userId: true } });
  return [...new Set(m.map((x) => x.userId))];
}

/**
 * Contacta el paso `numero` (y los simultáneos de una crítica): aviso en la campana por cada
 * destinatario, un intento por canal (los apagados quedan como «apagado», R6), el hecho en la
 * bitácora y el trabajo que revisa la alerta al vencer la espera.
 */
export async function contactarPaso(ctx: Contexto, tx: TenantTx, a: Alerta & { estado: string }, numero: number) {
  const { cadenaId, pasos } = await cadenaDe(tx, a);
  const grupo = pasosSimultaneos(numero, pasos.length, a.severidad as Severidad).filter((n) => n <= pasos.length);
  let esperaMin = 0;
  for (const n of grupo) {
    const paso = pasos[n - 1] as Paso;
    esperaMin = Math.max(esperaMin, paso.esperaMin);
    for (const usuarioId of await destinatarios(tx, a, paso)) {
      for (const canal of paso.canales) {
        const activo = CANALES_ACTIVOS.includes(canal);
        if (activo && canal === "campana")
          await tx.notificacion.create({
            data: { tenantId: ctx.tenantId, usuarioId, titulo: `Alerta: ${a.titulo}`, enlace: `/central/alertas/${a.id}` },
          });
        await tx.centralIntento.create({
          data: { tenantId: ctx.tenantId, alertaId: a.id, paso: n, destinatarioId: usuarioId, canal, resultado: activo ? "avisado" : "apagado" },
        });
      }
    }
  }
  const ultimo = Math.max(...grupo);
  const venceEn = new Date(Date.now() + esperaMin * 60_000);
  const hacia: EstadoAlerta = numero === 1 ? "en_contacto" : "escalada";
  await tx.centralAlerta.update({
    where: { id: a.id },
    data: { cadenaId, pasoActual: ultimo, pasoVenceEn: venceEn, estado: hacia, atencionPorId: null, atencionVenceEn: null, estadoPrevio: null, pospuestaHasta: null },
  });
  await registrarHecho(ctx, tx, {
    alertaId: a.id,
    tipo: numero === 1 ? "contactada" : "escalada",
    estadoDesde: a.estado as EstadoAlerta,
    estadoHacia: hacia,
    nota: `Paso ${grupo.join(" y ")} de ${pasos.length}`,
    sistema: !ctx.usuario,
  });
  await ctx.trabajos.encolar(tx, { tipo: TRABAJO_REVISAR, payload: { alertaId: a.id }, programadoPara: venceEn, claveUnica: `${a.id}:${venceEn.toISOString()}` });
  if (numero > 1)
    await ctx.eventos.emitir(tx, { tipo: "central.alerta.escalada", entidadTipo: "central.alerta", entidadId: a.id, payload: { paso: ultimo } });
}
