// Slack F4 (CAR-294): tomar, cerrar y pedir refuerzo de un aviso de terreno como capacidades, con
// permiso y alcance; el mensaje de Slack se actualiza en cola. Slack siempre simulado.
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  executeCapability,
  limpiarTrabajos,
  obtenerTrabajo,
  registrarTrabajos,
  trabajosDelNucleo,
} from "../src";
import { contextoDePrueba, TENANT_DE_PRUEBA, USUARIO_DE_PRUEBA } from "../src/testing";
import { conectarSlack, limpiarSlack, llamadas, prepararSlack, respuestas } from "./slack-util";

const T = TENANT_DE_PRUEBA;
const INST = "0192f3a0-0000-7000-8000-000000000c01";
const OTRA = "0192f3a0-0000-7000-8000-000000000c09";
const AVISO = "0192f3a0-0000-7000-8000-000000000e01";
const aviso = (extra: Record<string, unknown> = {}) => ({
  id: AVISO,
  tenantId: T,
  tipo: "atraso",
  clave: "atraso:1",
  instalacionId: INST,
  personaId: null,
  titulo: "Atraso",
  detalle: null,
  enlace: null,
  canalId: "C0GENERAL1",
  hiloTs: "1.000100",
  ts: "1.000200",
  envio: "enviado",
  gestion: "abierto",
  tomadoPor: null,
  tomadoEn: null,
  cerradoPor: null,
  cerradoEn: null,
  createdAt: new Date(),
  ...extra,
});
const semilla = (extra: Record<string, unknown> = {}) => ({
  tenant: [{ id: T, timezone: "America/Santiago" }],
  instalacion: [{ id: INST, tenantId: T, nombre: "Bodega Norte" }],
  slackAviso: [aviso(extra)],
});

beforeEach(() => {
  prepararSlack();
  respuestas["chat.update"] = { ok: true, ts: "1.000200" };
  respuestas["chat.postMessage"] = { ok: true, ts: "1.000300" };
  limpiarTrabajos();
  registrarTrabajos(trabajosDelNucleo);
});
afterEach(limpiarSlack);

describe("Slack F4: gestión de avisos en OPAI", () => {
  it("tomar deja el aviso a cargo de quien lo toma, emite el evento y encola la actualización de Slack", async () => {
    const { ctx } = contextoDePrueba({ semilla: semilla() });
    const r = await executeCapability(ctx, "core.avisos_terreno.tomar", { avisoId: AVISO });
    expect(r).toMatchObject({
      ok: true,
      data: { gestion: "tomado", tomadoPor: USUARIO_DE_PRUEBA.id },
    });
    expect(await ctx.db.trabajo.count({ where: { tipo: "core.slack.aviso_actualizar" } })).toBe(1);
    // Repetir el clic no cambia nada; otra persona no puede tomarlo.
    expect(
      await executeCapability(ctx, "core.avisos_terreno.tomar", { avisoId: AVISO }),
    ).toMatchObject({ ok: true });
    const otro = contextoDePrueba({
      semilla: semilla({ gestion: "tomado", tomadoPor: "0192f3a0-0000-7000-8000-0000000000b9" }),
    });
    expect(
      await executeCapability(otro.ctx, "core.avisos_terreno.tomar", { avisoId: AVISO }),
    ).toMatchObject({ ok: false });
  });

  it("la vista previa no cambia nada", async () => {
    const { ctx } = contextoDePrueba({ semilla: semilla() });
    await executeCapability(ctx, "core.avisos_terreno.tomar", { avisoId: AVISO }, { dryRun: true });
    expect(await ctx.db.slackAviso.findFirst({})).toMatchObject({ gestion: "abierto" });
  });

  it("un supervisor no ve ni gestiona avisos fuera de sus instalaciones", async () => {
    const { ctx } = contextoDePrueba({
      rol: "supervisor",
      alcance: { instalaciones: [OTRA] },
      semilla: semilla(),
    });
    expect(
      await executeCapability(ctx, "core.avisos_terreno.cerrar", { avisoId: AVISO }),
    ).toMatchObject({
      ok: false,
      error: { code: "NOT_FOUND" },
    });
    const lista = await executeCapability(ctx, "core.avisos_terreno.list", {});
    expect(lista).toMatchObject({ ok: true, data: [] });
    const propio = contextoDePrueba({
      rol: "supervisor",
      alcance: { instalaciones: [INST] },
      semilla: semilla(),
    });
    expect(
      await executeCapability(propio.ctx, "core.avisos_terreno.cerrar", { avisoId: AVISO }),
    ).toMatchObject({ ok: true });
  });

  it("sin permiso (viewer) no se gestiona", async () => {
    const { ctx } = contextoDePrueba({ rol: "viewer", semilla: semilla() });
    expect(
      await executeCapability(ctx, "core.avisos_terreno.tomar", { avisoId: AVISO }),
    ).toMatchObject({
      ok: false,
      error: { code: "FORBIDDEN" },
    });
  });

  it("el mensaje de Slack se actualiza con quién lo tomó y los botones que siguen", async () => {
    const { ctx } = await conectarSlack(
      contextoDePrueba({
        semilla: semilla({
          gestion: "tomado",
          tomadoPor: USUARIO_DE_PRUEBA.id,
          tomadoEn: new Date(),
        }),
      }).ctx,
    );
    llamadas.length = 0;
    expect(
      await obtenerTrabajo("core.slack.aviso_actualizar")?.ejecutar(ctx, { avisoId: AVISO }),
    ).toEqual({ actualizado: true });
    expect(llamadas.map((l) => l.metodo)).toEqual(["chat.update"]);
  });

  it("pedir refuerzo lo anota en el hilo", async () => {
    const { ctx } = await conectarSlack(contextoDePrueba({ semilla: semilla() }).ctx);
    expect(
      await executeCapability(ctx, "core.avisos_terreno.pedir_refuerzo", { avisoId: AVISO }),
    ).toMatchObject({ ok: true });
    const t = (await ctx.db.trabajo.findMany({ where: { tipo: "core.slack.aviso_refuerzo" } }))[0];
    llamadas.length = 0;
    expect(
      await obtenerTrabajo("core.slack.aviso_refuerzo")?.ejecutar(ctx, t?.payload),
    ).toMatchObject({ enHilo: true });
  });
});
