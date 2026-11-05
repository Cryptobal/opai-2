import { describe, expect, it, vi } from "vitest";

const { modulosConEstado } = vi.hoisted(() => ({ modulosConEstado: vi.fn() }));
vi.mock("../lib/fuentes", () => ({ fuentesReales: { modulosConEstado } }));

import { soloLecturaDe } from "../lib/solo-lectura";

/** CAR-188: las rutas públicas y webhooks respetan el solo lectura del módulo que escriben. */
describe("soloLecturaDe (rutas públicas y webhooks)", () => {
  it("devuelve el módulo solo si la empresa lo tiene en solo lectura", async () => {
    modulosConEstado.mockResolvedValue({
      activos: ["comercial", "finanzas"],
      soloLectura: ["comercial"],
    });
    expect(await soloLecturaDe("t1", "comercial")).toEqual(["comercial"]);
    expect(await soloLecturaDe("t1", "finanzas")).toEqual([]);
  });
});
