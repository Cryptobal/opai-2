import { describe, expect, it } from "vitest";
import { validarPlantillaCampos } from "@opai/domain";

describe("contrato de marcadores preview CPQ", () => {
  it("normaliza los aliases de bloques y separa la colección de sus campos", () => {
    const r = validarPlantillaCampos("{{tabla_servicio}}{{resumen_economico}}{{#cada puestos}}{{puesto.nombre}}{{puesto.cantidad}}{{/cada}}", "propuesta");
    expect(r.ok).toBe(true);
    expect(r.usados).toEqual(["bloque.tabla_servicio", "bloque.resumen_economico", "puesto.nombre", "puesto.cantidad"]);
    expect(r.colecciones).toEqual(["puestos"]);
  });
});
