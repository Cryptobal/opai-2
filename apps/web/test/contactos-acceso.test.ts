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
  it("con cuenta inactiva igual puede dar acceso en modo historial", () => {
    const v = vistaEstado({ estado: "sin_acceso" }, { cuentaInactiva: true });
    expect(v.darAcceso).toBe(true);
    expect(v.nota).toMatch(/historial/);
  });
  it("explica el motivo de «No disponible»", () => {
    expect(vistaEstado({ estado: "no_disponible", motivo: "usuario_interno" }).nota).toMatch(/interno/);
    expect(vistaEstado({ estado: "no_disponible", motivo: "vinculado_a_otra_cuenta" }).nota).toMatch(/otra cuenta/);
  });
  it("con la cuenta inactiva un acceso activo se ve en solo historial", () => {
    const v = vistaEstado({ estado: "activo" }, { cuentaInactiva: true });
    expect(v.etiqueta).toMatch(/historial/i);
    expect(v.suspender).toBe(false);
  });
  it("en prospecto recuerda el alcance limitado", () => {
    expect(vistaEstado({ estado: "activo" }, { esProspecto: true }).nota).toMatch(/propuesta/);
  });
  it("solo anuncia «Invitación enviada» si se envió una invitación", () => {
    expect(mensajeDarAcceso({ estado: "invitado" })).toEqual({ exito: true, texto: "Invitación enviada" });
    expect(mensajeDarAcceso({ estado: "vinculado" }).texto).toMatch(/no se envió invitación/);
    expect(mensajeDarAcceso({ estado: "no_aplica", motivo: "usuario interno" })).toMatchObject({ exito: false, texto: expect.stringContaining("usuario interno") });
    expect(mensajeDarAcceso({ estado: "invitacion_pendiente" }).exito).toBe(false);
  });
});
