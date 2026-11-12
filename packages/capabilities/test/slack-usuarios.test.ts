// Slack F2 (CAR-292, ADR-093): vínculo de personas por correo y mensajes directos. Slack siempre
// simulado (nunca el real ni el de Gard).
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  executeCapability,
  obtenerTrabajo,
  registrarTrabajos,
  limpiarTrabajos,
  trabajosDelNucleo,
} from "../src";
import { contextoDePrueba, TENANT_DE_PRUEBA } from "../src/testing";
import { conectarSlack, limpiarSlack, llamadas, prepararSlack, respuestas } from "./slack-util";

const T = TENANT_DE_PRUEBA;
const id = (n: number) => `0192f3a0-0000-7000-8000-0000000001${String(n).padStart(2, "0")}`;
const persona = (n: number, email: string, portales: string[], estado = "activa") => ({
  user: { id: id(n), name: `Persona ${n}`, email },
  membership: {
    id: id(50 + n),
    tenantId: T,
    userId: id(n),
    rol: "admin",
    portales,
    estado,
    createdAt: new Date(n),
  },
});
const gente = [
  persona(1, "interna@ejemplo.cl", ["erp"]),
  persona(2, "supervisor@ejemplo.cl", ["supervisor"]),
  persona(3, "guardia@ejemplo.cl", ["terreno", "trabajador"]),
  persona(4, "invitado@ejemplo.cl", ["erp"]),
  persona(5, "nadie@ejemplo.cl", ["erp"]),
  persona(6, "suspendida@ejemplo.cl", ["erp"], "suspendida"),
  persona(7, "otroespacio@ejemplo.cl", ["erp"]),
];
const enSlack: Record<string, Record<string, unknown>> = {
  "interna@ejemplo.cl": { id: "U0INT1", team_id: "T0PRUEBA1" },
  "supervisor@ejemplo.cl": { id: "U0SUP1", team_id: "T0PRUEBA1" },
  "guardia@ejemplo.cl": { id: "U0GUA1", team_id: "T0PRUEBA1" },
  "invitado@ejemplo.cl": { id: "U0INV1", team_id: "T0PRUEBA1", is_restricted: true },
  "otroespacio@ejemplo.cl": { id: "U0OTR1", team_id: "T0OTRO99" },
};

function ctxConGente() {
  return contextoDePrueba({
    semilla: { user: gente.map((g) => g.user), membership: gente.map((g) => g.membership) },
  });
}

beforeEach(() => {
  prepararSlack();
  respuestas["users.lookupByEmail"] = (c: URLSearchParams) => {
    const u = enSlack[c.get("email") ?? ""];
    return u ? { ok: true, user: u } : { ok: false, error: "users_not_found" };
  };
  respuestas["conversations.open"] = { ok: true, channel: { id: "D0DM1" } };
  respuestas["chat.postMessage"] = { ok: true, ts: "1.1" };
  limpiarTrabajos();
  registrarTrabajos(trabajosDelNucleo);
});
afterEach(limpiarSlack);

const buscados = () => llamadas.filter((l) => l.metodo === "users.lookupByEmail").length;

describe("core.slack: vínculo de personas", () => {
  it("sin Slack conectado no busca a nadie ni vincula", async () => {
    const { ctx } = ctxConGente();
    const r = await executeCapability(ctx, "core.slack.usuarios", {});
    expect(r).toMatchObject({ ok: true, data: { conectada: false, personas: [] } });
    const v = await executeCapability(ctx, "core.slack.vincular_usuarios", {});
    expect(v).toMatchObject({ ok: false });
    expect(llamadas).toEqual([]);
  });

  it("vincula solo internos y miembros completos del mismo espacio; el resto queda con su motivo", async () => {
    const { ctx } = await conectarSlack(ctxConGente().ctx);
    const v = await executeCapability(ctx, "core.slack.vincular_usuarios", {});
    expect(v).toMatchObject({
      ok: true,
      data: { buscadas: 5, vinculadas: 2, sinVincular: 3, quedan: 0 },
    });
    // El guardia y la suspendida ni se buscan.
    expect(buscados()).toBe(5);
    const r = await executeCapability(ctx, "core.slack.usuarios", {});
    const personas = r.ok
      ? (r.data as { personas: { email: string; estado: string; motivo: string | null }[] })
          .personas
      : [];
    const por = Object.fromEntries(personas.map((p) => [p.email, [p.estado, p.motivo]]));
    expect(por).toEqual({
      "interna@ejemplo.cl": ["vinculado", null],
      "supervisor@ejemplo.cl": ["vinculado", null],
      "invitado@ejemplo.cl": ["sin_vincular", "invitado"],
      "nadie@ejemplo.cl": ["sin_vincular", "no_encontrado"],
      "otroespacio@ejemplo.cl": ["sin_vincular", "otro_espacio"],
    });
    const filas = await ctx.db.slackUsuario.findMany({});
    expect(filas.every((f) => f.tenantId === T)).toBe(true);
  });

  it("la vista previa no guarda nada", async () => {
    const { ctx } = await conectarSlack(ctxConGente().ctx);
    const v = await executeCapability(ctx, "core.slack.vincular_usuarios", {}, { dryRun: true });
    expect(v).toMatchObject({ ok: true, data: { buscadas: 5, vinculadas: 0, quedan: 0 } });
    expect(await ctx.db.slackUsuario.findMany({})).toEqual([]);
    expect(buscados()).toBe(0);
  });

  it("no liga a quien no es miembro interno de la empresa", async () => {
    const { ctx } = await conectarSlack(ctxConGente().ctx);
    const r = await executeCapability(ctx, "core.slack.vincular_usuarios", { usuarioId: id(3) });
    expect(r).toMatchObject({ ok: false, error: { code: "UNPROCESSABLE" } });
    const ajeno = await executeCapability(ctx, "core.slack.vincular_usuarios", {
      usuarioId: "0192f3a0-0000-7000-8000-0000000009ff",
    });
    expect(ajeno).toMatchObject({ ok: false });
  });

  it("un usuario de Slack ya ligado a otra persona no se reasigna", async () => {
    const { ctx } = await conectarSlack(ctxConGente().ctx);
    await executeCapability(ctx, "core.slack.vincular_usuarios", {});
    enSlack["nadie@ejemplo.cl"] = { id: "U0INT1", team_id: "T0PRUEBA1" };
    await executeCapability(ctx, "core.slack.vincular_usuarios", { usuarioId: id(5) });
    const f = await ctx.db.slackUsuario.findFirst({ where: { userId: id(5) } });
    expect(f).toMatchObject({ estado: "sin_vincular", motivo: "ya_ligado", slackUserId: null });
    delete enSlack["nadie@ejemplo.cl"];
  });

  it("al desconectar Slack los vínculos se borran", async () => {
    const { ctx } = await conectarSlack(ctxConGente().ctx);
    await executeCapability(ctx, "core.slack.vincular_usuarios", {});
    await executeCapability(ctx, "core.slack.desconectar", {});
    expect(await ctx.db.slackUsuario.findMany({})).toEqual([]);
  });

  it("el trabajo diario solo busca a los pendientes y no hace nada sin Slack", async () => {
    const sin = ctxConGente().ctx;
    expect(await obtenerTrabajo("core.slack.vincular_pendientes")?.ejecutar(sin, {})).toEqual({
      omitido: "sin_slack",
    });
    const { ctx } = await conectarSlack(ctxConGente().ctx);
    await obtenerTrabajo("core.slack.vincular_pendientes")?.ejecutar(ctx, {});
    expect(buscados()).toBe(5);
    llamadas.length = 0;
    await obtenerTrabajo("core.slack.vincular_pendientes")?.ejecutar(ctx, {});
    expect(buscados()).toBe(3); // los 2 vinculados ya no se buscan
  });
});

describe("core.slack: más de 40 personas", () => {
  const muchas = Array.from({ length: 45 }, (_, i) => persona(10 + i, `p${i}@ejemplo.cl`, ["erp"]));
  const ctxMuchas = () =>
    contextoDePrueba({
      semilla: { user: muchas.map((g) => g.user), membership: muchas.map((g) => g.membership) },
    });

  it("el trabajo avanza por toda la lista y no se repite con las mismas personas", async () => {
    const { ctx } = await conectarSlack(ctxMuchas().ctx);
    const t = obtenerTrabajo("core.slack.vincular_pendientes");
    const r1 = (await t?.ejecutar(ctx, {})) as { revisadas: number; quedan: number };
    expect(r1).toEqual({ revisadas: 40, quedan: 5 });
    const cont = (
      await ctx.db.trabajo.findMany({ where: { tipo: "core.slack.vincular_pendientes" } })
    )[0];
    expect(cont?.claveUnica).toMatch(/^slack-vincular:.+:1$/);
    llamadas.length = 0;
    const r2 = (await t?.ejecutar(ctx, cont?.payload)) as { revisadas: number; quedan: number };
    expect(r2).toEqual({ revisadas: 5, quedan: 0 });
    expect(buscados()).toBe(5);
    // Ya no queda nadie sin revisar en este ciclo: no se encola otra vuelta.
    expect(await ctx.db.trabajo.count({ where: { tipo: "core.slack.vincular_pendientes" } })).toBe(
      1,
    );
  });

  it("«Buscar de nuevo» deja encolado el resto", async () => {
    const { ctx } = await conectarSlack(ctxMuchas().ctx);
    const v = await executeCapability(ctx, "core.slack.vincular_usuarios", {});
    expect(v).toMatchObject({ ok: true, data: { buscadas: 40, quedan: 5 } });
    expect(await ctx.db.trabajo.count({ where: { tipo: "core.slack.vincular_pendientes" } })).toBe(
      1,
    );
  });
});

describe("core.slack: mensajes directos", () => {
  async function avisoPara(ctx: ReturnType<typeof contextoDePrueba>["ctx"], userId: string) {
    return ctx.db.notificacion.create({
      data: {
        tenantId: T,
        usuarioId: userId,
        titulo: "Te asignaron un puesto",
        cuerpo: "Turno noche",
        enlace: "/inicio",
      },
    });
  }

  it("envía el aviso a la persona vinculada y lo registra; sin vínculo no se encola", async () => {
    const { ctx } = await conectarSlack(ctxConGente().ctx);
    await executeCapability(ctx, "core.slack.vincular_usuarios", {});
    const { encolarMensajeDirecto } = await import("../src/core/slack");
    const n = await avisoPara(ctx, id(1));
    expect(
      await ctx.transaccion((tx) =>
        encolarMensajeDirecto(ctx, tx, { notificacionId: n.id, usuarioId: id(1) }),
      ),
    ).toBe(true);
    const sinVinculo = await avisoPara(ctx, id(5));
    expect(
      await ctx.transaccion((tx) =>
        encolarMensajeDirecto(ctx, tx, { notificacionId: sinVinculo.id, usuarioId: id(5) }),
      ),
    ).toBe(false);
    const r = await obtenerTrabajo("core.slack.mensaje_directo")?.ejecutar(ctx, {
      notificacionId: n.id,
    });
    expect(r).toEqual({ enviado: true });
    expect(llamadas.map((l) => l.metodo).slice(-2)).toEqual([
      "conversations.open",
      "chat.postMessage",
    ]);
    const envio = await ctx.db.envio.findFirst({ where: { canal: "slack_dm" } });
    expect(envio).toMatchObject({ estado: "enviado", destinatario: id(1) });
  });

  it("con los mensajes directos apagados no se encola nada", async () => {
    const { ctx } = await conectarSlack(ctxConGente().ctx);
    await executeCapability(ctx, "core.slack.vincular_usuarios", {});
    await executeCapability(ctx, "core.slack.configurar", { mensajesDirectos: { activo: false } });
    const { encolarMensajeDirecto } = await import("../src/core/slack");
    const n = await avisoPara(ctx, id(1));
    expect(
      await ctx.transaccion((tx) =>
        encolarMensajeDirecto(ctx, tx, { notificacionId: n.id, usuarioId: id(1) }),
      ),
    ).toBe(false);
  });

  it("un error transitorio de Slack se reintenta; uno definitivo queda registrado como fallido", async () => {
    const { ctx } = await conectarSlack(ctxConGente().ctx);
    await executeCapability(ctx, "core.slack.vincular_usuarios", {});
    const n = await avisoPara(ctx, id(2));
    respuestas["chat.postMessage"] = { ok: false, error: "ratelimited_x" };
    await expect(
      obtenerTrabajo("core.slack.mensaje_directo")?.ejecutar(ctx, { notificacionId: n.id }),
    ).rejects.toThrow();
    respuestas["chat.postMessage"] = { ok: false, error: "user_disabled" };
    expect(
      await obtenerTrabajo("core.slack.mensaje_directo")?.ejecutar(ctx, { notificacionId: n.id }),
    ).toEqual({ fallido: "user_disabled" });
    expect(JSON.stringify(await ctx.db.envio.findMany({}))).not.toContain("xoxb-");
  });
});
