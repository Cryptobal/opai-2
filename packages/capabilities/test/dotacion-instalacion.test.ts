// CAR-596: contrato de pauta.dotacion.listar (sin base de datos).
import { describe, expect, it } from "vitest";

import { dotacionInstalacionListar } from "../src/pauta/dotacion-instalacion";

const inst = "0198f2a0-0000-7000-8000-000000000010";

describe("pauta.dotacion.listar · contrato", () => {
  it("es lectura con permiso pauta:read", () => {
    expect(dotacionInstalacionListar.permiso).toBe("pauta:read");
    expect(dotacionInstalacionListar.efecto).toBe("lectura");
    expect(dotacionInstalacionListar.dryRun).toBe(false);
    expect(dotacionInstalacionListar.descripcion.length).toBeGreaterThanOrEqual(40);
  });

  it("valida instalación y mes", () => {
    expect(dotacionInstalacionListar.input.safeParse({ instalacionId: inst, anio: 2026, mes: 11 }).success).toBe(
      true,
    );
    expect(dotacionInstalacionListar.input.safeParse({ instalacionId: "x", anio: 2026, mes: 11 }).success).toBe(
      false,
    );
    expect(dotacionInstalacionListar.input.safeParse({ instalacionId: inst, anio: 2026, mes: 13 }).success).toBe(
      false,
    );
  });
});