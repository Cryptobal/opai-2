import { expect, it } from "vitest";

import { listarCapacidades } from "@opai/capabilities";

import { asegurarRegistro } from "../lib/registro";

asegurarRegistro();

// CAR-333 / CAR-543: el agente lleva en el mensaje de sistema un índice corto por módulo; los nombres
// de herramientas se piden con listar-modulo. El turno tiene tope de 128.000 tokens (~24.000 caracteres
// del índice por llamada en el historial); este tope no sube: si el índice modular se acerca, conviene
// paginar módulos o acortar nombres antes de que falte presupuesto.
it("el índice modular del registro deja espacio al trabajo del turno", () => {
  const porModulo = new Map<string, number>();
  for (const c of listarCapacidades()) {
    if (c.modulo === "platform" || c.modulo === "agente") continue;
    porModulo.set(c.modulo, (porModulo.get(c.modulo) ?? 0) + 1);
  }
  const caracteres = [...porModulo.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([modulo, n]) => `${modulo} (${n})`)
    .join("\n").length;
  expect(caracteres).toBeLessThan(24_000);
});