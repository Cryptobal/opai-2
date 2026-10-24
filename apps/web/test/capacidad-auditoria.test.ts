import { describe, expect, it } from "vitest";

import { etiquetaCapacidad } from "@/app/(erp)/configuracion/auditoria/_componentes/capacidad";

describe("etiquetaCapacidad", () => {
  it("traduce el código técnico a lenguaje de usuario", () => {
    expect(etiquetaCapacidad("core.marca.update")).toBe("Marca · Editar");
    expect(etiquetaCapacidad("core.cuentas.create")).toBe("Cuentas · Crear");
  });
  it("humaniza lo desconocido y respeta lo que no es un código", () => {
    expect(etiquetaCapacidad("core.centro_costo.sync")).toBe("Centro costo · Sync");
    expect(etiquetaCapacidad("manual")).toBe("manual");
  });
});
