import { describe, expect, it } from "vitest";

import { mensajeDarAcceso, vistaEstado } from "@/app/(erp)/configuracion/_portal_cliente/contactos-acceso";

describe("acceso de contactos al portal", () => {
  it("solo quien no tiene vínculo puede recibir «Dar acceso»", () => {
    expect(vistaEstado({ estado: "sin_acceso" }).darAcceso).toBe(true);
    for (const e of ["invitacion_pendiente", "activo", "suspendido", "revocado", "sin_correo", "no_disponible"] as const)
      expect(vistaEstado({ estado: e }).darAcceso).toBe(false);
  });
  it("un suspendido o revocado no se reactiva desde aquí", () => {
    expect(vistaEstado({ estado: "suspendido" }).nota).toMatch(/Accesos/);
    expect(vistaEstado({ estado: "revocado" }).nota).toMatch(/Accesos/);
  });
  it("suspender y revocar solo para un acceso activo (revocar también el suspendido)", () => {
    expect(vistaEstado({ estado: "activo" })).toMatchObject({ suspender: true, revocar: true });
    expect(vistaEstado({ estado: "suspendido" })).toMatchObject({ suspender: false, revocar: true });
  });
  it("una cuenta inactiva no permite dar acceso y explica por qué", () => {
    const v = vistaEstado({ estado: "sin_acceso" }, false);
    expect(v.darAcceso).toBe(false);
    expect(v.nota).toMatch(/inactiva/);
  });
  it("explica el motivo de «No disponible»", () => {
    expect(vistaEstado({ estado: "no_disponible", motivo: "usuario_interno" }).nota).toMatch(/interno/);
    expect(vistaEstado({ estado: "no_disponible", motivo: "vinculado_a_otra_cuenta" }).nota).toMatch(/otra cuenta/);
  });
  it("con la cuenta inactiva un acceso activo se ve pausado, no «Activo»", () => {
    const v = vistaEstado({ estado: "activo" }, false);
    expect(v.etiqueta).toMatch(/Pausado/);
    expect(v.suspender).toBe(false);
  });
  it("solo anuncia «Invitación enviada» si se envió una invitación", () => {
    expect(mensajeDarAcceso({ estado: "invitado" })).toEqual({ exito: true, texto: "Invitación enviada" });
    expect(mensajeDarAcceso({ estado: "vinculado" }).texto).toMatch(/no se envió invitación/);
    expect(mensajeDarAcceso({ estado: "no_aplica", motivo: "usuario interno" })).toMatchObject({ exito: false, texto: expect.stringContaining("usuario interno") });
    expect(mensajeDarAcceso({ estado: "invitacion_pendiente" }).exito).toBe(false);
  });
});
