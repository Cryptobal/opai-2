import { describe, expect, it } from "vitest";

import { tieneAccesoAPortal } from "@/lib/acceso-portal";
import type { Identidad } from "@/lib/actor";
import { membresia } from "./fuentes-falsas";

function identidad(
  portales: string[],
  extra: { rol?: string; instalaciones?: string[] | null } = {},
): Identidad {
  const actual = membresia({ portales, rol: extra.rol ?? "admin" });
  return {
    usuario: { id: "u1", nombre: "U", email: "u@example.test", platformRole: null },
    mfaActiva: false,
    actual,
    membresias: [actual],
    modulosActivos: [],
    acceso: {
      permisosRol: null,
      excepciones: [],
      instalaciones: extra.instalaciones ?? null,
    },
    personaVinculada: false,
  };
}

describe("acceso a Terreno con sesión (CAR-746 seguimiento)", () => {
  it("un administrador con terreno en la membresía puede abrir /terreno", () => {
    expect(tieneAccesoAPortal(identidad(["erp", "terreno"]), "terreno")).toBe(true);
  });

  it("un contacto de cliente no accede a Terreno con sesión", () => {
    expect(
      tieneAccesoAPortal(identidad(["cliente"], { rol: "viewer", instalaciones: ["i"] }), "terreno"),
    ).toBe(false);
  });
});