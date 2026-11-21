import { describe, expect, it } from "vitest";

import { vistaAccesoPersona } from "@/app/(erp)/personas/_componentes/acceso-portal-persona";

describe("vistaAccesoPersona", () => {
  it("permite dar acceso cuando está activa y sin correo muestra nota", () => {
    const v = vistaAccesoPersona({ estado: "sin_acceso" }, { tieneUsuario: false, personaActiva: true });
    expect(v.darAcceso).toBe(true);
    expect(v.vincular).toBe(true);
  });

  it("no ofrece acciones si el portal no está disponible", () => {
    const v = vistaAccesoPersona(
      { estado: "no_disponible", motivo: "usuario_interno" },
      { tieneUsuario: true, personaActiva: true },
    );
    expect(v.darAcceso).toBe(false);
    expect(v.nota).toMatch(/interno/);
  });
});