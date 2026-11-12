// CAR-36: las aprobaciones y la auditoría de `platform.*` viven fuera de la empresa de la key. Un
// owner o admin de esa empresa sin `platformRole` no las ve ni las resuelve; quien tiene
// `platformRole` sí. La concurrencia y el aislamiento entre empresas reales, en
// `plataforma-aislamiento-db.test.ts`.
import { beforeEach, describe, expect, it } from "vitest";

import { capacidadesDelNucleo } from "../src/core";
import { executeCapability } from "../src/execute";
import { limpiarRegistro, registrarCapacidades } from "../src/registry";
import { contextoDePrueba, TENANT_DE_PRUEBA, USUARIO_DE_PRUEBA } from "../src/testing";
import { type OpcionesPrueba } from "../src/testing/contexto";
import { semillaTenant, U2 } from "./semilla";

beforeEach(() => {
  limpiarRegistro();
  registrarCapacidades(capacidadesDelNucleo);
});

const KEY = "0192f3a0-0000-7000-8000-00000000c0de";
const LEGADA = "0192f3a0-0000-7000-8000-0000000000e1";
const owner = { ...USUARIO_DE_PRUEBA, platformRole: "owner" as const };
const beto = { id: U2, nombre: "Beto", email: "beto@prueba.cl", platformRole: null };
const pedido = { email: "beto@prueba.cl", platformRole: "support" };

/** Ana es owner de plataforma; Beto es admin de la empresa, sin `platformRole`. */
function semillaEscenario() {
  const s = semillaTenant();
  return {
    ...s,
    user: s.user.map((u) => (u.id === owner.id ? { ...u, platformRole: "owner" } : u)),
    apiKey: [{ id: KEY, nombre: "Key plataforma", userId: owner.id, scopes: ["platform"] }],
    // Fila de antes de CAR-36: una `platform.*` que quedó en la cola de la empresa.
    aprobacion: [
      {
        id: LEGADA,
        tenantId: TENANT_DE_PRUEBA,
        apiKeyId: KEY,
        viaUserId: owner.id,
        capability: "platform.admins.invite",
        input: { tenantId: "0192f3a0-0000-7000-8000-0000000000f9", email: "x@otra.cl" },
        resumen: "platform.admins.invite",
        estado: "pendiente",
        venceEn: new Date(Date.now() + 86_400_000),
        createdAt: new Date(),
      },
    ],
  };
}
const con = (o: Partial<OpcionesPrueba>) => contextoDePrueba({ ...o, semilla: semillaEscenario() });

const agente = {
  actor: { tipo: "agent" as const, id: KEY, viaUserId: owner.id },
  agente: { apiKeyId: KEY, nombre: "Key plataforma", presupuestoMensualMicro: null, autonomia: {} },
  scopes: ["*", "platform"],
  claveApi: { permisos: null, servicio: false, plataforma: true },
  usuario: owner,
};

describe("aprobaciones de plataforma fuera de la empresa (CAR-36)", () => {
  it("el pedido de la key queda en la cola de plataforma, sin fila, evento ni auditoría de empresa", async () => {
    const { ctx, tabla, eventos } = contextoDePrueba({ ...agente, semilla: semillaTenant() });
    const r = await executeCapability(ctx, "platform.users.set_role", pedido);
    expect(r).toMatchObject({ ok: false, error: { code: "APPROVAL_REQUIRED" } });
    expect(tabla("aprobacion")).toEqual([]);
    expect(tabla("evento")).toEqual([]);
    expect(eventos).toEqual([]);
    expect(tabla("aprobacionPlataforma")).toMatchObject([
      { capability: "platform.users.set_role", origenTenantId: TENANT_DE_PRUEBA, apiKeyId: KEY },
    ]);
    expect(tabla("auditoriaGlobal")).toMatchObject([
      { capability: "platform.users.set_role", entityType: "aprobacion", actorType: "agent" },
    ]);
    // La misma clave con el mismo input devuelve la misma aprobación (no duplica).
    const id = r.ok ? null : r.error.aprobacionId;
    const otra = await executeCapability(ctx, "platform.users.set_role", pedido, {
      idempotencyKey: "k1",
    });
    const repetida = await executeCapability(ctx, "platform.users.set_role", pedido, {
      idempotencyKey: "k1",
    });
    expect(repetida).toEqual(otra);
    expect(otra).not.toEqual(r);
    expect(id).toEqual(expect.any(String));
    // La key consulta su propia aprobación con core.aprobaciones.get.
    expect(await executeCapability(ctx, "core.aprobaciones.get", { id })).toMatchObject({
      ok: true,
      data: { ambito: "plataforma", estado: "pendiente", capability: "platform.users.set_role" },
    });
  });

  it("un admin de la empresa sin platformRole no ve, no lee ni resuelve nada de plataforma", async () => {
    const { ctx: pide, tabla } = contextoDePrueba({ ...agente, semilla: semillaTenant() });
    const r = await executeCapability(pide, "platform.users.set_role", pedido);
    const id = r.ok ? "" : String(r.error.aprobacionId);
    const semilla = {
      ...Object.fromEntries(["tenant", "user", "membership"].map((t) => [t, tabla(t)])),
      aprobacionPlataforma: tabla("aprobacionPlataforma"),
      aprobacion: semillaEscenario().aprobacion,
    };
    const { ctx } = contextoDePrueba({ usuario: beto, rol: "admin", semilla });
    const lista = await executeCapability(ctx, "core.aprobaciones.list", {});
    expect(lista).toMatchObject({ ok: true, data: [] });
    for (const a of [id, LEGADA]) {
      for (const [cap, input] of [
        ["core.aprobaciones.get", { id: a }],
        ["core.aprobaciones.aprobar", { id: a }],
        ["core.aprobaciones.rechazar", { id: a, motivo: "no corresponde" }],
      ] as const)
        expect(await executeCapability(ctx, cap, input), `${cap} ${a}`).toMatchObject({
          ok: false,
          error: { code: "NOT_FOUND" },
        });
    }
    for (const [cap, input] of [
      ["platform.auditoria.list", {}],
      ["platform.aprobaciones.aprobar", { id }],
      ["platform.aprobaciones.rechazar", { id, motivo: "no corresponde" }],
    ] as const)
      expect(await executeCapability(ctx, cap, input), cap).toMatchObject({
        ok: false,
        error: { code: "FORBIDDEN" },
      });
    expect(tabla("aprobacionPlataforma")[0]).toMatchObject({ estado: "pendiente" });
  });

  it("platformRole la ve en la bandeja, la aprueba (se ejecuta) y todo queda en plataforma", async () => {
    const { ctx: pide, tabla } = contextoDePrueba({ ...agente, semilla: semillaTenant() });
    const r = await executeCapability(pide, "platform.users.set_role", pedido);
    const id = r.ok ? "" : String(r.error.aprobacionId);
    const semilla = Object.fromEntries(
      ["tenant", "user", "membership", "aprobacionPlataforma", "auditoriaGlobal"].map((t) => [
        t,
        tabla(t),
      ]),
    );
    const owners = semilla["user"]!.map((u) =>
      u["id"] === owner.id ? { ...u, platformRole: "owner" } : u,
    );
    const yo = contextoDePrueba({ usuario: owner, semilla: { ...semilla, user: owners } });
    const lista = await executeCapability(yo.ctx, "core.aprobaciones.list", {});
    expect(lista).toMatchObject({
      ok: true,
      data: [{ id, ambito: "plataforma", agente: "Key plataforma" }],
    });
    // `core.aprobaciones.aprobar` no la resuelve (dejaría su id en la empresa): va por plataforma.
    expect(await executeCapability(yo.ctx, "core.aprobaciones.aprobar", { id })).toMatchObject({
      ok: false,
      error: { code: "NOT_FOUND" },
    });
    expect(await executeCapability(yo.ctx, "platform.aprobaciones.aprobar", { id })).toMatchObject({
      ok: true,
      data: { estado: "aprobada", resultado: { ok: true } },
    });
    expect(yo.tabla("user").find((u) => u["id"] === U2)?.["platformRole"]).toBe("support");
    expect(yo.tabla("aprobacionPlataforma")[0]).toMatchObject({
      estado: "aprobada",
      resueltaPor: owner.id,
    });
    expect(yo.tabla("auditoriaGlobal").map((e) => e["capability"])).toEqual([
      "platform.users.set_role", // pedido
      "core.aprobaciones.list", // lectura de la bandeja (ids de la cola de plataforma)
      "platform.users.set_role", // ejecución, como quien aprueba
      "platform.aprobaciones.aprobar", // decisión
    ]);
    // En la empresa solo queda la lectura de la bandeja, sin ids de plataforma ni su input.
    expect(yo.eventos.map((e) => e.capability)).toEqual(["core.aprobaciones.list"]);
    expect(yo.eventos[0]?.payload).toEqual({ ids: [] });
    expect(JSON.stringify(yo.eventos)).not.toContain("beto@prueba.cl");
  });

  it("support la ve pero no la resuelve, y no la quema", async () => {
    const support = { ...owner, platformRole: "support" as const };
    const { ctx, tabla } = con({ usuario: support });
    const lista = await executeCapability(ctx, "core.aprobaciones.list", {});
    expect(lista).toMatchObject({ ok: true, data: [{ id: LEGADA }] });
    expect(await executeCapability(ctx, "core.aprobaciones.aprobar", { id: LEGADA })).toMatchObject(
      {
        ok: false,
        error: { code: "FORBIDDEN" },
      },
    );
    expect(tabla("aprobacion")[0]).toMatchObject({ estado: "pendiente" });
  });

  it("support no aprueba ni rechaza una acción de plataforma que no puede ejecutar (CAR-323)", async () => {
    const pide = contextoDePrueba({ ...agente, semilla: semillaEscenario() });
    const r = await executeCapability(pide.ctx, "platform.users.set_role", pedido);
    const id = r.ok ? "" : String(r.error.aprobacionId);
    const support = { ...owner, platformRole: "support" as const };
    const { ctx } = contextoDePrueba({
      usuario: support,
      semilla: { ...semillaEscenario(), aprobacionPlataforma: pide.tabla("aprobacionPlataforma") },
    });
    for (const [cap, input] of [
      ["platform.aprobaciones.rechazar", { id, motivo: "no corresponde" }],
      ["platform.aprobaciones.aprobar", { id }],
    ] as const)
      expect(await executeCapability(ctx, cap, input)).toMatchObject({
        ok: false,
        error: { code: "FORBIDDEN" },
      });
    // Un owner sí puede rechazarla.
    const o = contextoDePrueba({
      usuario: owner,
      semilla: { ...semillaEscenario(), aprobacionPlataforma: pide.tabla("aprobacionPlataforma") },
    });
    expect(
      await executeCapability(o.ctx, "platform.aprobaciones.rechazar", {
        id,
        motivo: "no corresponde",
      }),
    ).toMatchObject({ ok: true });
  });

  it("la auditoría de empresa no muestra lo platform.* ajeno; la de plataforma, solo con platformRole", async () => {
    const { ctx, tabla } = con({ usuario: owner });
    expect(await executeCapability(ctx, "platform.users.set_role", pedido)).toMatchObject({
      ok: true,
    });
    // Fila de antes de CAR-36 en la cadena de la empresa.
    await ctx.transaccion((tx) =>
      ctx.auditoria.registrar(tx, {
        tenantId: TENANT_DE_PRUEBA,
        capability: "platform.users.set_role",
        actor: { tipo: "user", id: owner.id },
        payload: { input: pedido },
      }),
    );
    const empresa = await executeCapability(ctx, "core.audit.list", {});
    expect(empresa).toMatchObject({ ok: true, data: { eventos: [] } });
    expect(
      tabla("auditEvent").filter((e) => e["capability"] === "platform.users.set_role"),
    ).toHaveLength(1);
    expect(await executeCapability(ctx, "platform.auditoria.list", {})).toMatchObject({
      ok: true,
      data: { eventos: [{ capability: "platform.users.set_role", tenantObjetivoId: null }] },
    });
  });
});

describe("platform.users.set_role endurecido (no bloqueantes del #101)", () => {
  it("la vista previa de un agente no revela si el correo tiene cuenta", async () => {
    const { ctx } = contextoDePrueba({ ...agente, semilla: semillaTenant() });
    const existe = await executeCapability(ctx, "platform.users.set_role", pedido, {
      dryRun: true,
    });
    const noExiste = await executeCapability(
      ctx,
      "platform.users.set_role",
      { ...pedido, email: "nadie@prueba.cl" },
      { dryRun: true },
    );
    expect(existe).toMatchObject({ ok: true, data: { id: null, nombre: null, anterior: null } });
    expect(noExiste).toMatchObject({ ok: true, data: { id: null, nombre: null, anterior: null } });
  });

  it("si quien lo pide perdió el rol mientras esperaba el lock, no completa el cambio", async () => {
    // El contexto todavía dice owner (se resolvió antes), pero en la base ya no lo es.
    const { ctx, tabla } = contextoDePrueba({ usuario: owner, semilla: semillaTenant() });
    const r = await executeCapability(ctx, "platform.users.set_role", pedido);
    expect(r).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
    expect(tabla("user").find((u) => u["id"] === U2)?.["platformRole"] ?? null).toBeNull();
    expect(tabla("auditoriaGlobal")).toEqual([]);
  });

  it("un correo sin cuenta responde lo mismo que otro no asignable, sin «no existe»", async () => {
    const s = semillaTenant();
    const semilla = {
      ...s,
      user: s.user.map((u) => (u.id === owner.id ? { ...u, platformRole: "owner" } : u)),
    };
    const { ctx } = contextoDePrueba({ usuario: owner, semilla });
    const r = await executeCapability(ctx, "platform.users.set_role", {
      ...pedido,
      email: "nadie@prueba.cl",
    });
    expect(r).toMatchObject({ ok: false, error: { code: "UNPROCESSABLE" } });
    expect(JSON.stringify(r)).not.toMatch(/no existe/);
  });
});
