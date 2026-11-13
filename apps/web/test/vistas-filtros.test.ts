import { describe, expect, it } from "vitest";

import { filtrosDeUrl } from "@/app/_components/maestros/filtros-vista";

// CAR-335 D4c: una vista guarda los filtros de la lista, no la hoja abierta ni la página.
describe("filtros de una vista guardada", () => {
  it("conserva búsqueda y filtros y quita hojas y paginación", () => {
    expect(filtrosDeUrl("?estado=cliente_activo&q=andina&nueva=1&cursor=abc")).toBe(
      "?estado=cliente_activo&q=andina",
    );
    expect(filtrosDeUrl("?contacto=nuevo")).toBe("");
    expect(filtrosDeUrl("")).toBe("");
  });
});
