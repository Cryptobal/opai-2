import { describe, expect, it } from "vitest";

import { listarAjustes } from "../src/core/config/catalogo";

/** Notas de implementación que no deben llegar a la ayuda ni a la etiqueta del centro de Configuración. */
const PROHIBIDO = /TODO\s*\(|decisión de Carlos|\bPR\s*\d|pendiente calibrar|\(R\d+\)/i;

describe("ajustes · textos visibles", () => {
  it("etiqueta y ayuda sin notas editoriales internas", () => {
    for (const { modulo, clave, meta } of listarAjustes()) {
      for (const texto of [meta.etiqueta, meta.ayuda ?? ""]) {
        expect(texto, `${modulo}.${clave}`).not.toMatch(PROHIBIDO);
      }
    }
  });
});