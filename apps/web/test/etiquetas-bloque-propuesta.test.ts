import { describe, expect, it } from "vitest";

import { TIPOS_BLOQUE_PROPUESTA } from "../../../modules/cpq/domain/documento/propuesta-tecnica";
import {
  TIPOS_BLOQUE_ETIQUETADOS,
  conTextoAceptado,
  esSeccionDeTexto,
  etiquetaBloquePropuesta,
  fijarBloque,
  moverBloque,
  tiposDisponibles,
} from "../lib/cpq-bloques-propuesta";

describe("etiquetaBloquePropuesta (CAR-229)", () => {
  it("da un nombre legible a todos los tipos de bloque", () => {
    for (const t of TIPOS_BLOQUE_PROPUESTA) expect(etiquetaBloquePropuesta(t)).not.toBe(t);
  });
  it("el gestor de bloques ofrece exactamente los tipos del catálogo", () => {
    expect(TIPOS_BLOQUE_ETIQUETADOS).toEqual([...TIPOS_BLOQUE_PROPUESTA]);
  });
});

describe("gestor de bloques de la propuesta (CAR-530)", () => {
  const b = (tipo: string, fijo = false) => ({ tipo, activo: true, fijo, opcional: !fijo });
  it("sube y baja un bloque sin salirse de la lista", () => {
    const l = [b("portada"), b("indice"), b("condiciones")];
    expect(moverBloque(l, 1, -1).map((x) => x.tipo)).toEqual(["indice", "portada", "condiciones"]);
    expect(moverBloque(l, 2, 1)).toEqual(l);
  });
  it("un bloque fijo queda activo y deja de ser opcional", () => {
    expect(fijarBloque({ ...b("indice"), activo: false }, true)).toMatchObject({ fijo: true, opcional: false, activo: true });
    expect(fijarBloque(b("indice", true), false)).toMatchObject({ fijo: false, opcional: true });
  });
  it("solo ofrece agregar los tipos que faltan", () => {
    const faltan = tiposDisponibles([b("portada")]);
    expect(faltan).not.toContain("portada");
    expect(faltan).toHaveLength(TIPOS_BLOQUE_PROPUESTA.length - 1);
  });
  it("prefiere el título propio y cae al tipo desconocido", () => {
    expect(etiquetaBloquePropuesta("texto_libre", " Alcance ")).toBe("Alcance");
    expect(etiquetaBloquePropuesta("nuevo")).toBe("nuevo");
  });
});

describe("IA por sección (CAR-534)", () => {
  const bloques = [
    { id: "a", tipo: "texto_libre", activo: true, contenidoOverride: "manual" },
    { id: "b", tipo: "metodologia", activo: true },
  ];
  it("aceptar un borrador cambia solo la sección elegida", () => {
    const r = conTextoAceptado(bloques, "b", "borrador");
    expect(r[1]?.contenidoOverride).toBe("borrador");
    expect(r[0]).toBe(bloques[0]);
  });
  it("las secciones sin texto propio no ofrecen IA", () => {
    expect(esSeccionDeTexto("portada")).toBe(false);
    expect(esSeccionDeTexto("metodologia")).toBe(true);
  });
});
