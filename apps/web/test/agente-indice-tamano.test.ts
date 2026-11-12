import { expect, it } from "vitest";

import { listarCapacidades } from "@opai/capabilities";

import { asegurarRegistro } from "../lib/registro";

asegurarRegistro();

// CAR-333: el agente envía en cada llamada el índice de nombres del registro completo. Si el
// registro crece hasta que el índice solo ya no cabe con holgura en el tope del turno (128.000
// tokens, hasta 12 llamadas), hay que agruparlo o paginarlo antes de que el agente deje de responder.
it("el índice de nombres del registro completo cabe con holgura en cada llamada del agente", () => {
  const caracteres = listarCapacidades().reduce((n, c) => n + c.id.length + 2, 0);
  expect(Math.ceil(caracteres / 3)).toBeLessThan(8_000);
});
