import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { capturarUfUtmSii } from "../src/core/remuneraciones/sii-captura";
import {
  primerDiaMes,
  ufCentavosDelDia,
  ufTextoACentavos,
  urlSiiUf,
  urlSiiUtm,
  utmClpDelMes,
} from "../src/core/remuneraciones/sii-parse";
import { contextoDePrueba } from "../src/testing";

const dir = join(dirname(fileURLToPath(import.meta.url)), "fixtures");
const uf2026 = readFileSync(join(dir, "sii-uf-2026-snippet.html"), "utf8");
const utm2026 = readFileSync(join(dir, "sii-utm-2026-snippet.html"), "utf8");

describe("parseo SII UF/UTM", () => {
  it("convierte texto chileno UF a centavos", () => {
    expect(ufTextoACentavos("41.258,26")).toBe(4125826);
    expect(ufTextoACentavos("41.237,01")).toBe(4123701);
  });

  it("lee UF del 2-nov-2026", () => {
    expect(ufCentavosDelDia(uf2026, "2026-11-02")).toBe(4125826);
  });

  it("retrocede al último día con valor si el día pedido está vacío", () => {
    expect(ufCentavosDelDia(uf2026, "2026-11-04")).toBe(4126357);
  });

  it("lee UTM de noviembre 2026", () => {
    expect(utmClpDelMes(utm2026, 11)).toBe(72440);
    expect(utmClpDelMes(utm2026, 10)).toBe(72151);
  });

  it("vigencia mensual UTM desde el primer día del mes", () => {
    expect(primerDiaMes("2026-11-02")).toBe("2026-11-01");
  });
});

describe("captura SII publica en plataforma (memoria)", () => {
  it("registra captura ok y valor publicado con consulta simulada", async () => {
    const { ctx, tabla } = contextoDePrueba();
    const ufId = "00000000-0000-4000-8000-000000000001";
    const utmId = "00000000-0000-4000-8000-000000000002";
    tabla("indicadorLegal").push(
      { id: ufId, clave: "uf" },
      { id: utmId, clave: "utm" },
    );
    const consulta = async (url: string) => {
      if (url === urlSiiUf(2026)) return uf2026;
      if (url === urlSiiUtm(2026)) return utm2026;
      throw new Error(`url inesperada ${url}`);
    };
    await capturarUfUtmSii(ctx, { dia: "2026-11-02", consulta });
    const capturas = tabla("capturaIndicador") as { resultado: string; valorLeidoJson?: number }[];
    expect(capturas).toHaveLength(2);
    expect(capturas.every((c) => c.resultado === "ok")).toBe(true);
    const publicados = tabla("valorPublicado") as { valorJson: number; vigenteDesde: Date }[];
    expect(publicados.some((p) => p.valorJson === 4125826)).toBe(true);
    expect(publicados.some((p) => p.valorJson === 72440)).toBe(true);
  });
});
