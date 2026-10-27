import { describe, expect, it } from "vitest";

import { listarCapacidades } from "@opai/capabilities";

import { asegurarRegistro } from "../lib/registro";

asegurarRegistro();

describe("declaración de auditoría del registro completo", () => {
  it("ninguna lectura nueva puede omitir auditarLectura sin revisar la lista cerrada", () => {
    // Lista cerrada: contratos de identidad/plataforma, catálogos y auditoría salarial propia.
    // No regenerar para aceptar nuevas lecturas de datos personales: deben declarar la proyección.
    expect(
      listarCapacidades()
        .filter((c) => c.efecto === "lectura" && c.auditarLectura === undefined)
        .map((c) => c.id)
        .sort(),
    ).toMatchSnapshot();
    for (const c of listarCapacidades().filter((c) => c.efecto === "lectura")) {
      if (c.auditarLectura === false)
        expect(["core.notificaciones.list", "core.inicio.pendientes"]).toContain(c.id);
    }
  });
});
