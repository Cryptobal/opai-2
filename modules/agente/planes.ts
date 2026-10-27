import { createHash, createHmac, timingSafeEqual } from "node:crypto";

import { conflicto, prohibido, type Contexto } from "@opai/capabilities";
import { z } from "zod";

import { ejecutarPaso, type Plan } from "./bucle";
import { herramientasDelAgente } from "./herramientas";

const pasoSchema = z.object({
  capacidad: z.string(),
  argumentos: z.unknown(),
  clave: z.string().uuid(),
  vistaPrevia: z.object({ ok: z.literal(true), data: z.unknown(), dryRun: z.boolean() }),
});
const sobreSchema = z.object({
  id: z.string().uuid(),
  tenant: z.string(),
  usuario: z.string(),
  portal: z.string(),
  acceso: z.string(),
  vence: z.number(),
  siguiente: z.number().int().nonnegative(),
  nivel: z.enum(["aprobar_todo", "paso_a_paso"]),
  pasos: z.array(pasoSchema).max(12),
});
type Sobre = z.infer<typeof sobreSchema>;
export type Nivel = Sobre["nivel"];
export const VIGENCIA_PLAN_MS = 3_600_000;

const acceso = (ctx: Contexto) =>
  createHash("sha256")
    .update(
      JSON.stringify({
        alcance: ctx.alcance,
        capacidades: herramientasDelAgente(ctx)
          .map((h) => h.capacidad.id)
          .sort(),
      }),
    )
    .digest("hex");
const mac = (texto: string, secreto: string) =>
  createHmac("sha256", secreto).update(texto).digest();
function sellar(sobre: Sobre, secreto: string) {
  if (secreto.length < 32) throw new Error("No está disponible la firma del plan.");
  const texto = Buffer.from(JSON.stringify(sobre)).toString("base64url");
  return `${texto}.${mac(texto, secreto).toString("base64url")}`;
}

export function firmarPlan(ctx: Contexto, plan: Plan, nivel: Nivel, secreto: string): string {
  return sellar(
    {
      id: plan.id,
      tenant: ctx.tenantId,
      usuario: ctx.usuario!.id,
      portal: ctx.portal!,
      acceso: acceso(ctx),
      vence: Date.now() + VIGENCIA_PLAN_MS,
      siguiente: 0,
      nivel,
      pasos: pasoSchema.array().parse(plan.pasos),
    },
    secreto,
  );
}

function abrir(ctx: Contexto, token: string, secreto: string): Sobre {
  try {
    const [texto, firma, extra] = token.split(".");
    if (!texto || !firma || extra || token.length > 500_000 || secreto.length < 32)
      throw new Error();
    const enviada = Buffer.from(firma, "base64url");
    const esperada = mac(texto, secreto);
    if (enviada.length !== esperada.length || !timingSafeEqual(enviada, esperada))
      throw new Error();
    const s = sobreSchema.parse(JSON.parse(Buffer.from(texto, "base64url").toString("utf8")));
    if (
      s.tenant !== ctx.tenantId ||
      s.usuario !== ctx.usuario?.id ||
      s.portal !== ctx.portal ||
      s.acceso !== acceso(ctx) ||
      s.vence <= Date.now() ||
      !ctx.modulosActivos.includes("agente") ||
      !ctx.autorizar("agente:usar")
    )
      throw new Error();
    return s;
  } catch {
    throw prohibido("Plan no disponible; solicita una nueva vista previa.");
  }
}

/** La decisión viene de la sesión humana, nunca de una herramienta ni del modelo. */
export async function confirmarPlan(
  humano: Contexto,
  delegado: Contexto,
  token: string,
  aceptar: boolean,
  secreto: string,
  dryRun = false,
) {
  if (
    humano.actor.tipo !== "user" ||
    delegado.actor.tipo !== "agent" ||
    !delegado.actor.interno ||
    humano.actor.id !== delegado.actor.viaUserId ||
    humano.tenantId !== delegado.tenantId
  ) {
    throw prohibido("La confirmación debe hacerla una persona.");
  }
  const s = abrir(delegado, token, secreto);
  if (dryRun) return { estado: "prevista", resultados: [], siguiente: null };
  const clave = `plan:${s.id}:${s.siguiente}`;
  // Reserva única por tenant/usuario/plan/paso: aceptar y rechazar compiten por la MISMA clave.
  const reserva = await humano.idempotencia.reservar(
    "agente.plan.confirmar",
    clave,
    { aceptar },
    { sinRecuperacionAutomatica: true },
  );
  if (reserva.estado === "hecha") return reserva.resultado;
  if (reserva.estado !== "nueva")
    throw conflicto("El plan ya se está resolviendo o fue rechazado.");
  const resultados: { paso: number; ok: boolean; code?: string; aprobacionId?: string }[] = [];
  let estado = aceptar ? "completo" : "rechazado";
  let siguiente: string | null = null;
  if (aceptar) {
    const fin =
      s.nivel === "aprobar_todo" ? s.pasos.length : Math.min(s.siguiente + 1, s.pasos.length);
    for (let i = s.siguiente; i < fin; i++) {
      const r = await ejecutarPaso(delegado, s.pasos[i]!);
      resultados.push(
        r.ok
          ? { paso: i, ok: true }
          : {
              paso: i,
              ok: false,
              code: r.error.code,
              ...(r.error.aprobacionId ? { aprobacionId: r.error.aprobacionId } : {}),
            },
      );
      if (!r.ok) {
        estado = r.error.code === "APPROVAL_REQUIRED" ? "aprobacion" : "fallido";
        break;
      }
    }
    if (estado === "completo" && fin < s.pasos.length) {
      estado = "pendiente";
      siguiente = sellar({ ...s, siguiente: fin }, secreto);
    }
  }
  const resultado = { estado, resultados, siguiente };
  // Si hay un corte después del efecto, se conserva en_curso: nunca se libera para repetirlo.
  await humano.idempotencia.completar(reserva.id, resultado);
  return resultado;
}
