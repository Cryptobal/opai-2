import { beforeEach, describe, expect, it } from "vitest";

import { codigo, dato } from "./maestros-ayuda";
import { CU, I1, MP, ctxComercial, etapaId, reiniciarComercial } from "./comercial-ayuda";

// Brief 07 · PR 1b §5: crear y reordenar etapas (dryRun, conflictos, R26 y comercial:config.manage).
beforeEach(reiniciarComercial);

type Etapa = { id: string; nombre: string; orden: number; tipo: string };
const ordenadas = (filas: Etapa[] | undefined) =>
  [...(filas ?? [])].sort((a, b) => a.orden - b.orden).map((e) => e.nombre);
const ABIERTAS = [0, 1, 2, 3].map(etapaId);
const CERRADAS = [6, 7].map(etapaId);

describe("comercial · editor del embudo", () => {
  it("crear_etapa agrega al final de las abiertas, antes de la ganada y la perdida", async () => {
    const { ctx, tabla } = ctxComercial();
    const e = await dato<Etapa>(ctx, "comercial.config.crear_etapa", {
      nombre: "Negociación",
      probabilidad: 70,
    });
    expect(e).toMatchObject({ tipo: "abierta", orden: 4 });
    expect(ordenadas(tabla("etapa") as Etapa[])).toEqual([
      "Prospecto",
      "Calificado",
      "Visita técnica",
      "Propuesta enviada",
      "Negociación",
      "Adjudicado",
      "Perdido",
    ]);
  });

  it("crear_etapa en una posición corre las siguientes y no escribe en dryRun", async () => {
    const { ctx, tabla } = ctxComercial();
    const previa = await dato<Etapa>(
      ctx,
      "comercial.config.crear_etapa",
      { nombre: "Reunión", posicion: 1 },
      { dryRun: true },
    );
    expect(previa.orden).toBe(1);
    expect(tabla("etapa")).toHaveLength(6);
    await dato(ctx, "comercial.config.crear_etapa", { nombre: "Reunión", posicion: 1 });
    expect(ordenadas(tabla("etapa") as Etapa[]).slice(0, 3)).toEqual([
      "Prospecto",
      "Reunión",
      "Calificado",
    ]);
  });

  it("crear_etapa rechaza un nombre repetido", async () => {
    const { ctx } = ctxComercial();
    expect(await codigo(ctx, "comercial.config.crear_etapa", { nombre: "calificado" })).toBe(
      "UNPROCESSABLE",
    );
  });

  it("reordenar_etapas aplica la lista completa y deja la ganada y la perdida al final", async () => {
    const { ctx, tabla } = ctxComercial();
    const ids = [ABIERTAS[2], ABIERTAS[0], ABIERTAS[1], ABIERTAS[3], ...CERRADAS];
    const r = await dato<{ etapas: Etapa[] }>(ctx, "comercial.config.reordenar_etapas", { ids });
    expect(r.etapas.map((e) => e.orden)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(ordenadas(tabla("etapa") as Etapa[])).toEqual([
      "Visita técnica",
      "Prospecto",
      "Calificado",
      "Propuesta enviada",
      "Adjudicado",
      "Perdido",
    ]);
  });

  it("reordenar_etapas en dryRun no cambia el orden guardado", async () => {
    const { ctx, tabla } = ctxComercial();
    const ids = [ABIERTAS[1], ABIERTAS[0], ABIERTAS[2], ABIERTAS[3], ...CERRADAS];
    await dato(ctx, "comercial.config.reordenar_etapas", { ids }, { dryRun: true });
    expect(ordenadas(tabla("etapa") as Etapa[])[0]).toBe("Prospecto");
  });

  it("reordenar_etapas rechaza listas incompletas o mover la ganada o la perdida (R26)", async () => {
    const { ctx } = ctxComercial();
    const id = "comercial.config.reordenar_etapas";
    expect(await codigo(ctx, id, { ids: [...ABIERTAS, CERRADAS[0]] })).toBe("UNPROCESSABLE");
    expect(await codigo(ctx, id, { ids: [...ABIERTAS, ABIERTAS[0], ...CERRADAS] })).toBe(
      "UNPROCESSABLE",
    );
    expect(await codigo(ctx, id, { ids: [CERRADAS[0], ...ABIERTAS, CERRADAS[1]] })).toBe(
      "UNPROCESSABLE",
    );
    expect(await codigo(ctx, id, { ids: [...ABIERTAS, CERRADAS[1], CERRADAS[0]] })).toBe(
      "UNPROCESSABLE",
    );
  });

  it("solo comercial:config.manage edita el embudo", async () => {
    const ids = [...ABIERTAS, ...CERRADAS];
    for (const rol of ["supervisor", "viewer"] as const) {
      const { ctx } = ctxComercial({ rol });
      expect(await codigo(ctx, "comercial.config.crear_etapa", { nombre: "Nueva" })).toBe(
        "FORBIDDEN",
      );
      expect(await codigo(ctx, "comercial.config.reordenar_etapas", { ids })).toBe("FORBIDDEN");
    }
    const vendedor = ctxComercial({ permisos: ["comercial:negocios.manage"] }).ctx;
    expect(await codigo(vendedor, "comercial.config.reordenar_etapas", { ids })).toBe("FORBIDDEN");
  });

  it("una etapa con negocios no se desactiva y el orden solo cambia por reordenar", async () => {
    const { ctx } = ctxComercial();
    await dato(ctx, "comercial.negocios.create", { cuentaId: CU, titulo: "Guardias · Planta 1" });
    const id = "comercial.config.actualizar_etapa";
    expect(await codigo(ctx, id, { id: etapaId(0), activa: false })).toBe("UNPROCESSABLE");
    expect(await codigo(ctx, id, { id: etapaId(1), activa: false })).toBe("OK");
  });
});

describe("comercial · reabrir en una etapa elegida", () => {
  it("vuelve a la etapa abierta elegida y rechaza una cerrada", async () => {
    const { ctx } = ctxComercial();
    const n = await dato<{ id: string }>(ctx, "comercial.negocios.create", {
      cuentaId: CU,
      titulo: "Guardias · Planta 1",
    });
    await dato(ctx, "comercial.negocios.vincular_instalacion", {
      negocioId: n.id,
      instalacionId: I1,
    });
    await dato(ctx, "comercial.negocios.perder", { id: n.id, motivoPerdidaId: MP });
    const motivo = "Pidieron una nueva propuesta";
    expect(
      await codigo(ctx, "comercial.negocios.reabrir", { id: n.id, motivo, etapaId: etapaId(6) }),
    ).toBe("UNPROCESSABLE");
    // R9: la etapa 2 exige monto; reabrir allí lo valida como si avanzara desde la primera.
    const enDos = { id: n.id, motivo, etapaId: etapaId(2) };
    expect(await codigo(ctx, "comercial.negocios.reabrir", enDos)).toBe("UNPROCESSABLE");
    await dato(ctx, "comercial.negocios.update", { id: n.id, montoEstimadoMensual: 2_000_000 });
    const r = await dato<{ etapaId: string; estado: string }>(ctx, "comercial.negocios.reabrir", {
      id: n.id,
      motivo,
      etapaId: etapaId(2),
    });
    expect(r).toMatchObject({ etapaId: etapaId(2), estado: "abierto" });
  });
});
