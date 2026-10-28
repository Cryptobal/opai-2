import { beforeEach, describe, expect, it } from "vitest";

import { codigo, dato } from "./maestros-ayuda";
import { CU, I2, K1, K2, ctxComercial, reiniciarComercial } from "./comercial-ayuda";

// Revisión 5686566802 del PR #97: set_contactos no vincula contactos fuera del alcance (ADR-022)
// ni sin permiso de Cuentas, y el reemplazo no borra los vínculos que el actor no ve.
beforeEach(reiniciarComercial);

const leerYGestionar = [
  { permiso: "comercial:negocios.read", conceder: true },
  { permiso: "comercial:negocios.manage", conceder: true },
];

async function negocioConContactos() {
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
  return { owner, id: n.id };
}

/** Supervisor acotado a `I2` (otra cuenta) con Comercial por excepción y la misma base. */
function supervisorAjeno(owner: ReturnType<typeof ctxComercial>) {
  const s = ctxComercial({
    rol: "supervisor",
    excepciones: leerYGestionar,
    alcance: { instalaciones: [I2] },
  });
  for (const t of ["negocio", "negocioContacto"]) s.tabla(t)?.push(...(owner.tabla(t) ?? []));
  return s;
}

describe("comercial · set_contactos respeta el alcance", () => {
  it("un contacto fuera del alcance responde igual que uno inexistente", async () => {
    const { owner, id } = await negocioConContactos();
    const s = supervisorAjeno(owner);
    const con = (contactoId: string) => ({
      negocioId: id,
      contactos: [{ contactoId, rol: "decisor" }],
    });
    const fuera = await codigo(s.ctx, "comercial.negocios.set_contactos", con(K1));
    const inexistente = "0192f3a0-0000-7000-8000-0000000000ff";
    expect(fuera).toBe("UNPROCESSABLE");
    expect(await codigo(s.ctx, "comercial.negocios.set_contactos", con(inexistente))).toBe(fuera);
  });

  it("el reemplazo conserva los vínculos que el actor no ve", async () => {
    const { owner, id } = await negocioConContactos();
    const s = supervisorAjeno(owner);
    await dato(s.ctx, "comercial.negocios.set_contactos", { negocioId: id, contactos: [] });
    expect((s.tabla("negocioContacto") ?? []).map((v) => v.contactoId).sort()).toEqual(
      [K1, K2].sort(),
    );
  });

  it("sin permiso de Cuentas no define contactos", async () => {
    const { owner, id } = await negocioConContactos();
    const s = ctxComercial({ permisos: ["comercial:negocios.read", "comercial:negocios.manage"] });
    for (const t of ["negocio", "negocioContacto"]) s.tabla(t)?.push(...(owner.tabla(t) ?? []));
    const input = { negocioId: id, contactos: [{ contactoId: K1, rol: "decisor" }] };
    expect(await codigo(s.ctx, "comercial.negocios.set_contactos", input)).toBe("FORBIDDEN");
  });

  it("contactos repetidos se rechazan como regla de negocio, no como error interno", async () => {
    const { owner, id } = await negocioConContactos();
    const input = {
      negocioId: id,
      contactos: [
        { contactoId: K1, rol: "decisor" },
        { contactoId: K1, rol: "tecnico" },
      ],
    };
    expect(await codigo(owner.ctx, "comercial.negocios.set_contactos", input)).toBe(
      "UNPROCESSABLE",
    );
  });
});
