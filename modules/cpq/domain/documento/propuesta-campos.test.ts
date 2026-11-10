import { describe, expect, it } from "vitest";

import {
  aplicarContratoABloques,
  aplicarContratoATexto,
  contratoCamposDeEnvio,
  snapshotParaLectura,
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
  it("reúne solo lo que sale en el PDF: bloques activos y el texto manual manda sobre la biblioteca", () => {
    const b = (o: object) => ({ activo: true, fijo: false, opcional: true, ...o });
    const bloques = JSON.stringify([
      b({ id: "a", tipo: "texto_libre", contenidoOverride: "Hola {{cuenta.nombre}}" }),
      b({ id: "b", tipo: "condiciones", bibliotecaClave: "x", contenidoOverride: "Manual" }),
      b({ id: "c", tipo: "metodologia", bibliotecaClave: "y" }),
      b({
        id: "d",
        tipo: "texto_libre",
        activo: false,
        contenidoOverride: "Apagado {{cuenta.giro}}",
      }),
      b({ id: "e", tipo: "portada" }),
    ]);
    expect(
      textosConTokens(bloques, { x: "Biblioteca X", y: "Biblioteca Y", z: "Sin usar" }),
    ).toEqual(["Hola {{cuenta.nombre}}", "Manual", "Biblioteca Y"]);
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
      [],
      valores,
    );
    expect(c.versionCatalogo).toBe(2);
    expect(c.faltantes).toEqual(["cuenta.giro"]);
    expect(c.valores.campos).toEqual({ "cuenta.nombre": "Cliente Ficticio SpA" });
  });

  it("aplica los valores congelados a textos y a las ediciones manuales", () => {
    const c = contratoCamposDeEnvio(
      [],
      ["cuenta.nombre", "instalacion.nombre"],
      ["instalaciones"],
      valores,
    );
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

  it("congela solo las claves usadas, sin instalaciones si no hay repetición", () => {
    const grande = {
      campos: { "cuenta.nombre": "Cliente Ficticio SpA", "cuenta.giro": "Logística" },
      colecciones: {
        instalaciones: [
          { "instalacion.nombre": "Planta Norte", "instalacion.direccion": "Calle 1" },
        ],
      },
    };
    const sin = contratoCamposDeEnvio(["{{cuenta.nombre}}"], ["cuenta.nombre"], [], grande);
    expect(sin.valores).toEqual({
      campos: { "cuenta.nombre": "Cliente Ficticio SpA" },
      colecciones: { instalaciones: [], referencias: [] },
    });
    const con = contratoCamposDeEnvio(
      ["{{#cada instalaciones}}{{instalacion.nombre}}{{/cada}}"],
      ["instalacion.nombre"],
      ["instalaciones"],
      grande,
    );
    expect(con.valores.colecciones.instalaciones).toEqual([
      { "instalacion.nombre": "Planta Norte" },
    ]);
  });

  it("el historial no devuelve los valores resueltos, solo versión, claves y faltantes", () => {
    const c = contratoCamposDeEnvio(["{{cuenta.nombre}}"], ["cuenta.nombre"], [], valores);
    const json = JSON.stringify({ destinatarios: [], camposContrato: c });
    const leido = JSON.parse(snapshotParaLectura(json));
    expect(leido.camposContrato.valores).toEqual({
      campos: {},
      colecciones: { instalaciones: [], referencias: [] },
    });
    expect(leido.camposContrato.usados).toEqual(["cuenta.nombre"]);
    expect(snapshotParaLectura('{"destinatarios":[]}')).toBe('{"destinatarios":[]}');
    expect(snapshotParaLectura("no es json")).toBe("no es json");
  });

  it("sin contrato deja los textos intactos", () => {
    expect(aplicarContratoATexto("{{cuenta.nombre}}", undefined)).toBe("{{cuenta.nombre}}");
  });
});
