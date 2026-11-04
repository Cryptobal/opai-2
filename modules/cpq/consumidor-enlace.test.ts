import { describe, expect, it } from "vitest";

import { contextoDePrueba } from "@opai/capabilities/testing";
import type { EventoPublicado } from "@opai/capabilities";

import { consumidorCpqEnlace } from "./consumidor-enlace";

const evento = (modulo: string, clave: string) =>
  ({ id: "ev1", tipo: "core.config.cambiada", payload: { modulo, clave } }) as unknown as EventoPublicado;

async function escenario(encendido: boolean) {
  const { ctx, tabla } = contextoDePrueba({ modulosActivos: ["cpq"] });
  await ctx.db.ajuste.create({
    data: { tenantId: ctx.tenantId, ambito: "tenant", sujetoId: ctx.tenantId, modulo: "cpq", clave: "enlace_publico", valor: encendido, version: 1 },
  });
  for (const id of ["e1", "e2"])
    await ctx.db.cpqEnlaceCompartido.create({
      data: { id, tenantId: ctx.tenantId, cotizacionId: "c", versionId: "v", tokenHash: id, venceEn: new Date(Date.now() + 1e7), creadoPorId: "u", revocadoEn: null },
    });
  return { ctx, revocados: () => tabla("cpqEnlaceCompartido").filter((f) => f["revocadoEn"] != null).length };
}

describe("consumidor cpq.enlace_publico (CAR-162)", () => {
  it("al apagar el ajuste revoca los enlaces activos de la empresa", async () => {
    const { ctx, revocados } = await escenario(false);
    await consumidorCpqEnlace.handler(ctx, evento("cpq", "enlace_publico"));
    expect(revocados()).toBe(2);
  });

  it("si el ajuste quedó encendido no revoca, y otros ajustes no lo disparan", async () => {
    const { ctx, revocados } = await escenario(true);
    await consumidorCpqEnlace.handler(ctx, evento("cpq", "enlace_publico"));
    expect(revocados()).toBe(0);
    const apagado = await escenario(false);
    await consumidorCpqEnlace.handler(apagado.ctx, evento("cpq", "supuestos_afp"));
    expect(apagado.revocados()).toBe(0);
  });
});
