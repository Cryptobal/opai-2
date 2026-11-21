// CAR-802 · alcance «historial» y bloqueo de operaciones en vivo (sin Postgres).
import { describe, expect, it } from "vitest";

import { exigirPortalOperativo, type AccesoResuelto } from "../src/portal-cliente/comun";

describe("portal cliente · modo historial", () => {
  it("exigirPortalOperativo niega resumen y escrituras en historial", () => {
    expect(() => exigirPortalOperativo("historial" satisfies AccesoResuelto["alcance"])).toThrow(/inactiva/i);
    expect(() => exigirPortalOperativo("completo")).not.toThrow();
    expect(() => exigirPortalOperativo("limitado")).not.toThrow();
  });
});