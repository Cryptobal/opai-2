import { beforeEach, describe, expect, it } from "vitest";

import { codigo, dato } from "./maestros-ayuda";
import { CU, I2, K1, K2, MP, MPO, ctxComercial, reiniciarComercial } from "./comercial-ayuda";

beforeEach(reiniciarComercial);

async function crear(ctx: Parameters<typeof dato>[0]) {
  return dato<{ id: string }>(ctx, "comercial.negocios.create", {
    cuentaId: CU,
    titulo: "Negocio",
  });
}

describe("comercial · vínculos y cierre", () => {
  it("no vincula una instalación de otra cuenta (R16)", async () => {
    const { ctx } = ctxComercial();
    const n = await crear(ctx);
    expect(
      await codigo(ctx, "comercial.negocios.vincular_instalacion", {
        negocioId: n.id,
        instalacionId: I2,
        tipo: "nueva",
      }),
    ).toBe("UNPROCESSABLE");
  });

  it("set_contactos exige un solo principal y contactos de la cuenta", async () => {
    const { ctx } = ctxComercial();
    const n = await crear(ctx);
    expect(
      await codigo(ctx, "comercial.negocios.set_contactos", {
        negocioId: n.id,
        contactos: [
          { contactoId: K1, rol: "decisor", esPrincipal: true },
          { contactoId: K2, rol: "tecnico", esPrincipal: true },
        ],
      }),
    ).toBe("UNPROCESSABLE");
    const r = await dato<{ total: number }>(ctx, "comercial.negocios.set_contactos", {
      negocioId: n.id,
      contactos: [{ contactoId: K1, rol: "decisor", esPrincipal: true }],
    });
    expect(r.total).toBe(1);
  });

  it("perder exige detalle en «otro» y marca estado perdido; reabrir lo vuelve a abierto", async () => {
    const { ctx } = ctxComercial();
    const n = await crear(ctx);
    expect(await codigo(ctx, "comercial.negocios.perder", { id: n.id, motivoPerdidaId: MPO })).toBe(
      "UNPROCESSABLE",
    );
    const perdido = await dato<{ estado: string }>(ctx, "comercial.negocios.perder", {
      id: n.id,
      motivoPerdidaId: MP,
    });
    expect(perdido.estado).toBe("perdido");
    const reabierto = await dato<{ estado: string }>(ctx, "comercial.negocios.reabrir", {
      id: n.id,
      motivo: "El cliente reconsideró",
    });
    expect(reabierto.estado).toBe("abierto");
  });

  it("list y embudo devuelven el negocio con su cuenta y etapa", async () => {
    const { ctx } = ctxComercial();
    await crear(ctx);
    const lista = await dato<{ items: { cuentaNombre: string; etapaNombre: string }[] }>(
      ctx,
      "comercial.negocios.list",
      {},
    );
    expect(lista.items[0]?.cuentaNombre).toBe("Cuenta 1");
    const embudo = await dato<{ etapas: unknown[]; negocios: unknown[] }>(
      ctx,
      "comercial.negocios.embudo",
      {},
    );
    expect(embudo.etapas.length).toBe(6);
    expect(embudo.negocios.length).toBe(1);
  });
});
