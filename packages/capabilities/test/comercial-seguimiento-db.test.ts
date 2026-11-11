import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { resolverTokenSeguimiento, sembrarComercial } from "@opai/db";

import { prepararEntorno, type Entorno } from "../../db/test/entorno";
import * as mod from "../src";
import { capacidadesComercial } from "../src/comercial";
import { trabajoVencerPasosSeguimiento } from "../src/comercial/seguimiento-trabajo";
import { codigo, dato } from "./maestros-ayuda";

// CAR-67: seguimiento comercial contra Postgres real (días hábiles, trabajo, respuesta, tenant, RLS).
describe("comercial · seguimiento contra Postgres real", () => {
  let e: Entorno;
  const medidor = { registrar: async () => undefined };
  const ctx = (tenantId: string) =>
    mod.crearContexto({ tenantId, actor: { tipo: "system" }, rol: "owner", modulosActivos: ["comercial"], medidor });
  async function empresa(nombre: string) {
    const t = await e.admin.tenant.create({ data: { slug: `seg-${randomUUID().slice(0, 8)}`, nombre, vertical: "seguridad" } });
    await sembrarComercial(e.admin.$extends({}), t.id);
    const c = ctx(t.id);
    const cuenta = await dato<{ id: string }>(c, "core.cuentas.create", { nombre });
    const negocio = await dato<{ id: string }>(c, "comercial.negocios.create", { cuentaId: cuenta.id, titulo: `Negocio ${nombre}` });
    return { tenantId: t.id, c, negocioId: negocio.id };
  }
  let A: Awaited<ReturnType<typeof empresa>>;
  let B: Awaited<ReturnType<typeof empresa>>;

  beforeAll(async () => {
    e = await prepararEntorno();
    mod.limpiarRegistro();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo, ...capacidadesComercial]);
    A = await empresa("Alfa");
    B = await empresa("Beta");
  });
  afterAll(async () => {
    await e?.cerrar();
  });

  it("la siembra deja un plan por defecto por vertical, idempotente", async () => {
    await sembrarComercial(e.admin.$extends({}), A.tenantId);
    const planes = await dato<{ porDefecto: boolean; version: number; config: { pasos: unknown[] } }[]>(A.c, "comercial.seguimiento_planes.list", {});
    expect(planes).toHaveLength(1);
    expect(planes[0]).toMatchObject({ porDefecto: true, version: 1 });
    expect(planes[0]?.config.pasos).toHaveLength(4);
  });

  it("inicia con pasos en días hábiles y no permite dos vivos sin reemplazar", async () => {
    const ancla = "2026-10-26T13:00:00.000Z"; // lunes
    const s = await dato<{ id: string; pasos: { programadoEn: string }[]; estado: string }>(A.c, "comercial.seguimientos.iniciar", { negocioId: A.negocioId, ancla });
    expect(s.estado).toBe("activo");
    expect(s.pasos).toHaveLength(4);
    const dias = s.pasos.map((p) => new Date(p.programadoEn).getTime());
    expect([...dias].sort((a, b) => a - b)).toEqual(dias);
    expect(await codigo(A.c, "comercial.seguimientos.iniciar", { negocioId: A.negocioId })).toBe("UNPROCESSABLE");
    const nuevo = await dato<{ id: string }>(A.c, "comercial.seguimientos.iniciar", { negocioId: A.negocioId, ancla, reemplazar: true });
    const viejo = await e.admin.seguimiento.findUnique({ where: { id: s.id } });
    expect(viejo).toMatchObject({ estado: "cancelado", motivo: "reemplazado" });
    expect(nuevo.id).not.toBe(s.id);
  });

  it("el trabajo vence el paso de persona y crea la tarea del vendedor", async () => {
    const s = await e.admin.seguimiento.findFirstOrThrow({ where: { negocioId: A.negocioId, estado: "activo" } });
    const paso = await e.admin.seguimientoPaso.findFirstOrThrow({ where: { seguimientoId: s.id, orden: 1 } });
    expect(paso.estado).toBe("programado");
    const r = await trabajoVencerPasosSeguimiento.ejecutar(A.c, { hora: "x" });
    expect(r).toMatchObject({ fallidos: expect.any(Number) });
    const despues = await e.admin.seguimientoPaso.findUniqueOrThrow({ where: { id: paso.id } });
    expect(["por_hacer", "fallido", "hecho"]).toContain(despues.estado);
  });

  it("«El cliente respondió» pausa el seguimiento y deja nota; no se registra dos veces el mismo correo", async () => {
    const s = await e.admin.seguimiento.findFirstOrThrow({ where: { negocioId: A.negocioId, estado: "activo" } });
    const r = await dato<{ estado: string }>(A.c, "comercial.seguimientos.registrar_respuesta", { id: s.id, detalle: "Llamó pidiendo cambios" });
    expect(r.estado).toBe("pausado");
    const entrante = { seguimientoId: s.id, mensajeId: "msg-1", remitente: "ana@cliente.cl", asunto: "Re: asunto-reservado", texto: "texto-reservado", recibidoEn: new Date().toISOString() };
    expect((await dato<{ registrado: boolean }>(A.c, "comercial.seguimientos.recibir_correo", entrante)).registrado).toBe(true);
    expect((await dato<{ registrado: boolean }>(A.c, "comercial.seguimientos.recibir_correo", entrante)).registrado).toBe(false);
    expect(await e.admin.seguimientoEntrante.count({ where: { seguimientoId: s.id } })).toBe(1);
    // CAR-297: la auditoría no guarda el contenido del correo del cliente.
    const aud = await e.admin.auditEvent.findFirstOrThrow({ where: { tenantId: A.tenantId, capability: "comercial.seguimientos.recibir_correo" } });
    expect(JSON.stringify(aud.payload)).not.toMatch(/ana@cliente|asunto-reservado|texto-reservado/);
  });

  it("reanudar vuelve a activo y ganar el negocio termina el seguimiento", async () => {
    const s = await e.admin.seguimiento.findFirstOrThrow({ where: { negocioId: A.negocioId, estado: "pausado" } });
    expect((await dato<{ estado: string }>(A.c, "comercial.seguimientos.controlar", { id: s.id, accion: "reanudar" })).estado).toBe("activo");
    await mod.consumidorSeguimientoCierre.handler(A.c, { id: randomUUID(), tipo: "comercial.negocio.ganado", entidadTipo: "negocio", entidadId: A.negocioId, payload: {}, actorTipo: "system", actorId: null, viaUserId: null, createdAt: new Date() });
    expect(await e.admin.seguimiento.findUniqueOrThrow({ where: { id: s.id } })).toMatchObject({ estado: "terminado", motivo: "ganado" });
  });

  it("otra empresa no ve ni toca el seguimiento ni resuelve su token como propio", async () => {
    const s = await e.admin.seguimiento.findFirstOrThrow({ where: { negocioId: A.negocioId } });
    expect(await dato(B.c, "comercial.seguimientos.get", { id: s.id }).catch(() => "NO")).toBe("NO");
    expect(await codigo(B.c, "comercial.seguimientos.registrar_respuesta", { id: s.id })).toBe("NOT_FOUND");
    expect(await resolverTokenSeguimiento(s.token)).toEqual({ tenantId: A.tenantId, seguimientoId: s.id });
    expect(await resolverTokenSeguimiento("s" + "0".repeat(32))).toBeNull();
    expect(await resolverTokenSeguimiento("no-valido' OR 1=1")).toBeNull();
  });
});
