// CAR-162 (N1 de #296): el plan solo puede nombrar etapas del embudo de la propia empresa.
import { describe, expect, it } from "vitest";

import { validarEtapasDelPlan } from "../src/comercial/seguimiento-etapas";
import { contextoDePrueba } from "../src/testing";

const base = { alResponder: "pausar", alTerminar: "solo_avisar", pasos: [] } as never;
const con = (extra: object) => ({ ...(base as object), ...extra }) as never;
const ID_AJENA = "0192b5c0-0000-7000-8000-000000000001";

describe("validarEtapasDelPlan", () => {
  it("acepta un plan sin etapas y uno con etapas activas del embudo", async () => {
    const { ctx } = contextoDePrueba({ modulosActivos: ["comercial"] });
    const embudo = await ctx.db.embudo.create({ data: { tenantId: ctx.tenantId, nombre: "Ventas", porDefecto: true, activo: true } });
    const etapa = await ctx.db.etapa.create({ data: { tenantId: ctx.tenantId, embudoId: embudo.id, nombre: "Visita", orden: 1, tipo: "abierta", activa: true } });
    await expect(validarEtapasDelPlan(ctx, base)).resolves.toBeUndefined();
    await expect(validarEtapasDelPlan(ctx, con({ etapaAlResponder: etapa.id, noCerrarDesdeEtapa: etapa.id }))).resolves.toBeUndefined();
  });

  it("rechaza con error claro una etapa inexistente o de otra empresa", async () => {
    const { ctx } = contextoDePrueba({ modulosActivos: ["comercial"] });
    await expect(validarEtapasDelPlan(ctx, con({ noCerrarDesdeEtapa: ID_AJENA }))).rejects.toThrow(/no cerrar desde.*no existe/);
    await expect(validarEtapasDelPlan(ctx, con({ etapaAlResponder: ID_AJENA }))).rejects.toThrow(/al responder.*no existe/);
  });

  it("rechaza una etapa inactiva", async () => {
    const { ctx } = contextoDePrueba({ modulosActivos: ["comercial"] });
    const embudo = await ctx.db.embudo.create({ data: { tenantId: ctx.tenantId, nombre: "Ventas", porDefecto: true, activo: true } });
    const etapa = await ctx.db.etapa.create({ data: { tenantId: ctx.tenantId, embudoId: embudo.id, nombre: "Vieja", orden: 1, tipo: "abierta", activa: false } });
    await expect(validarEtapasDelPlan(ctx, con({ noCerrarDesdeEtapa: etapa.id }))).rejects.toThrow(/no existe/);
  });
});
