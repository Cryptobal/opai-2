// CAR-323 (bloque C): todo módulo vendible del registro tiene su entrada en el catálogo comercial, para
// que Plataforma pueda fijarle precio y la empresa pueda probarlo. Faltaba Control de acceso.
import { describe, expect, it } from "vitest";

import { entradaCatalogo } from "@opai/domain";
import { modulos } from "@opai/modules";

describe("catálogo comercial ↔ registro de módulos", () => {
  it("cada módulo del registro tiene entrada en el catálogo", () => {
    const sinEntrada = modulos.map((m) => m.id).filter((id) => !entradaCatalogo(id));
    expect(sinEntrada).toEqual([]);
  });

  it("Control de acceso se cobra por instalación activa", () => {
    expect(entradaCatalogo("acceso")).toMatchObject({
      nombre: "Control de acceso",
      formaSugerida: "por_unidad",
      unidadSugerida: "instalacion_activa",
    });
  });
});
