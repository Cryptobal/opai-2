import { beforeEach, describe, expect, it } from "vitest";

import { TENANT_DE_PRUEBA } from "../src/testing";
import { codigo, dato } from "./maestros-ayuda";
import { CU, I1, N1, ctxComercial, reiniciarComercial } from "./comercial-ayuda";

// CAR-62 (pendiente del Revisor en el PR #104): las instalaciones de Negocios respetan el alcance
// por filas (ADR-022). Un supervisor al que una excepción le concede Comercial no vincula ni ve
// instalaciones de la cuenta que no tiene a cargo, y nadie vincula una instalación archivada.
beforeEach(reiniciarComercial);

// Segunda instalación de la cuenta CU (I1 es la primera), fuera del alcance del supervisor.
const I3 = "0192f3a0-0000-7000-8000-0000000000f3";

function supervisor(alcance: string[]) {
  const s = ctxComercial({
    rol: "supervisor",
    excepciones: [
      { permiso: "comercial:negocios.read", conceder: true },
      { permiso: "comercial:negocios.manage", conceder: true },
    ],
    alcance: { instalaciones: alcance },
    conNegocio: true,
  });
  s.tabla("instalacion")?.push({
    id: I3,
    tenantId: TENANT_DE_PRUEBA,
    cuentaId: CU,
    nombre: "Bodega 3",
    estado: "activa",
    archivadaEn: null,
  });
  for (const f of s.tabla("negocio") ?? []) f.createdAt ??= new Date();
  return s;
}

const vincular = (ctx: ReturnType<typeof supervisor>["ctx"], instalacionId: string) =>
  codigo(ctx, "comercial.negocios.vincular_instalacion", { negocioId: N1, instalacionId });

describe("comercial · alcance de instalaciones en Negocios", () => {
  it("create con una instalación fuera del alcance responde NOT_FOUND y no crea el negocio", async () => {
    const { ctx } = supervisor([I1]);
    const input = { cuentaId: CU, titulo: "Fuera de alcance", instalaciones: [{ instalacionId: I3 }] };
    expect(await codigo(ctx, "comercial.negocios.create", input)).toBe("NOT_FOUND");
    const ok = await dato<{ id: string }>(ctx, "comercial.negocios.create", {
      ...input,
      instalaciones: [{ instalacionId: I1 }],
    });
    expect(ok.id).toBeTruthy();
  });

  it("vincular_instalacion fuera del alcance responde NOT_FOUND, igual que una inexistente", async () => {
    const { ctx } = supervisor([I1]);
    expect(await vincular(ctx, I3)).toBe("NOT_FOUND");
    expect(await vincular(ctx, "0192f3a0-0000-7000-8000-0000000000ff")).toBe("NOT_FOUND");
    // Sin instalaciones a cargo no vincula nada (denegar por defecto).
    expect(await vincular(supervisor([]).ctx, I3)).toBe("NOT_FOUND");
    // Dentro del alcance sí vincula.
    expect(await vincular(supervisor([I1, I3]).ctx, I3)).toBe("OK");
  });

  it("desvincular_instalacion fuera del alcance responde NOT_FOUND", async () => {
    const { ctx } = supervisor([I3]);
    const r = await codigo(ctx, "comercial.negocios.desvincular_instalacion", {
      negocioId: N1,
      instalacionId: I1,
    });
    expect(r).toBe("NOT_FOUND");
  });

  it("la ficha no revela instalaciones vinculadas fuera del alcance", async () => {
    type Ficha = { instalaciones: { instalacionId: string; nombre: string }[] };
    const ficha = (s: ReturnType<typeof supervisor>) =>
      dato<Ficha>(s.ctx, "comercial.negocios.get", { id: N1 });
    expect((await ficha(supervisor([I3]))).instalaciones).toEqual([]);
    const dentro = await ficha(supervisor([I1]));
    expect(dentro.instalaciones.map((i) => i.nombre)).toEqual(["Planta 1"]);
  });

  it("no vincula una instalación archivada, al crear ni después (sin alcance: owner)", async () => {
    const s = ctxComercial({ conNegocio: true });
    for (const i of s.tabla("instalacion") ?? []) if (i.id === I1) i.archivadaEn = new Date();
    const crear = { cuentaId: CU, titulo: "Archivada", instalaciones: [{ instalacionId: I1 }] };
    expect(await codigo(s.ctx, "comercial.negocios.create", crear)).toBe("UNPROCESSABLE");
    expect(
      await codigo(s.ctx, "comercial.negocios.vincular_instalacion", {
        negocioId: N1,
        instalacionId: I1,
      }),
    ).toBe("UNPROCESSABLE");
  });
});
