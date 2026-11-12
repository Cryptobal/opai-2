import { beforeEach, describe, expect, it } from "vitest";

import { contextoDePrueba, USUARIO_DE_PRUEBA } from "../src/testing";
import { codigo, dato, reiniciar } from "./maestros-ayuda";
import { semillaTenant } from "./semilla";

beforeEach(reiniciar);

type Valor = { modulo: string; clave: string; valor: unknown; origen: string };
const de = (vs: Valor[], clave: string) => vs.find((v) => v.clave === clave);

describe("core.config.*", () => {
  it("ya no ofrece exigir el segundo factor a nivel de empresa (CAR-286)", async () => {
    const { ctx } = contextoDePrueba({ semilla: semillaTenant() });
    const vs = await dato<Valor[]>(ctx, "core.config.get", { modulo: "core" });
    expect(de(vs, "seguridad_mfa_obligatorio_admins")).toBeUndefined();
  });
  it("resuelve defecto → plataforma → tenant → usuario según el ámbito de cada ajuste", async () => {
    const { ctx, tabla } = contextoDePrueba({ semilla: semillaTenant() });
    tabla("ajustePlataforma").push({
      modulo: "core",
      clave: "remuneraciones_imm",
      valor: 560_000,
      version: 1,
    });
    tabla("ajustePlataforma").push({
      modulo: "core",
      clave: "documentos_tamano_maximo_mb",
      valor: 10,
      version: 1,
    });
    await dato(ctx, "core.config.set", {
      modulo: "core",
      clave: "documentos_tamano_maximo_mb",
      valor: 20,
    });
    await dato(ctx, "core.config.set", {
      modulo: "core",
      clave: "preferencias_tema",
      valor: "oscuro",
    });
    const vs = await dato<Valor[]>(ctx, "core.config.get", { modulo: "core" });
    expect(de(vs, "remuneraciones_imm")).toMatchObject({ valor: 560_000, origen: "plataforma" });
    expect(de(vs, "documentos_tamano_maximo_mb")).toMatchObject({ valor: 20, origen: "tenant" });
    expect(de(vs, "preferencias_tema")).toMatchObject({ valor: "oscuro", origen: "usuario" });
    expect(de(vs, "preferencias_silencio")).toMatchObject({ valor: false, origen: "defecto" });
    await dato(ctx, "core.config.set", {
      modulo: "core",
      clave: "documentos_tamano_maximo_mb",
      valor: null,
    });
    expect(
      de(await dato<Valor[]>(ctx, "core.config.get", {}), "documentos_tamano_maximo_mb"),
    ).toMatchObject({ valor: 10, origen: "plataforma" });
  });

  it("el marco (ADR-090) es una preferencia de cada persona: clásico por defecto, Hilo a elección", async () => {
    const { ctx } = contextoDePrueba({ semilla: semillaTenant() });
    const antes = await dato<Valor[]>(ctx, "core.config.get", { modulo: "core" });
    expect(de(antes, "preferencias_marco")).toMatchObject({ valor: "clasico", origen: "defecto" });
    await dato(ctx, "core.config.set", { modulo: "core", clave: "preferencias_marco", valor: "hilo" });
    const despues = await dato<Valor[]>(ctx, "core.config.get", { modulo: "core" });
    expect(de(despues, "preferencias_marco")).toMatchObject({ valor: "hilo", origen: "usuario" });
    expect(
      await codigo(ctx, "core.config.set", { modulo: "core", clave: "preferencias_marco", valor: "otro" }),
    ).toBe("UNPROCESSABLE");
  });

  it("valida el valor, prohíbe los de plataforma y deja a cualquiera cambiar sus preferencias", async () => {
    const owner = contextoDePrueba({ semilla: semillaTenant() });
    expect(
      await codigo(owner.ctx, "core.config.set", {
        modulo: "core",
        clave: "documentos_tamano_maximo_mb",
        valor: 999,
      }),
    ).toBe("UNPROCESSABLE");
    expect(
      await codigo(owner.ctx, "core.config.set", {
        modulo: "core",
        clave: "remuneraciones_imm",
        valor: 1,
      }),
    ).toBe("FORBIDDEN");
    expect(
      await codigo(owner.ctx, "core.config.set", { modulo: "core", clave: "no_existe", valor: 1 }),
    ).toBe("NOT_FOUND");
    const viewer = contextoDePrueba({ rol: "viewer", semilla: semillaTenant() });
    expect(
      await codigo(viewer.ctx, "core.config.set", {
        modulo: "core",
        clave: "comunicaciones_remitente",
        valor: "Gard",
      }),
    ).toBe("FORBIDDEN");
    expect(
      await codigo(viewer.ctx, "core.config.set", {
        modulo: "core",
        clave: "preferencias_silencio",
        valor: true,
      }),
    ).toBe("OK");
    const fila = viewer.tabla("ajuste")[0];
    expect(fila).toMatchObject({ ambito: "usuario", sujetoId: USUARIO_DE_PRUEBA.id });
  });

  it("schema publica JSON Schema y metadatos; buscar encuentra por etiqueta sin tildes", async () => {
    const { ctx } = contextoDePrueba({ semilla: semillaTenant() });
    const s = await dato<
      { clave: string; esquema: { type?: string }; editable: boolean; ambito: string }[]
    >(ctx, "core.config.schema", {});
    expect(s.find((c) => c.clave === "documentos_tamano_maximo_mb")).toMatchObject({
      esquema: { type: "integer" },
      editable: true,
    });
    expect(s.find((c) => c.clave === "ia_modelos")).toMatchObject({
      ambito: "plataforma",
      editable: false,
    });
    const r = await dato<{ clave: string }[]>(ctx, "core.config.buscar", { q: "tamano" });
    expect(r.map((c) => c.clave)).toEqual(["documentos_tamano_maximo_mb"]);
  });
});

describe("platform.ajustes.*", () => {
  it("solo plataforma fija ajustes globales, con versión", async () => {
    const usuario = { ...USUARIO_DE_PRUEBA, platformRole: "owner" as const };
    const { ctx } = contextoDePrueba({ usuario, conTenant: false });
    const r = await dato<{ version: number }>(ctx, "platform.ajustes.set", {
      modulo: "core",
      clave: "remuneraciones_imm",
      valor: 560_000,
    });
    expect(r.version).toBe(1);
    const g = await dato<{ clave: string; valor: number }[]>(ctx, "platform.ajustes.get", {});
    expect(g.find((x) => x.clave === "remuneraciones_imm")?.valor).toBe(560_000);
    const tenant = contextoDePrueba({ semilla: semillaTenant() });
    expect(
      await codigo(tenant.ctx, "platform.ajustes.set", {
        modulo: "core",
        clave: "remuneraciones_imm",
        valor: 1,
      }),
    ).toBe("FORBIDDEN");
  });
});
