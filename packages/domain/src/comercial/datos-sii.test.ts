import { describe, expect, it } from "vitest";

import { compararConSii, listaParaFacturar, mismoTexto, textoFaltan } from "./datos-sii";

describe("datos del SII de una cuenta", () => {
  it("compara sin mayúsculas ni tildes y marca igual, distinto y vacíos", () => {
    const r = compararConSii(
      { razonSocial: "Clínica Los Leones S.A.", giro: "Servicios de salud", calle: null },
      { razonSocial: "CLINICA LOS LEONES S.A.", giro: "Hospitales", calle: "Av. Providencia 2330" },
    );
    const por = Object.fromEntries(r.map((c) => [c.campo, c.estado]));
    expect(por).toMatchObject({
      razonSocial: "igual",
      giro: "distinto",
      calle: "vacio_ficha",
      comuna: "vacio_sii",
    });
    expect(mismoTexto("  Ñuñoa ", "ÑUÑOA")).toBe(true);
  });

  it("lista para facturar dice qué falta", () => {
    const base = {
      rut: "76543210-4",
      razonSocial: "Atlas SpA",
      giro: null,
      calle: null,
      comuna: "Santiago",
      emailDte: null,
      contactosFacturacion: 1,
    };
    const r = listaParaFacturar(base);
    expect(r.lista).toBe(false);
    expect(r.faltan).toEqual(["rut", "giro", "calle"]);
    expect(textoFaltan(["giro", "calle"])).toBe(
      "Faltan 2 datos para facturar: giro y dirección tributaria",
    );
    expect(textoFaltan(["giro"])).toBe("Falta 1 dato para facturar: giro");
    const ok = listaParaFacturar({
      ...base,
      rut: "76.418.552-8",
      giro: "Seguridad",
      calle: "Av. Uno 1",
    });
    expect(ok).toEqual({ lista: true, faltan: [] });
    expect(
      listaParaFacturar({ ...base, contactosFacturacion: 0, emailDte: null }).faltan,
    ).toContain("destinatario");
  });
});
