import { describe, expect, it } from "vitest";

import type { Identidad } from "@/lib/actor";
import { destinoDeInicio } from "@/lib/portal-inicio";

function identidad(portalInicio: string | null = null): Identidad {
  const actual = {
    id: "m",
    tenantId: "t",
    rol: "viewer",
    estado: "activa",
    portales: ["supervisor", "erp"],
    portalInicio,
    tenant: { id: "t", slug: "t", nombre: "T", vertical: "seguridad", estado: "activo" },
  };
  return {
    usuario: { id: "u", nombre: "U", email: "u@example.test", platformRole: null },
    actual,
    membresias: [actual],
    modulosActivos: [],
    acceso: { permisosRol: null, excepciones: [], instalaciones: null },
  };
}

describe("destino tras login o cambio de empresa", () => {
  it("prefiere el elegido y cae al primero si es null, desconocido o revocado", () => {
    expect(destinoDeInicio(identidad("erp"))).toBe("/");
    for (const preferido of [null, "cliente", "platform", "desconocido"]) {
      expect(destinoDeInicio(identidad(preferido))).toBe("/supervisor");
    }
  });
  it("next explícito prima y sigue pasando por destinoSeguro", () => {
    expect(destinoDeInicio(identidad(), "/personas?x=1")).toBe("/personas?x=1");
    expect(destinoDeInicio(identidad(), "//externo.test")).toBe("/");
    expect(destinoDeInicio(identidad(), "/\\externo.test")).toBe("/");
    expect(destinoDeInicio(identidad(), "/")).toBe("/");
  });
});
