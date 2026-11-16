// CAR-96: contrato de capacidades de turnos extra (sin base de datos).
import { describe, expect, it } from "vitest";

import { turnosExtraAprobar } from "../src/pauta/turnos-extra-aprobar";
import { turnosExtraListar } from "../src/pauta/turnos-extra-listar";
import { turnosExtraMontoFijar } from "../src/pauta/turnos-extra-monto";
import { turnosExtraRechazar } from "../src/pauta/turnos-extra-rechazar";
import { turnosExtraRegistrar } from "../src/pauta/turnos-extra-registrar";
import { reemplazosAsignar } from "../src/pauta/reemplazos-asignar";
import { refuerzosAgregar } from "../src/pauta/refuerzos-agregar";

const id = "0198f2a0-0000-7000-8000-000000000001";

describe("pauta.turnos_extra · contrato", () => {
  it("registrar y listar usan pauta:write / pauta:read con dryRun en escritura", () => {
    expect(turnosExtraRegistrar.permiso).toBe("pauta:write");
    expect(turnosExtraRegistrar.efecto).toBe("escritura");
    expect(turnosExtraRegistrar.dryRun).toBe(true);
    expect(turnosExtraListar.permiso).toBe("pauta:read");
    expect(turnosExtraListar.efecto).toBe("lectura");
    expect(turnosExtraListar.auditarLectura).toBeTypeOf("function");
  });

  it("aprobar y rechazar exigen pauta:aprobar_extra y son irreversibles", () => {
    expect(turnosExtraAprobar.permiso).toBe("pauta:aprobar_extra");
    expect(turnosExtraRechazar.permiso).toBe("pauta:aprobar_extra");
    expect(turnosExtraAprobar.efecto).toBe("irreversible");
    expect(turnosExtraRechazar.efecto).toBe("irreversible");
    expect(turnosExtraAprobar.dryRun).toBe(true);
    expect(turnosExtraRechazar.input.safeParse({ id, motivo: "no" }).success).toBe(false);
    expect(turnosExtraRechazar.input.safeParse({ id, motivo: "Fuera de presupuesto" }).success).toBe(true);
  });

  it("monto_fijar acepta instalación o puesto con CLP entero", () => {
    expect(turnosExtraMontoFijar.permiso).toBe("pauta:write");
    expect(
      turnosExtraMontoFijar.input.safeParse({ sujetoTipo: "instalacion", sujetoId: id, montoClp: 35_000 })
        .success,
    ).toBe(true);
    expect(
      turnosExtraMontoFijar.input.safeParse({ sujetoTipo: "puesto", sujetoId: id, montoClp: -1 }).success,
    ).toBe(false);
  });

  it("reemplazo y refuerzo declaran tipoTrabajador y dejan turno extra", () => {
    expect(reemplazosAsignar.output.safeParse({
      puestoId: id,
      fecha: "2026-11-15",
      personaId: id,
      variante: "refuerzo_extra",
      turnoExtraId: id,
    }).success).toBe(true);
    expect(refuerzosAgregar.input.safeParse({
      puestoId: id,
      fecha: "2026-11-15",
      personaId: id,
      motivo: "Evento del cliente",
      tipoTrabajador: "externo",
    }).success).toBe(true);
  });
});
