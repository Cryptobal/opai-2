import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";

import { capturarUfUtmSii } from "../src/core/remuneraciones/sii-captura";

const dirFix = join(dirname(fileURLToPath(import.meta.url)), "fixtures");
const uf2026 = readFileSync(join(dirFix, "sii-uf-2026-snippet.html"), "utf8");
const utm2026 = readFileSync(join(dirFix, "sii-utm-2026-snippet.html"), "utf8");

describe.skipIf(!urlPropietario)("captura SII UF/UTM en base real", () => {
  let e: Entorno;
  let mod: typeof import("../src");
  const tenantId = randomUUID();

  beforeAll(async () => {
    e = await prepararEntorno();
    await e.admin.tenant.create({
      data: { id: tenantId, slug: `cap-${randomUUID().slice(0, 6)}`, nombre: "Cap", vertical: "seguridad" },
    });
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades(mod.capacidadesDelNucleo);
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
