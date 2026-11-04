// CAR-162 (N3 de #296): el aviso al vendedor solo cuenta su membresía activa en ESTA empresa.
import { describe, expect, it } from "vitest";

import { consumidorSeguimientoAviso } from "../src/comercial/seguimiento-aviso";
import { contextoDePrueba } from "../src/testing";
import { registrarModuloComercial } from "./comercial-modulo";

const OTRA_EMPRESA = "0192f3a0-0000-7000-8000-0000000000ee";
const ev = { id: "ev-1", tipo: "comercial.seguimiento.cliente_respondio", entidadId: "n1", payload: {} } as never;

async function conMembresia(tenantId: (propio: string) => string) {
  registrarModuloComercial();
  const { ctx, tabla } = contextoDePrueba({ modulosActivos: ["comercial"] });
  await ctx.db.ajuste.create({
    data: { tenantId: ctx.tenantId, ambito: "tenant", sujetoId: ctx.tenantId, modulo: "comercial", clave: "seguimiento_aviso_responsable", valor: true, version: 1 },
  });
  await ctx.db.negocio.create({ data: { id: "n1", tenantId: ctx.tenantId, titulo: "Negocio", responsableId: "vendedor-1" } });
  await ctx.db.membership.create({ data: { tenantId: tenantId(ctx.tenantId), userId: "vendedor-1", estado: "activa", rol: "vendedor" } });
  await consumidorSeguimientoAviso.handler(ctx, ev);
  return tabla("notificacion").length;
}

describe("aviso del seguimiento · membresía por empresa", () => {
  it("un responsable que solo es miembro activo de OTRA empresa no recibe el aviso", async () => {
    expect(await conMembresia(() => OTRA_EMPRESA)).toBe(0);
  });
  it("con membresía activa en la empresa sí lo recibe", async () => {
    expect(await conMembresia((propio) => propio)).toBe(1);
  });
});
