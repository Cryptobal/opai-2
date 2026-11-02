import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { enTransaccion } from "../src/transaccion";
import { remuneracionesPublicarSii } from "../src/remuneraciones-sii";
import { type Entorno, prepararEntorno, urlPropietario } from "./entorno";

describe.skipIf(!urlPropietario)("remuneraciones SII publicar (SECURITY DEFINER)", () => {
  let e: Entorno;
  let ufId = "";
  const tenantId = randomUUID();

  beforeAll(async () => {
    e = await prepararEntorno();
    await e.admin.tenant.create({
      data: { id: tenantId, slug: `sii-${randomUUID().slice(0, 6)}`, nombre: "SII test", vertical: "seguridad" },
    });
    ufId = (await e.admin.indicadorLegal.findFirstOrThrow({ where: { clave: "uf" } })).id;
  });

  afterAll(async () => {
    await e?.cerrar();
  });

  it("opai_app no inserta directo en valores_publicados", async () => {
    await expect(
      e.appSinTenant.valorPublicado.create({
        data: {
          indicadorId: ufId,
          valorJson: 1,
          vigenteDesde: new Date("2026-11-02"),
          estado: "vigente",
          fuente: "https://www.sii.cl/x",
        },
      }),
    ).rejects.toThrow();
  });

  it("publica UF vía función con fuente SII", async () => {
    const id = await enTransaccion(tenantId, (tx) =>
      remuneracionesPublicarSii(tx, {
        clave: "uf",
        valor: 4_125_826,
        vigenteDesde: "2026-11-02",
        fuente: "https://www.sii.cl/valores_y_fechas/uf/uf2026.htm",
        consultadaEn: new Date("2026-11-02T12:00:00.000Z"),
      }),
    );
    const row = await e.admin.valorPublicado.findUniqueOrThrow({ where: { id } });
    expect(Number(row.valorJson)).toBe(4_125_826);
  });

  it("rechaza fuente fuera del SII", async () => {
    await expect(
      enTransaccion(tenantId, (tx) =>
        remuneracionesPublicarSii(tx, {
          clave: "uf",
          valor: 4_125_826,
          vigenteDesde: "2026-11-03",
          fuente: "https://example.com/uf",
          consultadaEn: new Date(),
        }),
      ),
    ).rejects.toThrow();
  });

  it("rechaza encadenamiento mismo día con otro valor", async () => {
    const fuente = "https://www.sii.cl/valores_y_fechas/uf/uf2026.htm";
    const vigenteDesde = "2026-11-02";
    await enTransaccion(tenantId, (tx) =>
      remuneracionesPublicarSii(tx, {
        clave: "uf",
        valor: 4_125_826,
        vigenteDesde,
        fuente,
        consultadaEn: new Date("2026-11-02T12:00:00.000Z"),
      }),
    );
    await expect(
      enTransaccion(tenantId, (tx) =>
        remuneracionesPublicarSii(tx, {
          clave: "uf",
          valor: Math.round(4_125_826 * 1.05),
          vigenteDesde,
          fuente,
          consultadaEn: new Date("2026-11-02T13:00:00.000Z"),
        }),
      ),
    ).rejects.toThrow(/mismo día|variación/i);
  });

  it("rechaza vigente_desde futuro para UTM", async () => {
    await expect(
      enTransaccion(tenantId, (tx) =>
        remuneracionesPublicarSii(tx, {
          clave: "utm",
          valor: 72_440,
          vigenteDesde: "2099-01-01",
          fuente: "https://www.sii.cl/valores_y_fechas/utm/utm2099.htm",
          consultadaEn: new Date(),
        }),
      ),
    ).rejects.toThrow(/ventana/i);
  });
});
