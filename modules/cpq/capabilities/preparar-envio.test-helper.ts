import { executeCapability } from "@opai/capabilities";
import type { contextoDePrueba } from "@opai/capabilities/testing";

/** Deja la versión en lista (margen ok) o aprobada antes de enviar (CAR-141). */
export async function prepararEnvio(
  ctx: ReturnType<typeof contextoDePrueba>["ctx"],
  id: string,
) {
  const calc = await executeCapability(ctx, "cpq.cotizaciones.calcular", { id });
  if (!calc.ok) throw new Error("calc");
  const data = calc.data as { requiereAprobacion?: boolean };
  if (data.requiereAprobacion) {
    await executeCapability(ctx, "cpq.cotizaciones.solicitar_aprobacion", { id });
    await executeCapability(ctx, "cpq.cotizaciones.aprobar", { id });
  } else {
    await executeCapability(ctx, "cpq.cotizaciones.marcar_lista", { id });
  }
}
