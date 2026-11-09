import { describe, expect, it } from "vitest";

import { vistaDeCarga } from "../app/(erp)/finanzas/ventas/programacion/_componentes/vista-carga";

describe("Programación · nueva: nunca una pantalla en blanco (CAR-221 B)", () => {
  it("lista y sin clientes muestran el formulario", () => {
    expect(vistaDeCarga("ready")).toBe("formulario");
    expect(vistaDeCarga("empty")).toBe("formulario");
  });
  it("sin permiso muestra «sin permiso» y cualquier otro estado, el error con reintento", () => {
    expect(vistaDeCarga("forbidden")).toBe("forbidden");
    expect(vistaDeCarga("error")).toBe("error");
    expect(vistaDeCarga("loading")).toBe("error");
    expect(vistaDeCarga("lo-que-sea")).toBe("error");
  });
});
