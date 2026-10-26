// Cifrado de aplicación de los campos sensibles del inventario (Ley 21.719, Brief 07d PR 3 B11)
// contra Postgres real: nada en claro, ligado a tenant+tabla+columna, solo lo declarado sensible, y
// legible tras rotar la KEK (la rotación recifra la DEK del tenant, no los datos).
import { execFileSync } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { defineDatosPersonales } from "@opai/domain";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

// Inventario de prueba: salud y biometría aún no existen como tablas (llegan en fase 4).
const INVENTARIO = defineDatosPersonales("prueba", [
  {
    tabla: "fichas_salud",
    finalidad: "Ficha de salud ocupacional de la persona trabajadora (prueba).",
    categorias: ["sensible"],
    campos: ["diagnostico", "huella"],
    camposSensibles: ["diagnostico", "huella"],
    baseLicitud: "obligacion_legal",
  },
]);

describe.skipIf(!urlPropietario)("cifrado de campos sensibles en base real", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  let tA = "";
  let tB = "";
  const previas = { ...process.env };
  const v1 = randomBytes(32).toString("base64");

  const ctx = (tenantId: string) =>
    mod.crearContexto({
      tenantId,
      actor: { tipo: "system" },
      rol: "owner",
      medidor: { registrar: async () => undefined },
    });

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    Object.assign(process.env, { OPAI_SECRETS_KEY: v1, OPAI_SECRETS_KEY_VERSION: "1" });
    delete process.env["OPAI_SECRETS_KEY_ANTERIOR"];
    const s = randomUUID().slice(0, 8);
    const tenant = (slug: string) =>
      e.admin.tenant.create({ data: { slug, nombre: slug, vertical: "seguridad" } });
    tA = (await tenant(`cif-a-${s}`)).id;
    tB = (await tenant(`cif-b-${s}`)).id;
  });

  afterAll(async () => {
    for (const k of ["OPAI_SECRETS_KEY", "OPAI_SECRETS_KEY_VERSION", "OPAI_SECRETS_KEY_ANTERIOR"]) {
      if (previas[k] === undefined) delete process.env[k];
      else process.env[k] = previas[k];
    }
    await e?.cerrar();
  });

  it("ida y vuelta; lo guardado no contiene el dato en claro y cada cifrado es distinto", async () => {
    const c = mod.cifradoDeCampos(ctx(tA), INVENTARIO);
    const dato = "Hipoacusia leve bilateral";
    const g1 = await c.cifrar("fichas_salud", "diagnostico", dato);
    const g2 = await c.cifrar("fichas_salud", "diagnostico", dato);
    expect(mod.estaCifrado(g1)).toBe(true);
    expect(g1).not.toContain("Hipoacusia");
    expect(g1).not.toBe(g2);
    expect(await c.descifrar("fichas_salud", "diagnostico", g1)).toBe(dato);
    expect(await c.descifrar("fichas_salud", "diagnostico", g2)).toBe(dato);
  });

  it("solo cifra lo que el inventario declara sensible (el RUT queda como está)", async () => {
    const c = mod.cifradoDeCampos(ctx(tA), INVENTARIO);
    await expect(c.cifrar("personas", "rut", "11111111-1")).rejects.toThrow(/no está declarado como sensible/);
    await expect(c.cifrar("fichas_salud", "otro", "x")).rejects.toThrow(/no está declarado/);
    // El inventario real del Núcleo hoy no declara campos sensibles: nada se cifra por accidente.
    const real = mod.cifradoDeCampos(ctx(tA));
    await expect(real.cifrar("personas", "rut", "11111111-1")).rejects.toThrow();
  });

  it("el valor cifrado no se descifra en otro campo ni en otro tenant ni alterado", async () => {
    const a = mod.cifradoDeCampos(ctx(tA), INVENTARIO);
    const g = await a.cifrar("fichas_salud", "diagnostico", "dato reservado");
    await expect(a.descifrar("fichas_salud", "huella", g)).rejects.toThrow(/No se pudo descifrar/);
    const b = mod.cifradoDeCampos(ctx(tB), INVENTARIO);
    await expect(b.descifrar("fichas_salud", "diagnostico", g)).rejects.toThrow(/No se pudo descifrar/);
    const alterado = `${g.slice(0, -2)}${g.endsWith("AA") ? "BB" : "AA"}`;
    await expect(a.descifrar("fichas_salud", "diagnostico", alterado)).rejects.toThrow(/No se pudo descifrar/);
    await expect(a.descifrar("fichas_salud", "diagnostico", "en claro")).rejects.toThrow(/no está cifrado/);
    await expect(a.cifrar("fichas_salud", "diagnostico", g)).rejects.toThrow(/ya está cifrado/);
  });

  it("sigue legible tras rotar la KEK: la rotación recifra la DEK, no los datos", async () => {
    const dato = "Dato sensible de la persona";
    const g = await mod.cifradoDeCampos(ctx(tA), INVENTARIO).cifrar("fichas_salud", "huella", dato);
    const v2 = randomBytes(32).toString("base64");
    execFileSync("pnpm", ["exec", "tsx", "scripts/rotar-kek.ts"], {
      cwd: new URL("..", import.meta.url).pathname,
      env: { ...process.env, OPAI_SECRETS_KEY: v2, OPAI_SECRETS_KEY_VERSION: "2", OPAI_SECRETS_KEY_ANTERIOR: v1 },
      stdio: "pipe",
    });
    Object.assign(process.env, { OPAI_SECRETS_KEY: v2, OPAI_SECRETS_KEY_VERSION: "2" });
    delete process.env["OPAI_SECRETS_KEY_ANTERIOR"];
    expect(await mod.cifradoDeCampos(ctx(tA), INVENTARIO).descifrar("fichas_salud", "huella", g)).toBe(dato);
  }, 60_000);
});
