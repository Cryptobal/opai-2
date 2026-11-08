import { describe, expect, it } from "vitest";

import {
  aplicarContratoABloques,
  aplicarContratoATexto,
  contratoCamposDeEnvio,
  textosConTokens,
  validarTextosPropuesta,
} from "./propuesta-campos";

const valores = {
  campos: { "cuenta.nombre": "Cliente Ficticio SpA" },
  colecciones: {
    instalaciones: [
      { "instalacion.nombre": "Planta Norte" },
      { "instalacion.nombre": "Planta Sur" },
    ],
  },
};

describe("tokens de la propuesta", () => {
  it("reúne ediciones manuales y bloques de biblioteca", () => {
    const bloques = JSON.stringify([
      {
        id: "a",
        tipo: "texto_libre",
        activo: true,
        fijo: false,
        opcional: true,
        contenidoOverride: "Hola {{cuenta.nombre}}",
      },
      { id: "b", tipo: "portada", activo: true, fijo: true, opcional: false },
    ]);
    expect(textosConTokens(bloques, { x: "Otro texto" })).toEqual([
      "Hola {{cuenta.nombre}}",
      "Otro texto",
    ]);
  });

  it("rechaza tokens desconocidos y los de contrato (RUT, persona) en una propuesta", () => {
    const r = validarTextosPropuesta([
      "{{cuenta.inventado}}",
      "RUT {{cuenta.rut}}",
      "{{persona.rut}}",
    ]);
    expect(r.problemas.map((p) => p.codigo)).toEqual([
      "token_desconocido",
      "no_autorizado",
      "no_autorizado",
    ]);
  });

  it("acepta los campos permitidos y devuelve las claves usadas sin repetir", () => {
    const r = validarTextosPropuesta([
      "{{cuenta.nombre}}",
      "{{cuenta.nombre}} {{#cada instalaciones}}{{instalacion.nombre}}{{/cada}}",
    ]);
    expect(r.problemas).toEqual([]);
    expect(r.usados.sort()).toEqual(["cuenta.nombre", "instalacion.nombre"]);
    expect(r.colecciones).toEqual(["instalaciones"]);
  });

  it("congela versión, claves y valores; informa faltantes sin inventarlos", () => {
    const c = contratoCamposDeEnvio(
      ["{{cuenta.nombre}} {{cuenta.giro}}"],
      ["cuenta.nombre", "cuenta.giro"],
      valores,
    );
    expect(c.versionCatalogo).toBe(1);
    expect(c.faltantes).toEqual(["cuenta.giro"]);
    expect(c.valores).toBe(valores);
  });

  it("aplica los valores congelados a textos y a las ediciones manuales", () => {
    const c = contratoCamposDeEnvio([], [], valores);
    expect(
      aplicarContratoATexto(
        "Para {{cuenta.nombre}}: {{#cada instalaciones}}[{{instalacion.nombre}}]{{/cada}}",
        c,
      ),
    ).toBe("Para Cliente Ficticio SpA: [Planta Norte][Planta Sur]");
    const json = JSON.stringify([
      {
        id: "a",
        tipo: "texto_libre",
        activo: true,
        fijo: false,
        opcional: true,
        contenidoOverride: "{{cuenta.nombre}}",
      },
    ]);
    expect(JSON.parse(aplicarContratoABloques(json, c))[0].contenidoOverride).toBe(
      "Cliente Ficticio SpA",
    );
  });

  it("sin contrato deja los textos intactos", () => {
    expect(aplicarContratoATexto("{{cuenta.nombre}}", undefined)).toBe("{{cuenta.nombre}}");
  });
});
