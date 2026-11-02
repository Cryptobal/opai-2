import { describe, expect, it } from "vitest";

import {
  esCafMarcadoSintetico,
  folioActualInicialCaf,
  formatearLecturaCaf,
  leerCafXml,
  mensajeAvisoFoliosSinUsarPorVencer,
  rangosCafSeSolapan,
  validarCaf,
  vencimientoCafDesdeFa,
} from "./caf";

const xmlBase = (opts: {
  re?: string;
  td?: number;
  d?: number;
  h?: number;
  fa?: string;
  idk?: string;
  corrupto?: boolean;
}) => {
  if (opts.corrupto) return "<CAF><sin-cerrar";
  const re = opts.re ?? "76111222-8";
  const td = opts.td ?? 33;
  const d = opts.d ?? 1851;
  const h = opts.h ?? 2050;
  const fa = opts.fa ?? "2026-06-15";
  const idk = opts.idk ?? "CERT-SINTETICO-OPAI2-TEST";
  return `<?xml version="1.0"?>
<AUTORIZACION>
  <CAF version="1.0">
    <DA>
      <RE>${re}</RE>
      <RS>Emisor ficticio SpA</RS>
      <TD>${td}</TD>
      <RNG><D>${d}</D><H>${h}</H></RNG>
      <FA>${fa}</FA>
      <IDK>${idk}</IDK>
    </DA>
    <FRMA algoritmo="SHA1withRSA">c2luZ3R1cmE=</FRMA>
  </CAF>
</AUTORIZACION>`;
};

describe("leerCafXml", () => {
  it("lee un CAF válido sintético", () => {
    const l = leerCafXml(xmlBase({}));
    expect(l).toMatchObject({
      rutEmisor: "76111222-8",
      tipoDte: 33,
      folioDesde: 1851,
      folioHasta: 2050,
      autorizadoEn: "2026-06-15",
      idk: "CERT-SINTETICO-OPAI2-TEST",
      venceEn: "2026-12-15",
    });
  });

  it("tipo 34 sin vencimiento", () => {
    const l = leerCafXml(xmlBase({ td: 34 }));
    expect(l?.venceEn).toBeNull();
  });

  it("rechaza XML corrupto", () => {
    expect(leerCafXml(xmlBase({ corrupto: true }))).toBeNull();
  });
});

describe("validarCaf", () => {
  const base = {
    xml: xmlBase({}),
    rutEmisorEsperado: "76111222-8",
    hoyIso: "2026-01-01",
    rangosCargados: [] as { folioDesde: number; folioHasta: number }[],
  };

  it("falla si RUT distinto", () => {
    const r = validarCaf({ ...base, rutEmisorEsperado: "77234567-8" });
    expect(r).toEqual({ ok: false, error: "rut_distinto" });
  });

  it("falla si hay solape", () => {
    const r = validarCaf({
      ...base,
      rangosCargados: [{ folioDesde: 2000, folioHasta: 2100 }],
    });
    expect(r).toEqual({ ok: false, error: "solape" });
  });

  it("falla si vencido", () => {
    const r = validarCaf({
      ...base,
      xml: xmlBase({ fa: "2020-01-01" }),
      hoyIso: "2026-11-01",
    });
    expect(r).toEqual({ ok: false, error: "vencido" });
  });
});

describe("utilidades CAF", () => {
  it("detecta solape de rangos", () => {
    expect(rangosCafSeSolapan(1, 10, 10, 20)).toBe(true);
    expect(rangosCafSeSolapan(1, 9, 10, 20)).toBe(false);
  });

  it("vencimiento FA + 6 meses", () => {
    expect(vencimientoCafDesdeFa("2026-01-31", 33)).toBe("2026-07-31");
    expect(vencimientoCafDesdeFa("2026-08-31", 33)).toBe("2027-02-28");
  });

  it("formatea lectura para dryRun", () => {
    const l = leerCafXml(xmlBase({}))!;
    expect(formatearLecturaCaf(l)).toBe(
      "CAF 33 · 1851–2050 · autorizado 15-06-2026 · vence 15-12-2026 · RUT coincide",
    );
  });

  it("marca CAF sintético por RUT reservado o IDK exacto OPAI2", () => {
    expect(esCafMarcadoSintetico(leerCafXml(xmlBase({}))!)).toBe(true);
    expect(
      esCafMarcadoSintetico(
        leerCafXml(xmlBase({ idk: "CERT-SINTETICO-OPAI2-TEST", re: "12345678-5" }))!,
      ),
    ).toBe(true);
  });

  it("no acepta SINTETICO como substring en IDK", () => {
    expect(
      esCafMarcadoSintetico(leerCafXml(xmlBase({ idk: "EVIL-SINTETICO-FAKE", re: "12345678-5" }))!),
    ).toBe(false);
  });

  it("folio inicial respeta último folio 1.0 dentro del rango", () => {
    expect(folioActualInicialCaf(100, 200, null)).toEqual({ ok: true, valor: 100 });
    expect(folioActualInicialCaf(100, 200, 150)).toEqual({ ok: true, valor: 151 });
    expect(folioActualInicialCaf(8500, 8510, 9500)).toEqual({ ok: false, error: "fuera_rango_opai1" });
  });

  it("aviso de folios por vencer sin usar", () => {
    expect(mensajeAvisoFoliosSinUsarPorVencer(0)).toBeNull();
    expect(mensajeAvisoFoliosSinUsarPorVencer(3)).toBe(
      "3 folios vencerán sin usar: anúlalos en el SII",
    );
  });
});
