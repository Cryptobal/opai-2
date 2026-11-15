import { executeCapability } from "@opai/capabilities";
import { after } from "next/server";
import { z } from "zod";

import { asegurarRegistro } from "@/lib/registro";

import { autorizarAgente } from "./autorizar";
import { sseCorrida } from "./sse-corrida";

const solicitud = z.discriminatedUnion("accion", [
  z.object({
    accion: z.literal("preparar"),
    entrada: z.unknown(),
    idempotencyKey: z.string().uuid(),
  }),
  z.object({
    accion: z.literal("confirmar"),
    entrada: z.unknown(),
    idempotencyKey: z.string().uuid(),
  }),
]);

export const maxDuration = 300;

/** Sesión y portal ERP fijado en servidor. SSE de eventos; la corrida sigue si el cliente se corta. */
export async function POST(req: Request) {
  const ctx = await autorizarAgente(req);
  if (ctx instanceof Response) return ctx;
  let cuerpo: unknown;
  try {
    const texto = await req.text();
    if (texto.length > 600_000)
      return Response.json({ error: "Solicitud inválida." }, { status: 400 });
    cuerpo = JSON.parse(texto);
  } catch {
    return Response.json({ error: "Solicitud inválida." }, { status: 400 });
  }
  const datos = solicitud.safeParse(cuerpo);
  if (!datos.success) return Response.json({ error: "Solicitud inválida." }, { status: 400 });
  asegurarRegistro();
  const { accion, entrada, idempotencyKey } = datos.data;
  const corrida =
    accion === "preparar"
      ? executeCapability({ ...ctx, portal: "erp" }, "agente.turno.preparar", entrada, {
          idempotencyKey,
        })
      : executeCapability({ ...ctx, portal: "erp" }, "agente.plan.confirmar", entrada, {
          idempotencyKey,
        });
  // Si el cliente se desconecta a mitad del SSE, la corrida igual termina (idempotencia + historial).
  after(() => corrida.then(() => undefined).catch(() => undefined));
  return sseCorrida(corrida);
}
