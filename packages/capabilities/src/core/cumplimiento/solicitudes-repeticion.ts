import { z } from "zod";

import { noEncontrado } from "../../errores";
import type { Contexto } from "../../types";
import { uuidSchema } from "../esquemas";
import { dondeSolicitud, enContextoArco } from "./solicitudes-alcance";

/** La clave idempotente conserva el efecto, no el permiso para volver a revelar la respuesta. */
export async function autorizarSolicitudRepetida(ctx: Contexto, id: string): Promise<void> {
  await enContextoArco(ctx, async (ctx) => {
    const fila = await ctx.db.solicitudArco.findFirst({
      where: { id, ...(await dondeSolicitud(ctx)) },
      select: { id: true },
    });
    if (!fila) throw noEncontrado("La solicitud");
  });
}

const referencia = z.object({ id: uuidSchema });
export async function autorizarRespuestaSolicitud(
  ctx: Contexto,
  _input: unknown,
  salida: unknown,
): Promise<void> {
  const resultado = referencia.safeParse(salida);
  if (!resultado.success) throw noEncontrado("La solicitud");
  await autorizarSolicitudRepetida(ctx, resultado.data.id);
}
