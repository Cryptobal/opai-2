import { executeCapability } from "@opai/capabilities";
import { after } from "next/server";
import { z } from "zod";

import { resolverActor } from "@/lib/actor";
import { asegurarRegistro } from "@/lib/registro";
import { permitir } from "@/lib/rate-limit";

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
  if (req.headers.has("authorization") || req.headers.get("origin") !== new URL(req.url).origin) {
    return Response.json({ error: "Prohibido." }, { status: 403 });
  }
  const ctx = await resolverActor(req);
  if (ctx instanceof Response) return ctx;
  if (
    ctx.actor.tipo !== "user" ||
    !ctx.conTenant ||
    !ctx.portalesMembresia.includes("erp") ||
    !ctx.modulosActivos.includes("agente") ||
    !ctx.autorizar("agente:usar")
  ) {
    return Response.json({ error: "Prohibido." }, { status: 403 });
  }
  if (
    !(await permitir(`agente:${ctx.tenantId}:${ctx.actor.id}`, 20, 60_000, { fallarCerrado: true }))
  ) {
    return Response.json(
      { error: "Demasiadas solicitudes." },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }
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
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controlador) {
      const enviar = (evento: string, dato: unknown) => {
        try {
          controlador.enqueue(encoder.encode(`event: ${evento}\ndata: ${JSON.stringify(dato)}\n\n`));
        } catch {
          /* cliente ya no lee el stream */
        }
      };
      enviar("iniciado", {});
      try {
        enviar("resultado", await corrida);
      } catch {
        enviar("error", { mensaje: "No se pudo completar la solicitud." });
      }
      try {
        controlador.close();
      } catch {
        /* ya cerrado */
      }
    },
    cancel() {
      /* no cancela la corrida: after() y la promesa compartida la mantienen */
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
}
