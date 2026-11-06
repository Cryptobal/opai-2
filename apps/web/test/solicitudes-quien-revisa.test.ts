import { describe, expect, it } from "vitest";

import { quienRevisa } from "@/app/(erp)/solicitudes/_componentes/etiquetas";

describe("quién revisa una solicitud (CAR-211)", () => {
  it("en revisión: nombre del responsable, o «Sin responsable»", () => {
    expect(quienRevisa({ estado: "en_revision", responsableNombre: "Ana Prueba" })).toBe("Revisa: Ana Prueba");
    expect(quienRevisa({ estado: "en_revision", responsableNombre: null })).toBe("Sin responsable");
    expect(quienRevisa({ estado: "en_revision" })).toBe("Sin responsable");
  });
  it("en los demás estados no se dice nada", () => {
    for (const estado of ["nueva", "convertida", "descartada"])
      expect(quienRevisa({ estado, responsableNombre: "Ana Prueba" })).toBeNull();
  });
});
