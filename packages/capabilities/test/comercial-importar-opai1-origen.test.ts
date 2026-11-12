import { randomBytes } from "node:crypto";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { type DatosOpai1, validarDatos } from "@opai/db/importar-opai1";

import { capacidadesDelNucleo, executeCapability, limpiarRegistro, registrarCapacidades } from "../src";
import { leerExportDeOpai1 } from "../src/comercial/importar-1-0-origen";
import { pideOpai1 } from "../src/comercial/importar-1-0-entrada";
import { contextoDePrueba } from "../src/testing";

// CAR-279: la llave de solo lectura de OPAI 1 vive en la integración «opai1» de la empresa y no sale de ahí.
const LLAVE = "opai_mcp_llaveFicticia1234";
const URL_OK = "https://203.0.113.10/api/export/opai2/v1";
const VACIO: DatosOpai1 = validarDatos({});

beforeAll(() => {
  process.env["OPAI_SECRETS_KEY"] = randomBytes(32).toString("base64");
});
beforeEach(() => {
  limpiarRegistro();
  registrarCapacidades(capacidadesDelNucleo);
});

type Ctx = ReturnType<typeof contextoDePrueba>["ctx"];
/** La integración «opai1» solo existe para empresas habilitadas por Plataforma (CAR-321). */
async function habilitada(ctx: Ctx) {
  await ctx.db.ajustePlataforma.create({
    data: { modulo: "core", clave: "integraciones_habilitadas", valor: { opai1: [ctx.tenantId] }, version: 1 },
  });
  return ctx;
}

async function conectar(url: string) {
  const { ctx, eventos } = contextoDePrueba();
  await habilitada(ctx);
  for (const [nombre, valor] of [["url", url], ["api_key", LLAVE]] as const) {
    const r = await executeCapability(ctx, "core.integraciones.set_secreto", { proveedor: "opai1", nombre, valor });
    expect(r.ok).toBe(true);
  }
  return { ctx, eventos };
}

describe("traer el export de OPAI 1 con la llave de la empresa", () => {
  it("sin la integración conectada explica dónde pegar la llave", async () => {
    const ctx = await habilitada(contextoDePrueba().ctx);
    await expect(leerExportDeOpai1(ctx, async () => VACIO)).rejects.toThrow(/Configuración › Integraciones › OPAI 1/);
  });

  it("entrega al lector la dirección y la llave guardadas, y la llave no queda en la auditoría", async () => {
    const { ctx, eventos } = await conectar(`${URL_OK} `);
    const visto: string[] = [];
    const datos = await leerExportDeOpai1(ctx, async (url, key) => {
      visto.push(url, key);
      return VACIO;
    });
    expect(datos).toBe(VACIO);
    expect(visto).toEqual([URL_OK, LLAVE]);
    expect(JSON.stringify(eventos)).not.toContain(LLAVE);
  });

  it("rechaza direcciones que no son https o apuntan a la red interna, sin llamar al lector", async () => {
    for (const url of ["http://203.0.113.10/v1", "https://localhost/v1", "https://10.0.0.5/v1", "no-es-url"]) {
      const { ctx } = await conectar(url);
      let llamado = false;
      await expect(
        leerExportDeOpai1(ctx, async () => {
          llamado = true;
          return VACIO;
        }),
      ).rejects.toThrow(/https y pública/);
      expect(llamado).toBe(false);
    }
  });

  it("si OPAI 1 falla, el mensaje no trae la llave ni el detalle interno", async () => {
    const { ctx } = await conectar(URL_OK);
    const falla = (m: string) => leerExportDeOpai1(ctx, async () => Promise.reject(new Error(m)));
    await expect(falla("Exportador OPAI 1.0 respondió 403")).rejects.toThrow(/respondió 403/);
    const otro = await falla(`fetch failed con ${LLAVE}`).catch((e: Error) => e.message);
    expect(otro).not.toContain(LLAVE);
    expect(otro).toMatch(/No se pudo leer OPAI 1/);
  });

  it("solo se lee OPAI 1 cuando se pide y no viene un origen pegado", () => {
    const base = { accion: "simular" as const, permitirReimportacion: false, usuarios: [], soloComercial: true };
    expect(pideOpai1({ ...base, desdeOpai1: true })).toBe(true);
    expect(pideOpai1({ ...base, desdeOpai1: false })).toBe(false);
    expect(pideOpai1({ ...base, desdeOpai1: true, accion: "revertir" })).toBe(false);
  });
});
