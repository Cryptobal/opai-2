import { beforeAll, describe, expect, it } from "vitest";

import { modulos } from "../../../modules/registry/src";
import { capacidadesDelNucleo } from "../src/core";
import { duplicadosAjustes } from "../src/core/config/duplicados-ajustes";
import { listarAjustes } from "../src/core/config/catalogo";
import { limpiarModulos, registrarModulos } from "../src/module";
import { limpiarRegistro, registrarCapacidades } from "../src/registry";

beforeAll(() => {
  limpiarRegistro();
  registrarCapacidades(capacidadesDelNucleo);
  limpiarModulos();
  registrarModulos(modulos);
});

describe("ajustes: una sola fuente por concepto (CAR-580)", () => {
  it("no hay claves ni etiquetas equivalentes repetidas entre módulos", () => {
    const { mismaClave, mismaEtiqueta } = duplicadosAjustes(listarAjustes());
    const msg: string[] = [];
    for (const { clave, modulos: mods } of mismaClave)
      msg.push(`clave «${clave}» en ${mods.join(", ")}`);
    for (const { etiqueta, ids } of mismaEtiqueta)
      msg.push(`etiqueta «${etiqueta}» en ${ids.join(", ")}`);
    expect(msg, msg.join("; ") || "sin duplicados").toEqual([]);
  });

  it("el catálogo declara ajustes de núcleo y de módulos", () => {
    const campos = listarAjustes();
    expect(campos.some((c) => c.modulo === "core")).toBe(true);
    expect(campos.some((c) => c.modulo === "comercial")).toBe(true);
    expect(campos.length).toBeGreaterThan(100);
  });
});