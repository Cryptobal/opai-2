import { describe, expect, it } from "vitest";

import { obtenerCapacidad } from "@opai/capabilities";

import { EXCEPCIONES_PARIDAD } from "../../../packages/capabilities/test/paridad-excepciones";
import {
  capacidadesSinHerramienta,
  llamadasAEjecutores,
} from "../../../packages/capabilities/test/paridad-util";
import { asegurarRegistro } from "../lib/registro";

// Gate de paridad sobre el registro COMPLETO del proceso (núcleo + módulos vendibles): cuando exista
// el primer módulo, sus capacidades también deben aparecer en tools/list (ADR-004, ADR-034 §4).
asegurarRegistro();

describe("paridad con el registro completo (núcleo + módulos)", () => {
  it("toda capacidad que no es de plataforma tiene herramienta MCP, salvo las excepciones", () => {
    expect(capacidadesSinHerramienta()).toEqual(Object.keys(EXCEPCIONES_PARIDAD).sort());
  });

  it("todo id literal que invoca la UI existe y no es interno (salvo el flujo de invitación)", () => {
    const problemas = llamadasAEjecutores().flatMap(({ archivo, ids }) =>
      ids.flatMap((id) => {
        const c = obtenerCapacidad(id);
        if (!c) return [`${archivo}: "${id}" no existe`];
        return c.interna && !archivo.startsWith("app/(auth)/invitacion/")
          ? [`${archivo}: "${id}" es interna`]
          : [];
      }),
    );
    expect(problemas).toEqual([]);
  });
});
