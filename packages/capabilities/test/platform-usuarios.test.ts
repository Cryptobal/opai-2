import { beforeEach, describe, expect, it } from "vitest";

import { capacidadesDelNucleo } from "../src/core";
import { executeCapability } from "../src/execute";
import { limpiarRegistro, registrarCapacidades } from "../src/registry";
import { contextoDePrueba, USUARIO_DE_PRUEBA } from "../src/testing";
import { type OpcionesPrueba } from "../src/testing/contexto";
import { semillaTenant, U2 } from "./semilla";

beforeEach(() => {
  limpiarRegistro();
  registrarCapacidades(capacidadesDelNucleo);
});

const owner = { ...USUARIO_DE_PRUEBA, platformRole: "owner" as const };
function semilla() {
  const s = semillaTenant();
  return {
    ...s,
    user: s.user.map((u) => (u.id === owner.id ? { ...u, platformRole: "owner" } : u)),
  };
}
const contexto = (o: Partial<OpcionesPrueba> = {}) =>
  contextoDePrueba({ usuario: owner, semilla: semilla(), ...o });
const rolDe = (tabla: ReturnType<typeof contexto>["tabla"], id: string) =>
  tabla("user").find((u) => u.id === id)?.platformRole ?? null;

describe("platform.users.* (ADR-055)", () => {
  it("list muestra solo usuarios con rol de plataforma", async () => {
    const r = await executeCapability(contexto().ctx, "platform.users.list", {});
    expect(r).toMatchObject({
      ok: true,
      data: [{ email: "ana@prueba.cl", platformRole: "owner" }],
    });
  });

  it("set_role: preview no guarda; la real asigna, audita en la misma transacción y quita con null", async () => {
    const { ctx, tabla, eventos } = contexto();
    const input = { email: "beto@prueba.cl", platformRole: "support" };
    const vista = await executeCapability(ctx, "platform.users.set_role", input, { dryRun: true });
    expect(vista).toMatchObject({ ok: true, dryRun: true, data: { anterior: null } });
    expect(rolDe(tabla, U2)).toBeNull();
    expect(await executeCapability(ctx, "platform.users.set_role", input)).toMatchObject({
      ok: true,
    });
    expect(rolDe(tabla, U2)).toBe("support");
    expect(eventos).toMatchObject([{ capability: "platform.users.set_role" }]);
    const quitar = { email: "beto@prueba.cl", platformRole: null };
    expect(await executeCapability(ctx, "platform.users.set_role", quitar)).toMatchObject({
      ok: true,
      data: { anterior: "support", platformRole: null },
    });
    expect(rolDe(tabla, U2)).toBeNull();
  });

  it("nadie cambia su propio rol, support no asigna y un usuario sin rol de plataforma tampoco", async () => {
    const propio = { email: "ana@prueba.cl", platformRole: null };
    expect(
      await executeCapability(contexto().ctx, "platform.users.set_role", propio),
    ).toMatchObject({
      ok: false,
      error: { code: "FORBIDDEN" },
    });
    const beto = { email: "beto@prueba.cl", platformRole: "owner" };
    for (const platformRole of ["support", null] as const) {
      const { ctx, tabla } = contexto({ usuario: { ...owner, platformRole } });
      expect(await executeCapability(ctx, "platform.users.set_role", beto)).toMatchObject({
        ok: false,
        error: { code: "FORBIDDEN" },
      });
      expect(rolDe(tabla, U2)).toBeNull();
    }
  });

  it("una key de plataforma queda en aprobación (irreversible) y una key común no la ve", async () => {
    const actor = { tipo: "agent" as const, id: "k-1", viaUserId: owner.id };
    const agente = {
      apiKeyId: "k-1",
      nombre: "Agente",
      presupuestoMensualMicro: null,
      autonomia: {},
    };
    const beto = { email: "beto@prueba.cl", platformRole: "owner" };
    const conPlataforma = contexto({
      actor,
      agente,
      scopes: ["platform"],
      claveApi: { permisos: null, servicio: false, plataforma: true },
    });
    const r = await executeCapability(conPlataforma.ctx, "platform.users.set_role", beto);
    expect(r).toMatchObject({ ok: false, error: { code: "APPROVAL_REQUIRED" } });
    expect(rolDe(conPlataforma.tabla, U2)).toBeNull();
    const comun = contexto({
      actor,
      agente,
      scopes: ["*"],
      claveApi: { permisos: null, servicio: false },
    });
    expect(await executeCapability(comun.ctx, "platform.users.set_role", beto)).toMatchObject({
      ok: false,
      error: { code: "FORBIDDEN" },
    });
  });
});

describe("core.apikeys.create con el scope platform (ADR-055)", () => {
  const crear = (ctx: ReturnType<typeof contexto>["ctx"], extra: Record<string, unknown> = {}) =>
    executeCapability(ctx, "core.apikeys.create", {
      nombre: "Plataforma",
      scopes: ["*", "platform"],
      ...extra,
    });

  it("solo un usuario de plataforma, de tipo usuario y heredando permisos", async () => {
    expect(await crear(contexto().ctx)).toMatchObject({
      ok: true,
      data: { scopes: ["*", "platform"] },
    });
    expect(await crear(contexto({ usuario: USUARIO_DE_PRUEBA }).ctx)).toMatchObject({
      ok: false,
      error: { code: "FORBIDDEN" },
    });
    expect(await crear(contexto().ctx, { permisos: ["core:tenant.read"] })).toMatchObject({
      ok: false,
      error: { code: "UNPROCESSABLE" },
    });
  });
});

describe("autonomía directa sobre plataforma (ADR-055)", () => {
  const KEY = "0192f3a0-0000-7000-8000-0000000000c1";
  function conKey(usuario: typeof owner | typeof USUARIO_DE_PRUEBA) {
    const s = semilla();
    const apiKey = [
      { id: KEY, tenantId: s.tenant[0]!.id, userId: owner.id, nombre: "P", scopes: ["platform"] },
    ];
    return contextoDePrueba({ usuario, semilla: { ...s, apiKey } }).ctx;
  }
  const input = { apiKeyId: KEY, capability: "platform.users.set_role", nivel: "directo" };

  it("un owner del tenant sin rol de plataforma no la concede; un owner de plataforma sí", async () => {
    expect(
      await executeCapability(conKey(USUARIO_DE_PRUEBA), "core.apikeys.set_autonomia", input),
    ).toMatchObject({
      ok: false,
      error: { code: "FORBIDDEN" },
    });
    expect(
      await executeCapability(conKey(owner), "core.apikeys.set_autonomia", input),
    ).toMatchObject({ ok: true });
  });

  it("los caminos que invitan a un owner son irreversibles (un agente queda en aprobación)", async () => {
    const { obtenerCapacidad } = await import("../src/registry");
    // tenants.create también invita al adoptar una empresa existente (hallazgo de revisión).
    for (const id of ["platform.admins.invite", "platform.tenants.create"])
      expect(obtenerCapacidad(id)?.efecto, id).toBe("irreversible");
  });

  it("quitar el rol a otro owner funciona con el bloqueo de owners", async () => {
    const s = semilla();
    const dos = { ...s, user: s.user.map((u) => ({ ...u, platformRole: "owner" })) };
    const { ctx, tabla } = contextoDePrueba({ usuario: owner, semilla: dos });
    const quitar = { email: "beto@prueba.cl", platformRole: null };
    expect(await executeCapability(ctx, "platform.users.set_role", quitar)).toMatchObject({
      ok: true,
      data: { anterior: "owner" },
    });
    expect(rolDe(tabla, U2)).toBeNull();
    expect(rolDe(tabla, owner.id)).toBe("owner");
  });
});
