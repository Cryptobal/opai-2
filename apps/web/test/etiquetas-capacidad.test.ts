import { describe, expect, it } from "vitest";

import { listarCapacidades } from "../../../packages/capabilities/src/registry";
import { etiquetaCapacidad } from "../app/(erp)/configuracion/auditoria/_componentes/capacidad";
import { RECURSOS } from "../app/(erp)/configuracion/auditoria/_componentes/etiquetas-recursos";
import { VERBOS } from "../app/(erp)/configuracion/auditoria/_componentes/etiquetas-verbos";
import { asegurarRegistro } from "../lib/registro";

asegurarRegistro();

describe("etiquetas de capacidades en la auditoría (B6)", () => {
  it("todo recurso y verbo del registro tiene su etiqueta en español", () => {
    const ids = listarCapacidades().map((c) => c.id);
    const sinRecurso = new Set<string>();
    const sinVerbo = new Set<string>();
    for (const id of ids) {
      const [, recurso = "", ...verbo] = id.split(".");
      if (!(recurso in RECURSOS)) sinRecurso.add(recurso);
      if (verbo.length > 0 && !(verbo.join(".") in VERBOS)) sinVerbo.add(verbo.join("."));
    }
    expect([...sinRecurso]).toEqual([]);
    expect([...sinVerbo]).toEqual([]);
  });

  it("la etiqueta no deja ver guiones bajos ni códigos", () => {
    for (const { id } of listarCapacidades()) {
      const e = etiquetaCapacidad(id);
      expect(e, id).not.toMatch(/_|[a-z]\.[a-z]/);
    }
    expect(etiquetaCapacidad("finanzas.ventas.enviar_sii")).toBe("Ventas · Enviar al SII");
  });
});
