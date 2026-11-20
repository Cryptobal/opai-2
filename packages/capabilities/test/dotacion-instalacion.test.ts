// CAR-596: contrato de pauta.dotacion.get (sin base de datos).
import { describe, expect, it } from "vitest";

import { dotacionInstalacionGet } from "../src/pauta/dotacion-instalacion";

const inst = "0198f2a0-0000-7000-8000-000000000010";

describe("pauta.dotacion.get · contrato", () => {
  it("es lectura con permiso pauta:read", () => {
    expect(dotacionInstalacionGet.permiso).toBe("pauta:read");
    expect(dotacionInstalacionGet.efecto).toBe("lectura");
    expect(dotacionInstalacionGet.dryRun).toBe(false);
    expect(dotacionInstalacionGet.descripcion.length).toBeGreaterThanOrEqual(40);
  });

  it("valida instalación y mes", () => {
    expect(dotacionInstalacionGet.input.safeParse({ instalacionId: inst, anio: 2026, mes: 11 }).success).toBe(
      true,
    );
    expect(dotacionInstalacionGet.input.safeParse({ instalacionId: "x", anio: 2026, mes: 11 }).success).toBe(
      false,
    );
    expect(dotacionInstalacionGet.input.safeParse({ instalacionId: inst, anio: 2026, mes: 13 }).success).toBe(
      false,
    );
  });
});