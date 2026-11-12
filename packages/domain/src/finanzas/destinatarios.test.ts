import { describe, expect, it } from "vitest";

import { agruparDestinatarios, destinatariosSugeridos, esCorreoValido, validarDestinatarios } from "./destinatarios";

const d = (tipo: "PARA" | "CC" | "BCC", email: string) => ({ tipo, email, origen: "manual" as const });

describe("destinatarios de un DTE de venta (CAR-221 · A3b)", () => {
  it("valida correos con formato razonable y rechaza lo que no es un correo", () => {
    expect(esCorreoValido(" Pagos@Cliente.CL ")).toBe(true);
    for (const malo of ["", "sin-arroba", "a@b", "a b@c.cl", "a@b.cl,c@d.cl", "a@@b.cl"]) expect(esCorreoValido(malo)).toBe(false);
  });
  it("exige entre 1 y 10 PARA, sin repetidos y con tope de 20 (ADR-100)", () => {
    expect(validarDestinatarios([])).toMatch(/al menos un destinatario/);
    expect(validarDestinatarios([d("CC", "a@x.cl")])).toMatch(/Falta el destinatario principal/);
    expect(validarDestinatarios([d("PARA", "a@x.cl"), d("PARA", "b@x.cl")])).toBeNull();
    const onceParas = Array.from({ length: 11 }, (_, i) => d("PARA", `p${i}@x.cl`));
    expect(validarDestinatarios(onceParas)).toMatch(/Máximo 10 destinatarios principales/);
    expect(validarDestinatarios([d("PARA", "a@x.cl"), d("BCC", "A@X.cl")])).toMatch(/repetido/);
    expect(validarDestinatarios([d("PARA", "nada")])).toMatch(/no es válido/);
    const muchos = Array.from({ length: 21 }, (_, i) => d(i === 0 ? "PARA" : "CC", `u${i}@x.cl`));
    expect(validarDestinatarios(muchos)).toMatch(/Máximo 20/);
    expect(validarDestinatarios([d("PARA", "a@x.cl"), d("CC", "b@x.cl"), d("BCC", "c@x.cl")])).toBeNull();
  });
  it("agrupa para el envío en minúsculas y conserva el orden de los PARA y las copias", () => {
    expect(agruparDestinatarios([d("CC", "B@x.cl"), d("PARA", "A@x.cl"), d("BCC", "c@x.cl"), d("CC", "d@x.cl"), d("PARA", "E@x.cl")])).toEqual({
      para: "a@x.cl",
      paraAdicionales: ["e@x.cl"],
      cc: ["b@x.cl", "d@x.cl"],
      bcc: ["c@x.cl"],
    });
  });
  it("sugiere los contactos de facturación como PARA y la casilla DTE en copia, sin repetir ni inventar (ADR-100)", () => {
    const s = destinatariosSugeridos({
      emailDte: "DTE@cliente.cl",
      contactosFacturacion: [{ email: "pagos@cliente.cl" }, { email: "dte@cliente.cl" }, { email: null }, { email: "roto" }, { email: "jefe@cliente.cl" }],
    });
    expect(s).toEqual([
      { tipo: "PARA", email: "pagos@cliente.cl", origen: "contacto_facturacion" },
      { tipo: "PARA", email: "dte@cliente.cl", origen: "contacto_facturacion" },
      { tipo: "PARA", email: "jefe@cliente.cl", origen: "contacto_facturacion" },
    ]);
    expect(destinatariosSugeridos({ emailDte: "dte@cliente.cl", contactosFacturacion: [{ email: "a@x.cl" }] })).toEqual([
      { tipo: "PARA", email: "a@x.cl", origen: "contacto_facturacion" },
      { tipo: "CC", email: "dte@cliente.cl", origen: "casilla_dte" },
    ]);
  });
  it("sin contactos, la casilla DTE pasa a PARA; más de 10 contactos, el resto en copia; sin nada, no sugiere", () => {
    expect(destinatariosSugeridos({ emailDte: "dte@x.cl", contactosFacturacion: [] })).toEqual([
      { tipo: "PARA", email: "dte@x.cl", origen: "casilla_dte" },
    ]);
    const doce = destinatariosSugeridos({ emailDte: null, contactosFacturacion: Array.from({ length: 12 }, (_, i) => ({ email: `c${i}@x.cl` })) });
    expect(doce.filter((x) => x.tipo === "PARA")).toHaveLength(10);
    expect(doce.filter((x) => x.tipo === "CC")).toHaveLength(2);
    expect(destinatariosSugeridos({ emailDte: null, contactosFacturacion: [] })).toEqual([]);
  });
});
