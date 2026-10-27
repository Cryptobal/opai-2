import { describe, expect, it, vi } from "vitest";

import type { Identidad } from "../lib/actor";
import { mfaObligatoriaPara } from "../lib/mfa";

/** Identidad mínima para la política de MFA (NÚCLEO-F); solo importan platformRole y el rol del tenant. */
function identidad(opts: {
  platformRole?: "owner" | "support" | null;
  rol?: string | null;
}): Identidad {
  const { platformRole = null, rol = null } = opts;
  return {
    usuario: { id: "u1", nombre: "U", email: "u@x.cl", platformRole },
    membresias: [],
    actual: rol
      ? {
          id: "m1",
          tenantId: "t1",
          rol,
          portales: ["erp"],
          estado: "activa",
          tenant: { id: "t1", slug: "t", nombre: "T", vertical: "seguridad", estado: "activo" },
        }
      : null,
    modulosActivos: ["core"],
    acceso: { permisosRol: null, excepciones: [], instalaciones: null },
    mfaActiva: false,
  };
}

describe("mfaObligatoriaPara (política NÚCLEO-F)", () => {
  it("una cuenta de plataforma siempre debe tener MFA, sin leer el ajuste del tenant", async () => {
    const leer = vi.fn(async () => false);
    expect(await mfaObligatoriaPara(identidad({ platformRole: "owner" }), leer)).toBe(true);
    expect(await mfaObligatoriaPara(identidad({ platformRole: "support" }), leer)).toBe(true);
    expect(leer).not.toHaveBeenCalled();
  });

  it("owner y admin del tenant siguen el ajuste del tenant", async () => {
    const obligatorio = vi.fn(async () => true);
    const opcional = vi.fn(async () => false);
    expect(await mfaObligatoriaPara(identidad({ rol: "owner" }), obligatorio)).toBe(true);
    expect(await mfaObligatoriaPara(identidad({ rol: "admin" }), obligatorio)).toBe(true);
    expect(await mfaObligatoriaPara(identidad({ rol: "owner" }), opcional)).toBe(false);
  });

  it("los demás roles del tenant nunca son obligados (lo activan opcional)", async () => {
    const leer = vi.fn(async () => true);
    for (const rol of ["gerente", "supervisor", "viewer"]) {
      expect(await mfaObligatoriaPara(identidad({ rol }), leer)).toBe(false);
    }
    expect(leer).not.toHaveBeenCalled();
  });

  it("sin tenant actual (y sin platformRole) no hay exigencia", async () => {
    expect(await mfaObligatoriaPara(identidad({}), vi.fn(async () => true))).toBe(false);
  });
});
