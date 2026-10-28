import { beforeEach, describe, expect, it } from "vitest";

import { dato } from "./maestros-ayuda";
import { CU, I1, I2, K1, K2, ctxComercial, reiniciarComercial } from "./comercial-ayuda";

// Revisión 5685957626 del PR #97: la ficha del negocio no revela contactos fuera del alcance por
// filas (ADR-022) ni a quien no ve Cuentas, igual que comercial.contactos.list.
beforeEach(reiniciarComercial);

type Ficha = { id: string; contactos: { contactoId: string; nombre: string }[] };

describe("comercial · contactos en la ficha del negocio", () => {
  it("un supervisor acotado con Comercial por excepción no ve contactos fuera de su alcance", async () => {
    const owner = ctxComercial();
    const n = await dato<{ id: string }>(owner.ctx, "comercial.negocios.create", {
      cuentaId: CU,
      titulo: "Guardias · Planta 1",
    });
    await dato(owner.ctx, "comercial.negocios.set_contactos", {
      negocioId: n.id,
      contactos: [
        { contactoId: K1, rol: "decisor", esPrincipal: true },
        { contactoId: K2, rol: "tecnico" },
      ],
    });
    // La base en memoria no pone los defaults de fecha (Postgres sí); la ficha los devuelve.
    for (const f of owner.tabla("negocio") ?? []) f.createdAt ??= new Date();
    // El actor acotado del Revisor, con el mismo negocio y sus vínculos copiados a su base.
    const supervisor = (instalaciones: string[]) => {
      const s = ctxComercial({
        rol: "supervisor",
        excepciones: [{ permiso: "comercial:negocios.read", conceder: true }],
        alcance: { instalaciones },
      });
      for (const t of ["negocio", "negocioContacto"]) {
        s.tabla(t)?.push(...(owner.tabla(t) ?? []));
      }
      return s.ctx;
    };
    const ficha = (ctx: typeof owner.ctx) =>
      dato<Ficha>(ctx, "comercial.negocios.get", { id: n.id });

    expect((await ficha(supervisor([I2]))).contactos).toEqual([]);
    expect((await ficha(supervisor([]))).contactos).toEqual([]);
    const dentro = await ficha(supervisor([I1]));
    expect(dentro.contactos.map((c) => c.contactoId).sort()).toEqual([K1, K2].sort());
    // Sin permiso de Cuentas (aunque vea Comercial y sin alcance), la ficha no trae contactos.
    const sinCuentas = ctxComercial({ permisos: ["comercial:negocios.read"] });
    for (const t of ["negocio", "negocioContacto"]) {
      sinCuentas.tabla(t)?.push(...(owner.tabla(t) ?? []));
    }
    expect((await ficha(sinCuentas.ctx)).contactos).toEqual([]);
  });
});
