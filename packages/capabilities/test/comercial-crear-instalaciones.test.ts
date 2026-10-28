import { beforeEach, describe, expect, it } from "vitest";

import { codigo, dato } from "./maestros-ayuda";
import { CU, I1, I2, ctxComercial, reiniciarComercial } from "./comercial-ayuda";

beforeEach(reiniciarComercial);

type Ctx = ReturnType<typeof ctxComercial>["ctx"];
const vinculos = (ctx: Ctx, negocioId: string) =>
  ctx.db.negocioInstalacion.findMany({ where: { negocioId } });

// CAR-33: «Nuevo negocio» vincula instalaciones de la cuenta en la misma escritura que lo crea.
describe("comercial.negocios.create · instalaciones al crear", () => {
  it("vincula las instalaciones de la cuenta (sin repetir) con su tipo", async () => {
    const { ctx } = ctxComercial();
    const n = await dato<{ id: string }>(ctx, "comercial.negocios.create", {
      cuentaId: CU,
      titulo: "Con instalación",
      instalaciones: [{ instalacionId: I1 }, { instalacionId: I1, tipo: "ampliacion" }],
    });
    const v = await vinculos(ctx, n.id);
    expect(v).toHaveLength(1);
    expect(v[0]?.instalacionId).toBe(I1);
    expect(v[0]?.tipo).toBe("nueva");
  });

  it("rechaza una instalación de otra cuenta y no crea el negocio (R16)", async () => {
    const { ctx } = ctxComercial();
    const input = {
      cuentaId: CU,
      titulo: "Instalación ajena",
      instalaciones: [{ instalacionId: I2 }],
    };
    expect(await codigo(ctx, "comercial.negocios.create", input)).toBe("UNPROCESSABLE");
    const lista = await dato<{ items: unknown[] }>(ctx, "comercial.negocios.list", {});
    expect(lista.items).toHaveLength(0);
  });

  it("rechaza una instalación inexistente", async () => {
    const { ctx } = ctxComercial();
    expect(
      await codigo(ctx, "comercial.negocios.create", {
        cuentaId: CU,
        titulo: "Instalación inventada",
        instalaciones: [{ instalacionId: "0192f3a0-0000-7000-8000-0000000000ff" }],
      }),
    ).toBe("NOT_FOUND");
  });

  it("sin instalaciones se crea igual que antes", async () => {
    const { ctx } = ctxComercial();
    const n = await dato<{ id: string }>(ctx, "comercial.negocios.create", {
      cuentaId: CU,
      titulo: "Sin instalación",
    });
    expect(await vinculos(ctx, n.id)).toHaveLength(0);
  });
});
