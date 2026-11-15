import { randomUUID } from "node:crypto";

import { executeCapability, prohibido, type Contexto, type Resultado } from "@opai/capabilities";
import type { Mensaje, RespuestaConversacion } from "@opai/integrations";

import { compactarDatoAgente } from "./compactar-dato";
import { CARGAR, LISTAR, resolverLlamada } from "./herramientas-demanda";
import { type Plan } from "./plan";
import { extraerReferencias, type Referencia } from "./referencias";

const MAX_PASOS = 12;

/** Ejecuta las llamadas del modelo (lecturas y dryRun) y las agrega al historial del turno. */
export async function aplicarLlamadas(
  ctx: Contexto,
  r: RespuestaConversacion,
  mensajes: Mensaje[],
  plan: Plan,
  refs: Map<string, Referencia>,
  cargadas: Set<string>,
  llamadas: { n: number },
  revalidar: (ctx: Contexto) => Promise<string>,
): Promise<void> {
  for (const llamada of r.llamadas) {
    await revalidar(ctx);
    // Cargar o listar esquemas no ejecuta nada: no gasta el límite de pasos del turno.
    if (llamada.nombre !== CARGAR && llamada.nombre !== LISTAR && ++llamadas.n > MAX_PASOS)
      throw prohibido("Se alcanzó el límite de pasos del turno.");
    const paso = resolverLlamada(ctx, cargadas, llamada.nombre, llamada.argumentos);
    let resultado: Resultado;
    if ("h" in paso) {
      const escritura = paso.h.capacidad.efecto !== "lectura";
      resultado = await executeCapability(ctx, paso.h.capacidad.id, paso.argumentos, {
        dryRun: escritura,
      });
      if (escritura && resultado.ok) {
        plan.pasos.push({
          capacidad: paso.h.capacidad.id,
          argumentos: paso.argumentos,
          clave: randomUUID(),
          vistaPrevia: resultado,
        });
      }
    } else resultado = paso;
    if (resultado.ok) extraerReferencias(resultado.data, refs);
    const dato =
      resultado.ok ? { ...resultado, data: compactarDatoAgente(resultado.data) } : resultado;
    mensajes.push({
      rol: "herramienta",
      id: llamada.id,
      nombre: llamada.nombre,
      resultado: JSON.stringify({ externo: true, dato }).slice(0, 24_000),
    });
  }
}
