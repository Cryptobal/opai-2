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

  it("pausa manual antes de la primera respuesta: igual avisa una vez, y las siguientes no repiten", async () => {
    const { ctx, tabla } = contextoDePrueba({ modulosActivos: ["comercial"] });
    const fila = await ctx.db.seguimiento.create({
      data: { tenantId: ctx.tenantId, negocioId: "n2", planId: "p1", planVersion: 1, estado: "pausado", motivo: "manual", ancla: new Date(), token: "tok-2" },
    });
    const config = { alResponder: "pausar" } as never;
    for (const n of [1, 2, 3]) {
      const s = (await ctx.db.seguimiento.findUnique({ where: { id: fila.id } }))!;
      await ctx.transaccion((tx) => aplicarRespuesta(ctx, tx, s, config, { titulo: `Respuesta ${n}` }));
    }
    const avisos = tabla("evento").filter((e) => e["tipo"] === "comercial.seguimiento.cliente_respondio");
    expect(avisos).toHaveLength(1);
    const final = await ctx.db.seguimiento.findUnique({ where: { id: fila.id } });
    expect(final?.estado).toBe("pausado");
    // La ficha conserva por qué se pausó; «ya avisado» vive en su propio campo.
    expect(final?.motivo).toBe("manual");
    expect(final?.avisadoEn).toBeInstanceOf(Date);
  });

  it("un seguimiento ya pausado por una respuesta anterior a avisadoEn no vuelve a avisar", async () => {
    const { ctx, tabla } = contextoDePrueba({ modulosActivos: ["comercial"] });
    const fila = await ctx.db.seguimiento.create({
      data: { tenantId: ctx.tenantId, negocioId: "n4", planId: "p1", planVersion: 1, estado: "pausado", motivo: "cliente_respondio", ancla: new Date(), token: "tok-4" },
    });
    await ctx.transaccion((tx) => aplicarRespuesta(ctx, tx, fila, { alResponder: "pausar" } as never, { titulo: "Otra respuesta" }));
    expect(tabla("evento").filter((e) => e["tipo"] === "comercial.seguimiento.cliente_respondio")).toHaveLength(0);
  });

  it.each(["ganado", "perdido", "sin_respuesta"])("no corre sobre un seguimiento terminado (%s): no pisa el motivo ni avisa", async (motivo) => {
    const { ctx, tabla } = contextoDePrueba({ modulosActivos: ["comercial"] });
    const fila = await ctx.db.seguimiento.create({
      data: { tenantId: ctx.tenantId, negocioId: "n3", planId: "p1", planVersion: 1, estado: "terminado", motivo, ancla: new Date(), token: `tok-${motivo}` },
    });
    const r = await ctx.transaccion((tx) => aplicarRespuesta(ctx, tx, fila, { alResponder: "detener" } as never, { titulo: "Tarde" }));
    expect(r).toBeNull();
    const final = await ctx.db.seguimiento.findUnique({ where: { id: fila.id } });
    expect(final).toMatchObject({ estado: "terminado", motivo });
    expect(final?.avisadoEn ?? null).toBeNull();
    expect(tabla("evento").filter((e) => e["tipo"] === "comercial.seguimiento.cliente_respondio")).toHaveLength(0);
    expect(tabla("actividad")).toHaveLength(0);
  });

  it("si el seguimiento se cerró después de leerlo (dato viejo), tampoco corre", async () => {
    const { ctx, tabla } = contextoDePrueba({ modulosActivos: ["comercial"] });
    const fila = await ctx.db.seguimiento.create({
      data: { tenantId: ctx.tenantId, negocioId: "n5", planId: "p1", planVersion: 1, estado: "activo", ancla: new Date(), token: "tok-5" },
    });
    const viejo = { ...fila };
    await ctx.db.seguimiento.update({ where: { id: fila.id }, data: { estado: "terminado", motivo: "ganado" } });
    const r = await ctx.transaccion((tx) => aplicarRespuesta(ctx, tx, viejo, { alResponder: "pausar" } as never, { titulo: "Tarde" }));
    expect(r).toBeNull();
    expect((await ctx.db.seguimiento.findUnique({ where: { id: fila.id } }))?.motivo).toBe("ganado");
    expect(tabla("evento").filter((e) => e["tipo"] === "comercial.seguimiento.cliente_respondio")).toHaveLength(0);
  });
});
