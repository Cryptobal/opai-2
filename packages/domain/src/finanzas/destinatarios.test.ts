import { describe, expect, it } from "vitest";

import { agruparDestinatarios, destinatariosSugeridos, esCorreoValido, validarDestinatarios } from "./destinatarios";

const d = (tipo: "PARA" | "CC" | "BCC", email: string) => ({ tipo, email, origen: "manual" as const });

describe("destinatarios de un DTE de venta (CAR-221 · A3b)", () => {
  it("valida correos con formato razonable y rechaza lo que no es un correo", () => {
    expect(esCorreoValido(" Pagos@Cliente.CL ")).toBe(true);
    for (const malo of ["", "sin-arroba", "a@b", "a b@c.cl", "a@b.cl,c@d.cl", "a@@b.cl"]) expect(esCorreoValido(malo)).toBe(false);
  });
  it("exige exactamente un PARA, sin repetidos y con tope de 20", () => {
    expect(validarDestinatarios([])).toMatch(/al menos un destinatario/);
    expect(validarDestinatarios([d("CC", "a@x.cl")])).toMatch(/Falta el destinatario principal/);
    expect(validarDestinatarios([d("PARA", "a@x.cl"), d("PARA", "b@x.cl")])).toMatch(/Solo puede haber un destinatario PARA/);
    expect(validarDestinatarios([d("PARA", "a@x.cl"), d("BCC", "A@X.cl")])).toMatch(/repetido/);
    expect(validarDestinatarios([d("PARA", "nada")])).toMatch(/no es válido/);
    const muchos = Array.from({ length: 21 }, (_, i) => d(i === 0 ? "PARA" : "CC", `u${i}@x.cl`));
    expect(validarDestinatarios(muchos)).toMatch(/Máximo 20/);
    expect(validarDestinatarios([d("PARA", "a@x.cl"), d("CC", "b@x.cl"), d("BCC", "c@x.cl")])).toBeNull();
  });
  it("agrupa para el envío en minúsculas y conserva el orden de las copias", () => {
    expect(agruparDestinatarios([d("CC", "B@x.cl"), d("PARA", "A@x.cl"), d("BCC", "c@x.cl"), d("CC", "d@x.cl")])).toEqual({
      para: "a@x.cl",
      cc: ["b@x.cl", "d@x.cl"],
      bcc: ["c@x.cl"],
    });
  });
  it("sugiere la casilla DTE como PARA y los contactos de facturación en copia, sin repetir ni inventar", () => {
    const s = destinatariosSugeridos({
      emailDte: "DTE@cliente.cl",
      contactosFacturacion: [{ email: "dte@cliente.cl" }, { email: "pagos@cliente.cl" }, { email: null }, { email: "roto" }],
    });
    expect(s).toEqual([
      { tipo: "PARA", email: "dte@cliente.cl", origen: "casilla_dte" },
      { tipo: "CC", email: "pagos@cliente.cl", origen: "contacto_facturacion" },
    ]);
  });
  it("sin casilla DTE, el primer contacto de facturación pasa a PARA; sin nada, no sugiere", () => {
    expect(destinatariosSugeridos({ emailDte: null, contactosFacturacion: [{ email: "a@x.cl" }, { email: "b@x.cl" }] })).toEqual([
      { tipo: "PARA", email: "a@x.cl", origen: "contacto_facturacion" },
      { tipo: "CC", email: "b@x.cl", origen: "contacto_facturacion" },
    ]);
    expect(destinatariosSugeridos({ emailDte: null, contactosFacturacion: [] })).toEqual([]);
  });
});
