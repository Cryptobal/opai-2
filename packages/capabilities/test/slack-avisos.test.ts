// Slack F3 (CAR-293, ADR-093): avisos de terreno. Slack siempre simulado (nunca el real ni el de Gard).
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  executeCapability,
  limpiarTrabajos,
  obtenerTrabajo,
  registrarTrabajos,
  trabajosDelNucleo,
} from "../src";
import { consumidoresAvisosSlack } from "../src/core/slack/avisos";
import type { EventoPublicado } from "../src/eventos/consumidores";
import { contextoDePrueba, TENANT_DE_PRUEBA } from "../src/testing";
import { conectarSlack, limpiarSlack, llamadas, prepararSlack, respuestas } from "./slack-util";

const T = TENANT_DE_PRUEBA;
const INST = "0192f3a0-0000-7000-8000-000000000c01";
const PERS = "0192f3a0-0000-7000-8000-000000000c02";
const SUP = "0192f3a0-0000-7000-8000-000000000c03";
const JEFA = "0192f3a0-0000-7000-8000-000000000c04";
const GRUPO = "0192f3a0-0000-7000-8000-000000000c05";
const CANAL = { id: "C0GENERAL1", nombre: "supervision" };

const semilla = {
  tenant: [{ id: T, timezone: "America/Santiago" }],
  instalacion: [{ id: INST, tenantId: T, nombre: "Bodega Norte" }],
  persona: [{ id: PERS, tenantId: T, nombres: "Juan", apellidos: "Pérez" }],
  membership: [
    {
      id: "0192f3a0-0000-7000-8000-000000000d01",
      tenantId: T,
      userId: SUP,
      rol: "supervisor",
      portales: ["supervisor"],
      estado: "activa",
    },
    {
      id: "0192f3a0-0000-7000-8000-000000000d02",
      tenantId: T,
      userId: JEFA,
      rol: "admin",
      portales: ["erp"],
      estado: "activa",
    },
  ],
  supervisorInstalacion: [
    { tenantId: T, membershipId: "0192f3a0-0000-7000-8000-000000000d01", instalacionId: INST },
  ],
  grupoUsuarios: [{ id: GRUPO, tenantId: T, nombre: "Central", archivadoEn: null }],
  grupoUsuarioMiembro: [{ tenantId: T, grupoId: GRUPO, userId: JEFA }],
  slackUsuario: [
    {
      tenantId: T,
      userId: SUP,
      estado: "vinculado",
      slackUserId: "U0SUP1",
      revisadoEn: new Date(),
    },
    {
      tenantId: T,
      userId: JEFA,
      estado: "vinculado",
      slackUserId: "U0JEFA1",
      revisadoEn: new Date(),
    },
  ],
};

let n = 0;
const evento = (tipo: string, payload: unknown): EventoPublicado => ({
  id: `0192f3a0-0000-7000-8000-0000000e${String(++n).padStart(4, "0")}`,
  tipo,
  entidadTipo: null,
  entidadId: null,
  payload,
  actorTipo: "system",
  actorId: null,
  viaUserId: null,
  createdAt: new Date(),
});
const marca = (minTarde: number, extra: Record<string, unknown> = {}) => {
  const inicio = new Date(Date.now() - minTarde * 60_000);
  return evento("asistencia.marca.registrada", {
    marcaId: `0192f3a0-0000-7000-8000-0000000f${String(++n).padStart(4, "0")}`,
    personaId: PERS,
    tipo: "entrada",
    instalacionId: INST,
    gpsEstado: "dentro",
    turnoInicio: inicio.toISOString(),
    horaServidor: new Date().toISOString(),
    distanciaM: null,
    ...extra,
  });
};

async function despachar(ctx: ReturnType<typeof contextoDePrueba>["ctx"], ev: EventoPublicado) {
  for (const c of consumidoresAvisosSlack)
    if (c.eventos === "*" || c.eventos.includes(ev.tipo)) await c.handler(ctx, ev);
}
async function correrTrabajos(ctx: ReturnType<typeof contextoDePrueba>["ctx"], tipo: string) {
  for (const t of await ctx.db.trabajo.findMany({ where: { tipo } }))
    await obtenerTrabajo(tipo)?.ejecutar(ctx, t.payload);
}
const metodos = () => llamadas.map((l) => l.metodo);

async function conectadoConCanal(config: Record<string, unknown> = {}) {
  const { ctx } = await conectarSlack(contextoDePrueba({ semilla }).ctx);
  await executeCapability(ctx, "core.slack.configurar", { canales: { general: CANAL }, ...config });
  llamadas.length = 0;
  return ctx;
}

beforeEach(() => {
  prepararSlack();
  let ts = 100;
  respuestas["chat.postMessage"] = () => ({ ok: true, ts: `${++ts}.000100` });
  respuestas["conversations.open"] = { ok: true, channel: { id: "D0DM1" } };
  limpiarTrabajos();
  registrarTrabajos(trabajosDelNucleo);
});
afterEach(limpiarSlack);

describe("Slack F3: avisos de terreno", () => {
  it("sin Slack conectado no registra ni envía nada", async () => {
    const { ctx } = contextoDePrueba({ semilla });
    await despachar(ctx, marca(40));
    expect(await ctx.db.slackAviso.findMany({})).toEqual([]);
    expect(llamadas).toEqual([]);
  });

  it("sin canal elegido no se avisa la anomalía", async () => {
    const { ctx } = await conectarSlack(contextoDePrueba({ semilla }).ctx);
    await despachar(ctx, marca(40));
    expect(await ctx.db.slackAviso.findMany({})).toEqual([]);
  });

  it("solo anomalías: una marca a tiempo o bajo el margen no se avisa; el atraso sí, una sola vez", async () => {
    const ctx = await conectadoConCanal();
    await despachar(ctx, marca(0));
    await despachar(ctx, marca(10));
    expect(await ctx.db.slackAviso.count({})).toBe(0);
    const ev = marca(40);
    await despachar(ctx, ev);
    await despachar(ctx, ev); // reintento del despacho
    const avisos = await ctx.db.slackAviso.findMany({});
    expect(avisos).toHaveLength(1);
    expect(avisos[0]).toMatchObject({ tipo: "atraso", envio: "pendiente", canalId: CANAL.id });
    expect(avisos[0]?.titulo).toContain("40 min tarde en Bodega Norte");
  });

  it("los avisos van en un hilo por instalación y día, con «Tomar» y «Ver en OPAI»", async () => {
    const ctx = await conectadoConCanal();
    await despachar(ctx, marca(40));
    await despachar(ctx, marca(50));
    await correrTrabajos(ctx, "core.slack.aviso_enviar");
    // Un padre y dos respuestas en su hilo: nunca un canal por instalación.
    expect(metodos()).toEqual(["chat.postMessage", "chat.postMessage", "chat.postMessage"]);
    expect(await ctx.db.slackHilo.count({})).toBe(1);
    const avisos = await ctx.db.slackAviso.findMany({});
    expect(
      avisos.every((a) => a.envio === "enviado" && a.hiloTs === avisos[0]?.hiloTs && a.ts),
    ).toBe(true);
  });

  it("fuera de zona está apagado por defecto y se avisa al activarlo", async () => {
    const ctx = await conectadoConCanal();
    await despachar(ctx, marca(0, { gpsEstado: "fuera", distanciaM: 850 }));
    expect(await ctx.db.slackAviso.count({})).toBe(0);
    await executeCapability(ctx, "core.slack.configurar", { avisos: { fueraDeZona: true } });
    await despachar(ctx, marca(0, { gpsEstado: "fuera", distanciaM: 850 }));
    expect(await ctx.db.slackAviso.findFirst({})).toMatchObject({
      tipo: "fuera_de_zona",
      detalle: "A unos 850 m del punto de la instalación.",
    });
  });

  it("si la app no está en el canal, el aviso queda fallido sin reintentos; un corte se reintenta", async () => {
    const ctx = await conectadoConCanal();
    await despachar(ctx, marca(40));
    respuestas["chat.postMessage"] = { ok: false, error: "sin_respuesta_simulada" };
    const t = (await ctx.db.trabajo.findMany({ where: { tipo: "core.slack.aviso_enviar" } }))[0];
    await expect(
      obtenerTrabajo("core.slack.aviso_enviar")?.ejecutar(ctx, t?.payload),
    ).rejects.toThrow();
    respuestas["chat.postMessage"] = { ok: false, error: "not_in_channel" };
    expect(await obtenerTrabajo("core.slack.aviso_enviar")?.ejecutar(ctx, t?.payload)).toEqual({
      fallido: "not_in_channel",
    });
    expect(await ctx.db.slackAviso.findFirst({})).toMatchObject({
      envio: "fallido",
      error: "Slack: not_in_channel",
    });
  });

  it("la ausencia trae la instalación y se avisa por defecto", async () => {
    const ctx = await conectadoConCanal();
    await despachar(
      ctx,
      evento("asistencia.alerta.sin_marca_inicio", {
        personaId: PERS,
        tipo: "sin_marca_inicio",
        clave: "turno:1",
        instalacionId: INST,
        turno: { inicio: "12-11-2026 08:00", lugar: "Bodega Norte" },
      }),
    );
    expect(await ctx.db.slackAviso.findFirst({})).toMatchObject({
      tipo: "ausencia",
      instalacionId: INST,
    });
  });
});

describe("Slack F3: pánico", () => {
  const panico = () =>
    evento("core.terreno.panico", {
      panicoId: "0192f3a0-0000-7000-8000-000000000a99",
      instalacionId: INST,
      personaId: PERS,
    });

  it("va al canal y por mensaje directo al supervisor a cargo, si la empresa lo activa", async () => {
    const ctx = await conectadoConCanal({ panico: { mensajeDirectoSupervisor: true } });
    await despachar(ctx, panico());
    // El mensaje directo no depende del canal: aunque la app no esté en el canal, llega igual.
    respuestas["chat.postMessage"] = (c: URLSearchParams) =>
      c.get("channel") === CANAL.id
        ? { ok: false, error: "not_in_channel" }
        : { ok: true, ts: "1.000200" };
    await correrTrabajos(ctx, "core.slack.aviso_enviar");
    await correrTrabajos(ctx, "core.slack.panico_directo");
    const dm = llamadas.filter((l) => l.metodo === "conversations.open");
    expect(dm).toHaveLength(1);
    expect(await ctx.db.slackAviso.findFirst({})).toMatchObject({
      tipo: "panico",
      envio: "fallido",
    });
  });

  it("una marca sincronizada tarde sin conexión no se avisa como atraso", async () => {
    const ctx = await conectadoConCanal();
    await despachar(ctx, marca(120, { origen: "offline_queue" }));
    expect(await ctx.db.slackAviso.count({})).toBe(0);
  });

  it("escala al grupo si nadie lo toma; si ya lo tomaron, no", async () => {
    const ctx = await conectadoConCanal({
      panico: { escalar: true, escalarAGrupoId: GRUPO, escalarMinutos: 5 },
    });
    await despachar(ctx, panico());
    const esc = (
      await ctx.db.trabajo.findMany({ where: { tipo: "core.slack.panico_escalar" } })
    )[0];
    expect(esc?.programadoPara.getTime()).toBeGreaterThan(Date.now() + 4 * 60_000);
    await correrTrabajos(ctx, "core.slack.aviso_enviar");
    llamadas.length = 0;
    expect(await obtenerTrabajo("core.slack.panico_escalar")?.ejecutar(ctx, esc?.payload)).toEqual({
      escalado: 1,
    });
    const a = await ctx.db.slackAviso.findFirst({});
    await ctx.db.slackAviso.update({ where: { id: a?.id ?? "" }, data: { gestion: "tomado" } });
    expect(await obtenerTrabajo("core.slack.panico_escalar")?.ejecutar(ctx, esc?.payload)).toEqual({
      omitido: "ya_tomado",
    });
  });
});
