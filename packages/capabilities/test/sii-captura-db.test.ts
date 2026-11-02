import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { enTransaccion } from "../../db/src/transaccion";
import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";
import { aislarValoresPlataformaUfUtm } from "../../db/test/aislar-valores-plataforma";

import type * as CapabilitiesModule from "../src";
import { referenciaVariacion } from "../src/core/remuneraciones/sii-captura-referencia";
import { capturarUfUtmSii } from "../src/core/remuneraciones/sii-captura";

const dirFix = join(dirname(fileURLToPath(import.meta.url)), "fixtures");
const uf2026 = readFileSync(join(dirFix, "sii-uf-2026-snippet.html"), "utf8");
const utm2026 = readFileSync(join(dirFix, "sii-utm-2026-snippet.html"), "utf8");

describe.skipIf(!urlPropietario)("captura SII UF/UTM en base real", () => {
  let e: Entorno;
  let mod: typeof CapabilitiesModule;
  let ufId = "";
  let utmId = "";
  const tenantId = randomUUID();
  const aislar = aislarValoresPlataformaUfUtm(
    () => e,
    () => ({ ufId, utmId }),
  );

  beforeAll(async () => {
    e = await prepararEntorno();
    await e.admin.tenant.create({
      data: { id: tenantId, slug: `cap-${randomUUID().slice(0, 6)}`, nombre: "Cap", vertical: "seguridad" },
    });
    ufId = (await e.admin.indicadorLegal.findFirstOrThrow({ where: { clave: "uf" } })).id;
    utmId = (await e.admin.indicadorLegal.findFirstOrThrow({ where: { clave: "utm" } })).id;
    await aislar.beforeAll();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades(mod.capacidadesDelNucleo);
  });

  afterEach(async () => {
    await aislar.afterEach();
  });

  afterAll(async () => {
    await e?.cerrar();
  });

  const ctx = () =>
    mod.crearContexto({
      tenantId,
      actor: { tipo: "system" },
      rol: "owner",
      medidor: { registrar: async () => undefined },
    });

  it("captura UF y UTM deja capturas y valores publicados en la misma transacción", async () => {
    const dia = "2026-11-02";
    const antes = await e.admin.capturaIndicador.count();
    await capturarUfUtmSii(ctx(), {
      dia,
      consulta: async (url) => (url.includes("/uf/") ? uf2026 : utm2026),
    });
    const capturas = await e.admin.capturaIndicador.findMany({
      orderBy: { capturadoEn: "asc" },
      skip: antes,
    });
    expect(capturas.length).toBe(2);
    expect(capturas.some((c) => c.resultado === "ok")).toBe(true);
  });

  it("referenciaVariacion UTM usa último vigente si falta el 1.º del mes anterior", async () => {
    const mesActual = "2026-11-01";
    const dosMesesAtras = "2026-08-01";
    const fuente = "https://www.sii.cl/valores_y_fechas/utm/utm2026.htm";
    await e.admin.valorPublicado.deleteMany({ where: { indicadorId: utmId } });
    await e.admin.valorPublicado.create({
      data: {
        indicadorId: utmId,
        valorJson: 70_000,
        vigenteDesde: new Date(`${dosMesesAtras}T12:00:00.000Z`),
        estado: "vigente",
        fuente,
        verificacion: "verificado",
      },
    });
    const ref = await enTransaccion(tenantId, (tx) =>
      referenciaVariacion(tx, utmId, "utm", mesActual),
    );
    expect("sinReferencia" in ref).toBe(false);
    if ("sinReferencia" in ref) return;
    expect(ref.vigenteDesde).toBe(dosMesesAtras);
    expect(ref.valor).toBe(70_000);
  });

  it("registra captura fallida si Postgres rechaza la publicación", async () => {
    const dia = "2026-11-02";
    const uf = await e.admin.indicadorLegal.findFirstOrThrow({ where: { clave: "uf" } });
    const fuente = "https://www.sii.cl/valores_y_fechas/uf/uf2026.htm";
    await e.admin.valorPublicado.deleteMany({
      where: { indicadorId: uf.id, vigenteDesde: new Date(`${dia}T12:00:00.000Z`) },
    });
    await e.admin.valorPublicado.create({
      data: {
        indicadorId: uf.id,
        valorJson: 4_125_826,
        vigenteDesde: new Date(`${dia}T12:00:00.000Z`),
        estado: "vigente",
        fuente,
        verificacion: "verificado",
      },
    });
    await capturarUfUtmSii(ctx(), {
      dia,
      consulta: async (url) => {
        if (url.includes("/uf/")) {
          return uf2026.replace("41.258,26", "41.300,00");
        }
        return utm2026;
      },
    });
    const fallo = await e.admin.capturaIndicador.findFirst({
      where: { indicadorId: uf.id, resultado: "fallido" },
      orderBy: { capturadoEn: "desc" },
    });
    expect(fallo).toBeTruthy();
    expect(fallo?.alertaEmitida).toBe(true);
    expect(fallo?.diferencia).toBeTruthy();
  });
});
