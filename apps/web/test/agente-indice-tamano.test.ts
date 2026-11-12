import { expect, it } from "vitest";

import { listarCapacidades } from "@opai/capabilities";

import { asegurarRegistro } from "../lib/registro";

asegurarRegistro();

// CAR-333: el agente envía en cada llamada el índice con el nombre de todas las herramientas
// (los esquemas se piden aparte). El turno tiene un tope de 128.000 tokens sumando hasta 12
// llamadas, y el índice de hoy ocupa unos 6.000 por llamada. Si el registro crece hasta que el
// índice solo se lleve cerca de 8.000 tokens por llamada (24.000 caracteres), hay que enviarlo por módulos o paginarlo antes
// de que el agente vuelva a quedarse sin presupuesto. Aviso a futuro, no prueba de regresión.
it("el índice de nombres del registro completo deja espacio al trabajo del turno", () => {
  const caracteres = listarCapacidades().reduce((n, c) => n + c.id.length + 2, 0);
  expect(caracteres).toBeLessThan(24_000);
});
