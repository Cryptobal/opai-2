import { beforeAll, describe, expect, it } from "vitest";

import { CAPACIDADES_V1_SESION_ERP } from "../../../apps/web/lib/api-v1-sesion";
import { modulos } from "../../../modules/registry/src";
import { capacidadesDelNucleo } from "../src/core";
import { limpiarModulos, registrarModulos } from "../src/module";
import { limpiarRegistro, listarCapacidades, obtenerCapacidad, registrarCapacidades } from "../src/registry";
import { inventario } from "./paridad-inventario";
import { SOLO_PERSONAS_SIN_PANTALLA } from "./paridad-sin-pantalla";

// Gate I-13 de la auditoría del Núcleo (CAR-52): una capacidad `soloPersonas` no tiene herramienta
// MCP, así que sin una pantalla que la invoque nadie puede ejecutarla en el producto. Antes el gate
// aceptaba cualquier excepción con motivo; ahora exige el camino humano o un encargo con fecha.
beforeAll(() => {
  limpiarRegistro();
  registrarCapacidades(capacidadesDelNucleo);
  limpiarModulos();
  registrarModulos(modulos);
});

const enPantalla = () => new Set(inventario().map((f) => f.capacidad));

describe("camino humano de las capacidades soloPersonas (CAR-52)", () => {
  it("toda soloPersonas la invoca una pantalla o figura sin pantalla con encargo y fecha", () => {
    const pantalla = enPantalla();
    const huerfanas = listarCapacidades()
      .filter((c) => c.soloPersonas && !pantalla.has(c.id) && !(c.id in SOLO_PERSONAS_SIN_PANTALLA))
      .map((c) => c.id);
    expect(
      huerfanas,
      "Construye la pantalla que la invoca o agrégala a paridad-sin-pantalla.ts con su encargo",
    ).toEqual([]);
  });

  it("la lista sin pantalla no tiene entradas obsoletas ni datos incompletos", () => {
    const pantalla = enPantalla();
    for (const [id, f] of Object.entries(SOLO_PERSONAS_SIN_PANTALLA)) {
      expect(obtenerCapacidad(id)?.soloPersonas, `${id} no es soloPersonas`).toBe(true);
      expect(pantalla.has(id), `${id} ya tiene pantalla: bórrala de la lista`).toBe(false);
      expect(f.encargo, id).toMatch(/^CAR-\d+$/);
      expect(f.desde, id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(f.motivo.length, `${id} sin motivo`).toBeGreaterThan(20);
    }
  });

  it("roles, matriz y excepciones tienen pantalla (CAR-37)", () => {
    const pantalla = enPantalla();
    for (const id of [
      "core.roles.create",
      "core.roles.update",
      "core.roles.archive",
      "core.roles.assign",
      "core.excepciones.set",
    ]) {
      expect(pantalla.has(id), id).toBe(true);
    }
  });

  it("/api/v1 con sesión solo fija el ERP a capacidades públicas del tenant con pantalla", () => {
    const pantalla = enPantalla();
    for (const id of CAPACIDADES_V1_SESION_ERP) {
      const c = obtenerCapacidad(id);
      expect(c, `${id} no existe`).toBeDefined();
      expect(c?.interna ?? false, `${id} es interna`).toBe(false);
      expect(c?.modulo, id).toBe("core");
      expect(c?.portales ?? ["erp"], id).toContain("erp");
      expect(pantalla.has(id), `${id} sin pantalla`).toBe(true);
    }
  });
});
