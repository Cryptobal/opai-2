import {
  comoAgenteInterno,
  iaElegidaDelAgente,
  prohibido,
  type Contexto,
} from "@opai/capabilities";
import { z } from "zod";

import { prepararTurno, revalidarAccesoDelTurno } from "./bucle";
import { lineaContexto, revalidarContexto } from "./conversaciones-contexto";
import type { contextoSchema } from "./conversaciones-guardado";
import { conErroresIa } from "./errores-ia";

type Entrada = {
  mensaje: string;
  modelo: Parameters<typeof iaElegidaDelAgente>[1];
  contexto?: z.infer<typeof contextoSchema> | undefined;
};

/** Fuera de la transacción de guardado; las herramientas conservan sus propias transacciones. */
export async function prepararSolicitud(ctx: Contexto, input: Entrada) {
  if (!ctx.revalidarAccesoEnTransaccion)
    throw prohibido("No se puede revalidar el acceso al guardar el turno.");
  await revalidarAccesoDelTurno(ctx);
  const delegado = comoAgenteInterno(ctx);
  if (input.contexto) await revalidarContexto(delegado, input.contexto);
  const consulta = input.contexto
    ? `${lineaContexto(input.contexto)}\n${input.mensaje}`
    : input.mensaje;
  return conErroresIa(async () => {
    const ia = await iaElegidaDelAgente(delegado, input.modelo);
    return prepararTurno(delegado, consulta, ia);
  });
}

/** La caché no autoriza revelar una respuesta producida bajo otro acceso. */
export async function autorizarRepeticionTurno(ctx: Contexto, input: Entrada, salida: unknown) {
  const acceso = await revalidarAccesoDelTurno(ctx);
  const previa = z.object({ accesoSolicitud: z.string() }).safeParse(salida);
  if (!previa.success || previa.data.accesoSolicitud !== acceso)
    throw prohibido("El acceso cambió. Inicia una nueva solicitud.");
  const delegado = comoAgenteInterno(ctx);
  if (input.contexto) await revalidarContexto(delegado, input.contexto);
}
