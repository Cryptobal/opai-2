// CAR-162: «cliente respondió» se emite una vez por cambio real de estado, no por cada respuesta.
import { describe, expect, it } from "vitest";

import { aplicarRespuesta } from "../src/comercial/seguimiento-ejecucion";
import { contextoDePrueba } from "../src/testing";

describe("aplicarRespuesta · evento cliente_respondio", () => {
  it("la primera respuesta pausa y avisa; las siguientes dejan nota pero no repiten el evento", async () => {
    const { ctx, tabla } = contextoDePrueba({ modulosActivos: ["comercial"] });
    const fila = await ctx.db.seguimiento.create({
      data: { tenantId: ctx.tenantId, negocioId: "n1", planId: "p1", planVersion: 1, estado: "activo", ancla: new Date(), token: "tok-1" },
    });
    const config = { alResponder: "pausar" } as never;
    for (const n of [1, 2, 3]) {
      const s = (await ctx.db.seguimiento.findUnique({ where: { id: fila.id } }))!;
      await ctx.transaccion((tx) => aplicarRespuesta(ctx, tx, s, config, { titulo: `Respuesta ${n}` }));
    }
    const avisos = tabla("evento").filter((e) => e["tipo"] === "comercial.seguimiento.cliente_respondio");
    expect(avisos).toHaveLength(1);
    expect((await ctx.db.seguimiento.findUnique({ where: { id: fila.id } }))?.estado).toBe("pausado");
  });
});
