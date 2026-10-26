// Brief 07c · B3: lógica del filtro de alcance por filas (ADR-022). Pura: dado el alcance del
// contexto, cada `donde*` produce el fragmento `where` que acota la entidad a las instalaciones a
// cargo. Sin alcance (owner/admin/gerente) los fragmentos quedan vacíos (ve todo).
import { describe, expect, it } from "vitest";

import {
  dondeContacto,
  dondeCuenta,
  dondeInstalacion,
  dondePersona,
  dondePuesto,
  instalacionesEnAlcance,
} from "../src/core/maestros/alcance";
import { contextoDePrueba } from "../src/testing";

const A = "0192f3a0-0000-7000-8000-00000000aa01";
const B = "0192f3a0-0000-7000-8000-00000000aa02";

describe("filtro de alcance (B3)", () => {
  it("sin alcance (owner): todos los fragmentos quedan vacíos y ve todo", () => {
    const { ctx } = contextoDePrueba({ rol: "owner" });
    expect(instalacionesEnAlcance(ctx)).toBeNull();
    expect(dondeInstalacion(ctx)).toEqual({});
    expect(dondeCuenta(ctx)).toEqual({});
    expect(dondePuesto(ctx)).toEqual({});
    expect(dondeContacto(ctx)).toEqual({});
    expect(dondePersona(ctx)).toEqual({});
  });

  it("supervisor con instalaciones: acota cada entidad por sus instalaciones", () => {
    const { ctx } = contextoDePrueba({ rol: "supervisor", alcance: { instalaciones: [A, B] } });
    expect(instalacionesEnAlcance(ctx)).toEqual([A, B]);
    expect(dondeInstalacion(ctx)).toEqual({ id: { in: [A, B] } });
    expect(dondePuesto(ctx)).toEqual({ instalacionId: { in: [A, B] } });
    expect(dondeCuenta(ctx)).toEqual({ instalaciones: { some: { id: { in: [A, B] } } } });
    expect(dondeContacto(ctx)).toEqual({
      cuenta: { instalaciones: { some: { id: { in: [A, B] } } } },
    });
    // Personas: sin relación real persona ↔ instalación hasta el Brief 07b → denegar por defecto.
    expect(dondePersona(ctx)).toEqual({ id: { in: [] } });
  });

  it("supervisor sin instalaciones: no ve ninguna entidad (conjunto vacío)", () => {
    const { ctx } = contextoDePrueba({ rol: "supervisor", alcance: { instalaciones: [] } });
    expect(instalacionesEnAlcance(ctx)).toEqual([]);
    expect(dondeInstalacion(ctx)).toEqual({ id: { in: [] } });
    expect(dondeCuenta(ctx)).toEqual({ instalaciones: { some: { id: { in: [] } } } });
  });
});
