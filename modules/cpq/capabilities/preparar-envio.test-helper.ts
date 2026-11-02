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

  async function dejarListaPorAprobacion() {
    const sol = await executeCapability(ctx, "cpq.cotizaciones.solicitar_aprobacion", { id });
    if (!sol.ok) throw new Error(`solicitar_aprobacion: ${JSON.stringify(sol.error)}`);
    const apr = await executeCapability(ctx, "cpq.cotizaciones.aprobar", { id });
    if (!apr.ok) throw new Error(`aprobar: ${JSON.stringify(apr.error)}`);
  }

  if (data.requiereAprobacion) {
    await dejarListaPorAprobacion();
    return;
  }
  const lista = await executeCapability(ctx, "cpq.cotizaciones.marcar_lista", { id });
  if (!lista.ok) {
    const msg = lista.error && "message" in lista.error ? String(lista.error.message) : "";
    if (lista.error?.code === "UNPROCESSABLE" && msg.includes("aprobación")) {
      await dejarListaPorAprobacion();
      return;
    }
    throw new Error(`marcar_lista: ${JSON.stringify(lista.error)}`);
  }
}
