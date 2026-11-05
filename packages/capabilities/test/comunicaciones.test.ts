import { beforeEach, describe, expect, it } from "vitest";

import { consumidorComunicaciones } from "../src/core/comunicaciones";
import type { EventoPublicado } from "../src/eventos/consumidores";
import { contextoDePrueba, USUARIO_DE_PRUEBA } from "../src/testing";
import { codigo, dato, reiniciar } from "./maestros-ayuda";
import { semillaTenant, U2 } from "./semilla";

beforeEach(reiniciar);

const evento = (tipo: string, payload: Record<string, unknown> = {}): EventoPublicado => ({
  id: "0192f3a0-0000-7000-8000-0000000000e1",
  tipo,
  entidadTipo: "integracion",
  entidadId: "resend",
  payload,
  actorTipo: "system",
  actorId: null,
  viaUserId: null,
  createdAt: new Date(),
});

describe("plantillas", () => {
  it("valida variables, versiona, previsualiza con la marca y restablece", async () => {
    const { ctx, tabla } = contextoDePrueba({ semilla: semillaTenant() });
    const base = { evento: "core.integracion.error", canal: "correo" };
    expect(
      await codigo(ctx, "core.plantillas.update", {
        ...base,
        asunto: "Falla {{no.existe}}",
        cuerpo: "x",
      }),
    ).toBe("UNPROCESSABLE");
    const v = await dato<{ version: number }>(ctx, "core.plantillas.update", {
      ...base,
      asunto: "Falla en {{integracion.nombre}}",
      cuerpo: "Error: {{error}}",
    });
    expect(v.version).toBe(1);
    tabla("perfilEmpresa").push({
      tenantId: ctx.tenantId,
      nombreComercial: "Gard",
      colorPrimario: null,
    });
    const p = await dato<{ asunto: string; html: string }>(ctx, "core.plantillas.preview", base);
    expect(p.asunto).toBe("Falla en Correo (Resend)");
    expect(p.html).toContain("Gard");
    await dato(ctx, "core.plantillas.update", {
      ...base,
      asunto: "x",
      cuerpo: "y",
      restablecer: true,
    });
    const g = await dato<{ vigente: { version: number | null } }>(ctx, "core.plantillas.get", base);
    expect(g.vigente.version).toBeNull();
  });

  it("la invitación sale con la plantilla transaccional y queda en envíos", async () => {
    const { ctx, correos, tabla } = contextoDePrueba({ semilla: semillaTenant() });
    await dato(ctx, "core.users.invite", { email: "nuevo@cliente.cl", rol: "viewer" });
    expect(correos[0]?.asunto).toBe("Ana Prueba te invitó a Gard Security en OPAI");
    expect(correos[0]?.html).toContain("Gard Security");
    expect(tabla("envio")).toEqual([
      expect.objectContaining({ plantillaEvento: "core.usuario.invitado", estado: "enviado" }),
    ]);
  });
});

describe("consumidor de comunicaciones", () => {
  it("sin regla no envía; con regla avisa por inapp y correo, respeta el silencio y no duplica", async () => {
    const { ctx, tabla, correos } = contextoDePrueba({ semilla: semillaTenant() });
    const ev = evento("core.integracion.error", { nombre: "Correo (Resend)", error: "401" });
    await consumidorComunicaciones.handler(ctx, ev);
    expect(tabla("envio")).toEqual([
      expect.objectContaining({ estado: "omitido", error: "Sin regla activa." }),
    ]);
    expect(
      await codigo(ctx, "core.notificacion_reglas.set", {
        evento: "core.usuario.invitado",
        canal: "correo",
        roles: ["owner"],
        usuarios: [],
        activa: true,
      }),
    ).toBe("UNPROCESSABLE");
    await dato(ctx, "core.notificacion_reglas.set", {
      evento: ev.tipo,
      canal: "inapp",
      roles: ["owner", "admin"],
      usuarios: [],
      activa: true,
    });
    await dato(ctx, "core.notificacion_reglas.set", {
      evento: ev.tipo,
      canal: "correo",
      roles: ["owner", "admin"],
      usuarios: [],
      activa: true,
    });
    tabla("ajuste").push({
      tenantId: ctx.tenantId,
      ambito: "usuario",
      sujetoId: U2,
      modulo: "core",
      clave: "preferencias_silencio",
      valor: true,
    });
    await consumidorComunicaciones.handler(ctx, ev);
    await consumidorComunicaciones.handler(ctx, ev);
    expect(
      tabla("notificacion")
        .map((n) => n["usuarioId"])
        .sort(),
    ).toEqual([USUARIO_DE_PRUEBA.id, U2].sort());
    expect(correos.map((c) => c.para)).toEqual(["ana@prueba.cl"]);
    const omitido = tabla("envio").find((e) => e["destinatario"] === "beto@prueba.cl");
    expect(omitido).toMatchObject({ estado: "omitido" });
    const inbox = await dato<{ noLeidas: number; items: { id: string; titulo: string }[] }>(
      ctx,
      "core.notificaciones.list",
      {},
    );
    expect(inbox).toMatchObject({ noLeidas: 1, items: [{ titulo: "Error en Correo (Resend)" }] });
    await dato(ctx, "core.notificaciones.marcar_todas", {});
    expect((await dato<{ noLeidas: number }>(ctx, "core.notificaciones.list", {})).noLeidas).toBe(
      0,
    );
  });
});

describe("empresa y marca", () => {
  it("valida colores y que el logo sea una imagen subida", async () => {
    const { ctx, tabla } = contextoDePrueba({ semilla: semillaTenant() });
    expect(await codigo(ctx, "core.marca.update", { colorPrimario: "azul" })).toBe("INVALID_INPUT");
    const pdf = "0192f3a0-0000-7000-8000-0000000000f2";
    tabla("documento").push({
      id: pdf,
      tenantId: ctx.tenantId,
      mime: "application/pdf",
      estado: "disponible",
    });
    expect(await codigo(ctx, "core.marca.update", { logoPrincipalId: pdf })).toBe("UNPROCESSABLE");
    const tipoLogo = "0192f3a0-0000-7000-8000-0000000000f4";
    tabla("documentoTipo").push({
      id: tipoLogo,
      tenantId: ctx.tenantId,
      codigo: "marca.logo",
      nombre: "Logo",
      capa: "empresa",
    });
    const foto = "0192f3a0-0000-7000-8000-0000000000f5";
    tabla("documento").push({
      id: foto,
      tenantId: ctx.tenantId,
      mime: "image/jpeg",
      estado: "disponible",
      tipoId: null,
    });
    tabla("documentoVinculo").push({
      tenantId: ctx.tenantId,
      documentoId: foto,
      entidadTipo: "persona",
      entidadId: "p1",
      rol: "propietario",
    });
    expect(await codigo(ctx, "core.marca.update", { logoPrincipalId: foto })).toBe("UNPROCESSABLE");
    const png = "0192f3a0-0000-7000-8000-0000000000f3";
    tabla("documento").push({
      id: png,
      tenantId: ctx.tenantId,
      mime: "image/png",
      estado: "disponible",
      tipoId: tipoLogo,
    });
    tabla("documentoVinculo").push({
      tenantId: ctx.tenantId,
      documentoId: png,
      entidadTipo: "tenant",
      entidadId: ctx.tenantId,
      rol: "propietario",
    });
    const m = await dato<{ urls: Record<string, string> }>(ctx, "core.marca.update", {
      logoPrincipalId: png,
      nombreComercial: "Gard",
    });
    expect(m.urls["logoPrincipalId"]).toBe("https://test.opai.cl/api/marca/gard/logoPrincipal");
    const e = await dato<{ rut: string | null }>(ctx, "core.empresa.update", {
      razonSocial: "Gard Security SpA",
    });
    expect(e.rut).toBeNull();
  });
});
