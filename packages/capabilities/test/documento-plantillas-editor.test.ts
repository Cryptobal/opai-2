import { beforeEach, describe, expect, it } from "vitest";

import { executeCapability } from "../src";
import { contextoDePrueba, USUARIO_DE_PRUEBA } from "../src/testing";
import type { Contexto } from "../src/types";
import { codigo, dato, reiniciar } from "./maestros-ayuda";
import { semillaTenant } from "./semilla";

beforeEach(reiniciar);

// CAR-127 · 06 Editor: borrador sin publicar, publicar crea la versión siguiente e inmutable.
type Editor = {
  id: string;
  versionVigente: number;
  firmantes: string;
  conBorrador: boolean;
  contenido: string;
  borrador: { contenido: string; porNombre: string | null } | null;
  desconocidas: string[];
};
const V1 = "{persona.nombre}, RUT {persona.rut}.";

async function plantilla(ctx: Contexto) {
  const p = await dato<Editor>(ctx, "core.documento_plantillas.create", {
    nombre: "Contrato indefinido",
    clase: "contrato_trabajo",
    nivelFirma: "N2",
    contenido: V1,
  });
  return p.id;
}
const get = (ctx: Contexto, id: string) =>
  dato<Editor>(ctx, "core.documento_plantillas.get", { id });

describe("core.documento_plantillas: editor", () => {
  it("guarda un borrador con variables desconocidas sin tocar la versión vigente", async () => {
    const { ctx } = contextoDePrueba({ rol: "admin" });
    const id = await plantilla(ctx);
    const texto = `${V1} Comuna {persona.comuna_obra}.`;
    const b = await dato<Editor>(ctx, "core.documento_plantillas.guardar_borrador", {
      id,
      contenido: texto,
    });
    expect(b).toMatchObject({ versionVigente: 1, contenido: V1, conBorrador: true });
    expect(b.borrador?.contenido).toBe(texto);
    expect(b.desconocidas).toEqual(["persona.comuna_obra"]);
    expect((await get(ctx, id)).borrador?.contenido).toBe(texto);
  });

  it("guardar el mismo texto vigente descarta el borrador; dryRun no escribe", async () => {
    const { ctx } = contextoDePrueba({ rol: "admin" });
    const id = await plantilla(ctx);
    const g = (contenido: string, dryRun = false) =>
      dato(ctx, "core.documento_plantillas.guardar_borrador", { id, contenido }, { dryRun });
    await g("Otro texto", true);
    expect((await get(ctx, id)).borrador).toBeNull();
    await g("Otro texto");
    await g(V1);
    expect((await get(ctx, id)).conBorrador).toBe(false);
  });

  it("publica la versión 2, limpia el borrador y conserva la 1", async () => {
    const { ctx, tabla } = contextoDePrueba({ rol: "admin" });
    const id = await plantilla(ctx);
    const v2 = `${V1}\n\n**Primero:** ingresa el {vinculo.inicio}.`;
    await dato(ctx, "core.documento_plantillas.guardar_borrador", { id, contenido: v2 });
    const pub = { id, contenido: v2, versionEsperada: 1 };
    const prev = await dato<Editor>(ctx, "core.documento_plantillas.publicar", pub, {
      dryRun: true,
    });
    expect(prev.versionVigente).toBe(2);
    expect((await get(ctx, id)).versionVigente).toBe(1);
    const r = await dato<Editor>(ctx, "core.documento_plantillas.publicar", pub);
    expect(r).toMatchObject({ versionVigente: 2, contenido: v2, borrador: null });
    expect(tabla("documentoPlantillaVersion").map((v) => v["numero"])).toEqual([1, 2]);
    expect(await get(ctx, id)).toMatchObject({ versionVigente: 2, contenido: v2 });
  });

  it("no publica variables desconocidas, texto en blanco, sin cambios ni sobre otra versión", async () => {
    const { ctx } = contextoDePrueba({ rol: "owner" });
    const id = await plantilla(ctx);
    const p = (contenido: string, versionEsperada = 1) =>
      codigo(ctx, "core.documento_plantillas.publicar", { id, contenido, versionEsperada });
    expect(await p("Cuenta {banco.numero}")).toBe("UNPROCESSABLE");
    expect(await p("   ")).toBe("UNPROCESSABLE");
    expect(await p(V1)).toBe("UNPROCESSABLE");
    expect(await p("Texto nuevo", 3)).toBe("CONFLICT");
  });

  it("una plantilla archivada no se edita; quién firma se cambia con update", async () => {
    const { ctx } = contextoDePrueba({ rol: "admin" });
    const id = await plantilla(ctx);
    expect((await get(ctx, id)).firmantes).toBe("ambos");
    await dato(ctx, "core.documento_plantillas.update", { id, firmantes: "trabajador" });
    expect((await get(ctx, id)).firmantes).toBe("trabajador");
    expect(await codigo(ctx, "core.documento_plantillas.update", { id, firmantes: "x" })).toBe(
      "INVALID_INPUT",
    );
    await dato(ctx, "core.documento_plantillas.update", { id, activa: false });
    const g = { id, contenido: "Otro" };
    expect(await codigo(ctx, "core.documento_plantillas.guardar_borrador", g)).toBe(
      "UNPROCESSABLE",
    );
  });

  it("gerente, supervisor y viewer no editan ni publican", async () => {
    const { ctx: admin, tabla } = contextoDePrueba({ rol: "admin" });
    const id = await plantilla(admin);
    for (const rol of ["gerente", "supervisor", "viewer"] as const) {
      const { ctx } = contextoDePrueba({
        rol,
        semilla: { documentoPlantilla: tabla("documentoPlantilla") },
      });
      const i = { id, contenido: "x", versionEsperada: 1 };
      expect(await codigo(ctx, "core.documento_plantillas.guardar_borrador", i)).toBe("FORBIDDEN");
      expect(await codigo(ctx, "core.documento_plantillas.publicar", i)).toBe("FORBIDDEN");
    }
  });

  it("un agente pide aprobación humana para publicar, en texto humano", async () => {
    const KEY = "0192f3a0-0000-7000-8000-00000000c0de";
    const { ctx, tabla } = contextoDePrueba({
      semilla: {
        ...semillaTenant(),
        apiKey: [{ id: KEY, nombre: "Agente RR.HH.", userId: USUARIO_DE_PRUEBA.id, scopes: ["*"] }],
      },
      actor: { tipo: "agent", id: KEY, viaUserId: USUARIO_DE_PRUEBA.id },
      agente: {
        apiKeyId: KEY,
        nombre: "Agente RR.HH.",
        presupuestoMensualMicro: null,
        autonomia: {},
      },
    });
    const humano: Contexto = {
      ...ctx,
      actor: { tipo: "user", id: USUARIO_DE_PRUEBA.id },
      agente: null,
    };
    const id = await plantilla(humano);
    const r = await executeCapability(ctx, "core.documento_plantillas.publicar", {
      id,
      contenido: "Texto nuevo {persona.rut}",
      versionEsperada: 1,
    });
    expect(r).toMatchObject({ ok: false, error: { code: "APPROVAL_REQUIRED" } });
    expect(tabla("documentoPlantillaVersion")).toHaveLength(1);
    expect(JSON.stringify(tabla("aprobacion")[0])).toContain(
      "publicar la versión 2 de la plantilla «Contrato indefinido»",
    );
  });
});
