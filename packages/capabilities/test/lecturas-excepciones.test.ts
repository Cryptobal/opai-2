import { describe, expect, it } from "vitest";

import { capacidadesDelNucleo } from "../src/core";
import { defineCapability } from "../src/define";
import { casosLecturas, type FixtureLecturas } from "./lecturas-sensibles-fixture";

describe("excepciones declarativas de lectura (#76, ADR-045)", () => {
  it("solo las tres excepciones explícitas desactivan auditoría", () => {
    expect(
      capacidadesDelNucleo
        .filter((c) => c.auditarLectura === false)
        .map((c) => c.id)
        .sort(),
    ).toEqual(["core.buscar", "core.inicio.pendientes", "core.notificaciones.list"]);
  });

  it("no permite desactivarla en ninguna capacidad personal/documental del inventario", () => {
    // Solo se necesitan los nombres del inventario, no valores de una fixture de BD.
    const ids = casosLecturas({} as FixtureLecturas).map(([id]) => id);
    ids.push("core.cumplimiento.solicitudes_listar", "core.cumplimiento.solicitud_obtener");
    for (const id of ids) {
      const c = capacidadesDelNucleo.find((c) => c.id === id);
      expect(c, id).toBeDefined();
      expect(typeof c?.auditarLectura, id).toBe("function");
      expect(() => defineCapability({ ...c!, auditarLectura: false }), id).toThrow(/no permite/);
    }
  });
});
