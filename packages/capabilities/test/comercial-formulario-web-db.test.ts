import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { sembrarComercial } from "@opai/db";

import { prepararEntorno, type Entorno } from "../../db/test/entorno";
import * as mod from "../src";
import { capacidadesComercial } from "../src/comercial";
import { consumidorSolicitudCreada } from "../src/comercial/consumidor-solicitud";
import { registrarModuloComercial } from "./comercial-modulo";
import { codigo, dato } from "./maestros-ayuda";

// Brief 07 · PR 2: formulario web público (token, idempotencia, UTM, RLS).
describe("comercial · formulario web contra Postgres real", () => {
  let e: Entorno;
  let tenantA = "";
  let tenantB = "";
  let slugA = "";
  const sufijo = randomUUID().slice(0, 8);
  const ctx = (tenantId: string) =>
    mod.crearContexto({
      tenantId,
      rol: "owner",
      actor: { tipo: "system" },
      modulosActivos: ["comercial"],
      servicios: { urlBase: "https://test.opai.cl" },
    });

  beforeAll(async () => {
    e = await prepararEntorno();
    mod.limpiarRegistro();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo, ...capacidadesComercial]);
    registrarModuloComercial();
    slugA = `web-a-${sufijo}`;
    const tb = `web-b-${sufijo}`;
    tenantA = (await e.admin.tenant.create({ data: { slug: slugA, nombre: slugA, vertical: "seguridad" } }))
      .id;
    tenantB = (await e.admin.tenant.create({ data: { slug: tb, nombre: tb, vertical: "seguridad" } })).id;
    await sembrarComercial(e.admin.$extends({}), tenantA);
    await sembrarComercial(e.admin.$extends({}), tenantB);
  });
  afterAll(async () => {
    await e?.cerrar();
  });

  it("rotar clave conecta el canal y recibir crea solicitud con UTM", async () => {
    const rot = await dato<{ token: string; tokenSufijo: string; endpoint: string }>(
      ctx(tenantA),
      "comercial.canales.rotar_token_formulario",
      {},
    );
    expect(rot.endpoint).toBe(`/api/t/${slugA}/solicitudes`);
    const canales = await dato<{ canal: string; estado: string; tokenSufijo: string | null }[]>(
      ctx(tenantA),
      "comercial.canales.get",
      {},
    );
    const web = canales.find((c) => c.canal === "formulario_web");
    expect(web).toMatchObject({ estado: "conectado", tokenSufijo: rot.tokenSufijo });

    const payload = {
      token: rot.token,
      mensaje: "Necesito cotizar guardias",
      nombre: "Cliente Web",
      email: `web-${sufijo}@ejemplo.cl`,
      website: "",
      utmSource: "google",
      utmMedium: "cpc",
      paginaOrigen: "https://www.gard.cl/contacto",
    };
    const creada = await dato<{ id: string; creadaEn: string }>(
      ctx(tenantA),
      "comercial.solicitudes.recibir_formulario_web",
      payload,
      { idempotencyKey: `frm-${sufijo}-1` },
    );
    const fila = await e.admin.solicitud.findUniqueOrThrow({ where: { id: creada.id } });
    expect(fila).toMatchObject({
      tenantId: tenantA,
      canal: "formulario_web",
      estado: "nueva",
      utmSource: "google",
      utmMedium: "cpc",
      paginaOrigen: "https://www.gard.cl/contacto",
      registradaPorTipo: "sistema",
    });

    const otra = await dato<{ id: string }>(
      ctx(tenantA),
      "comercial.solicitudes.recibir_formulario_web",
      payload,
      { idempotencyKey: `frm-${sufijo}-1` },
    );
    expect(otra.id).toBe(creada.id);
    expect(await e.admin.solicitud.count({ where: { tenantId: tenantA } })).toBe(1);
  });

  it("rechaza clave inválida, honeypot e idempotencia distinta", async () => {
    const rot = await dato<{ token: string }>(ctx(tenantA), "comercial.canales.rotar_token_formulario", {});
    expect(
      await codigo(ctx(tenantA), "comercial.solicitudes.recibir_formulario_web", {
        token: "opai_frm_invalido",
        mensaje: "x",
        email: "a@b.cl",
        website: "",
      }),
    ).toBe("UNPROCESSABLE");
    expect(
      await codigo(
        ctx(tenantA),
        "comercial.solicitudes.recibir_formulario_web",
        {
          token: rot.token,
          mensaje: "spam",
          email: "a@b.cl",
          website: "http://spam",
        },
        { idempotencyKey: `frm-${sufijo}-hp` },
      ),
    ).toBe("INVALID_INPUT");
    await dato(ctx(tenantA), "comercial.solicitudes.recibir_formulario_web", {
      token: rot.token,
      mensaje: "uno",
      email: `idemp-${sufijo}@ejemplo.cl`,
      website: "",
    }, { idempotencyKey: `frm-${sufijo}-dup` });
    expect(
      await codigo(
        ctx(tenantA),
        "comercial.solicitudes.recibir_formulario_web",
        {
          token: rot.token,
          mensaje: "otro",
          email: `idemp-${sufijo}@ejemplo.cl`,
          website: "",
        },
        { idempotencyKey: `frm-${sufijo}-dup` },
      ),
    ).toBe("CONFLICT");
  });

  it("otra empresa no reutiliza el token ni ve solicitudes (RLS)", async () => {
    const rot = await dato<{ token: string }>(ctx(tenantA), "comercial.canales.rotar_token_formulario", {});
    const s = await dato<{ id: string }>(
      ctx(tenantA),
      "comercial.solicitudes.recibir_formulario_web",
      {
        token: rot.token,
        mensaje: "aislada",
        email: `aisl-${sufijo}@ejemplo.cl`,
        website: "",
      },
      { idempotencyKey: `frm-${sufijo}-rls` },
    );
    expect(
      await codigo(ctx(tenantB), "comercial.solicitudes.recibir_formulario_web", {
        token: rot.token,
        mensaje: "intruso",
        email: "x@y.cl",
        website: "",
      }, { idempotencyKey: `frm-${sufijo}-rls-b` }),
    ).toBe("UNPROCESSABLE");
    const lista = await dato<{ items: { id: string }[] }>(ctx(tenantB), "comercial.solicitudes.list", {});
    expect(lista.items.some((i) => i.id === s.id)).toBe(false);
  });

  it("avisar al responsable crea notificación in-app idempotente", async () => {
    const u = await e.admin.user.create({
      data: { email: `resp-web-${sufijo}@ejemplo.cl`, name: "Resp", emailVerified: true },
    });
    await e.admin.membership.create({
      data: { tenantId: tenantA, userId: u.id, rol: "gerente", estado: "activa" },
    });
    await dato(ctx(tenantA), "comercial.canales.update", {
      canal: "formulario_web",
      responsableId: u.id,
    });
    const rot = await dato<{ token: string }>(ctx(tenantA), "comercial.canales.rotar_token_formulario", {});
    await dato(
      ctx(tenantA),
      "comercial.solicitudes.recibir_formulario_web",
      {
        token: rot.token,
        mensaje: "con responsable",
        email: `resp-msg-${sufijo}@ejemplo.cl`,
        website: "",
      },
      { idempotencyKey: `frm-${sufijo}-notif` },
    );
    const ev = await e.admin.evento.findFirst({
      where: { tenantId: tenantA, tipo: "comercial.solicitud.creada" },
      orderBy: { createdAt: "desc" },
    });
    expect(ev).not.toBeNull();
    const c = ctx(tenantA);
    await consumidorSolicitudCreada.handler(c, {
      id: ev!.id,
      tipo: ev!.tipo,
      entidadTipo: ev!.entidadTipo,
      entidadId: ev!.entidadId,
      payload: ev!.payload,
      actorTipo: ev!.actorTipo,
      actorId: ev!.actorId,
      viaUserId: ev!.viaUserId,
      createdAt: ev!.createdAt,
    });
    const n = await e.admin.notificacion.count({ where: { tenantId: tenantA, usuarioId: u.id } });
    expect(n).toBe(1);
  });
});
