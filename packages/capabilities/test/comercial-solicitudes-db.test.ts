import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { sembrarComercial } from "@opai/db";

import { prepararEntorno, type Entorno } from "../../db/test/entorno";
import * as mod from "../src";
import { capacidadesComercial } from "../src/comercial";
import { codigo, dato } from "./maestros-ayuda";

// Leads PR 1: solicitudes contra Postgres real (RLS sin BYPASSRLS): aislamiento entre empresas,
// flujo de estados, auditoría y conversión en un paso que reutiliza cuenta y contacto.
type Sol = { id: string; estado: string; canal: string; duplicadaDeId: string | null };
type Conv = {
  plan: { cuenta: { accion: string }; contacto: { accion: string } };
  solicitud: Sol;
  negocioId: string | null;
  cuentaId: string | null;
  contactoId: string | null;
};

describe("comercial · solicitudes contra Postgres real", () => {
  let e: Entorno;
  let a = "";
  let b = "";
  const sufijo = randomUUID().slice(0, 8);
  const ctx = (tenantId: string, rol: "owner" | "viewer" | "gerente" = "owner") =>
    mod.crearContexto({ tenantId, rol, actor: { tipo: "system" }, modulosActivos: ["comercial"] });

  beforeAll(async () => {
    e = await prepararEntorno();
    mod.limpiarRegistro();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo, ...capacidadesComercial]);
    const nuevo = (slug: string) =>
      e.admin.tenant.create({ data: { slug, nombre: slug, vertical: "seguridad" } });
    a = (await nuevo(`sol-a-${sufijo}`)).id;
    b = (await nuevo(`sol-b-${sufijo}`)).id;
    await sembrarComercial(e.admin.$extends({}), a);
    await sembrarComercial(e.admin.$extends({}), b);
  });
  afterAll(async () => {
    await e?.cerrar();
  });

  const crear = (t: string, extra: Record<string, unknown> = {}) =>
    dato<Sol>(ctx(t), "comercial.solicitudes.create", {
      textoOriginal: "Necesitamos guardias para una bodega.",
      nombre: "Ana Pérez Soto",
      empresa: "Atlas Seguridad SpA",
      email: "ana@atlas.example",
      ...extra,
    });

  it("entra siempre como «nueva», canal manual, y la vista previa no escribe", async () => {
    const previa = await dato<Sol>(
      ctx(a),
      "comercial.solicitudes.create",
      { textoOriginal: "Hola" },
      { dryRun: true },
    );
    expect(previa).toMatchObject({ estado: "nueva", canal: "manual" });
    expect(await e.admin.solicitud.count({ where: { tenantId: a } })).toBe(0);
    const s = await crear(a);
    expect(s).toMatchObject({ estado: "nueva", canal: "manual" });
    const fila = await e.admin.solicitud.findUniqueOrThrow({ where: { id: s.id } });
    expect(fila.textoOriginal).toBe("Necesitamos guardias para una bodega.");
    const auditoria = await e.admin.auditEvent.findFirst({
      where: { tenantId: a, capability: "comercial.solicitudes.create" },
    });
    expect(auditoria).not.toBeNull();
  });

  it("otra empresa no ve ni toca las solicitudes (RLS)", async () => {
    const s = await crear(a, { email: "aislada@atlas.example" });
    const lista = await dato<{ items: Sol[] }>(ctx(b), "comercial.solicitudes.list", {});
    expect(lista.items).toHaveLength(0);
    expect(await codigo(ctx(b), "comercial.solicitudes.get", { id: s.id })).toBe("NOT_FOUND");
    expect(await codigo(ctx(b), "comercial.solicitudes.derivar", { id: s.id })).toBe("NOT_FOUND");
    expect(
      await e.admin.solicitud.count({ where: { id: s.id, tenantId: a, estado: "nueva" } }),
    ).toBe(1);
  });

  it("derivar, descartar con motivo, reabrir y marcar duplicada", async () => {
    const s = await crear(a, { email: "flujo@atlas.example" });
    const d = await dato<Sol>(ctx(a), "comercial.solicitudes.derivar", { id: s.id });
    expect(d.estado).toBe("en_revision");
    expect(await codigo(ctx(a), "comercial.solicitudes.derivar", { id: s.id })).toBe(
      "UNPROCESSABLE",
    );
    expect(await codigo(ctx(a), "comercial.solicitudes.descartar", { id: s.id })).toBe(
      "INVALID_INPUT",
    );
    const x = await dato<Sol>(ctx(a), "comercial.solicitudes.descartar", {
      id: s.id,
      motivo: "Es un proveedor",
    });
    expect(x.estado).toBe("descartada");
    const r = await dato<Sol>(ctx(a), "comercial.solicitudes.reabrir", { id: s.id });
    expect(r.estado).toBe("en_revision");
    const otra = await crear(a, { email: "flujo2@atlas.example" });
    const dup = await dato<Sol>(ctx(a), "comercial.solicitudes.marcar_duplicada", {
      id: otra.id,
      originalId: s.id,
    });
    expect(dup).toMatchObject({ estado: "descartada", duplicadaDeId: s.id });
    expect(
      await codigo(ctx(a), "comercial.solicitudes.marcar_duplicada", {
        id: s.id,
        originalId: s.id,
      }),
    ).toBe("UNPROCESSABLE");
    const reab = await dato<Sol>(ctx(a), "comercial.solicitudes.reabrir", { id: otra.id });
    expect(reab.duplicadaDeId).toBeNull();
  });

  it("convertir crea cuenta, contacto y negocio; la segunda reutiliza por correo y RUT", async () => {
    const s1 = await crear(a, {
      email: "conv@atlas.example",
      rut: "76.543.210-3",
      servicio: "Guardias 24/7",
    });
    const previa = await dato<Conv>(
      ctx(a),
      "comercial.solicitudes.convertir",
      { id: s1.id },
      { dryRun: true },
    );
    expect(previa.plan.cuenta.accion).toBe("crea");
    expect(previa.negocioId).toBeNull();
    expect(await e.admin.negocio.count({ where: { tenantId: a } })).toBe(0);

    const r1 = await dato<Conv>(ctx(a), "comercial.solicitudes.convertir", { id: s1.id });
    expect(r1.solicitud.estado).toBe("convertida");
    expect(r1.negocioId && r1.cuentaId && r1.contactoId).toBeTruthy();
    const neg = await e.admin.negocio.findUniqueOrThrow({ where: { id: r1.negocioId as string } });
    expect(neg.titulo).toBe("Atlas Seguridad SpA · Guardias 24/7");
    expect(neg.estado).toBe("abierto");
    expect(await codigo(ctx(a), "comercial.solicitudes.convertir", { id: s1.id })).toBe(
      "UNPROCESSABLE",
    );

    const s2 = await crear(a, { email: "conv@atlas.example", empresa: "Otra razón social" });
    const r2 = await dato<Conv>(ctx(a), "comercial.solicitudes.convertir", { id: s2.id });
    expect(r2.plan).toMatchObject({
      cuenta: { accion: "reutiliza" },
      contacto: { accion: "reutiliza" },
    });
    expect(r2.cuentaId).toBe(r1.cuentaId);
    expect(r2.contactoId).toBe(r1.contactoId);
    expect(await e.admin.cuenta.count({ where: { tenantId: a, rut: "76543210-3" } })).toBe(1);

    const s3 = await crear(a, { email: "otro@atlas.example", rut: "76543210-3" });
    const r3 = await dato<Conv>(ctx(a), "comercial.solicitudes.convertir", { id: s3.id });
    expect(r3.plan.cuenta.accion).toBe("reutiliza");
    expect(r3.cuentaId).toBe(r1.cuentaId);
    expect(r3.plan.contacto.accion).toBe("crea");
  });

  it("sin nombre de empresa ni de persona no se puede crear la cuenta", async () => {
    const s = await dato<Sol>(ctx(a), "comercial.solicitudes.create", { textoOriginal: "Hola" });
    expect(await codigo(ctx(a), "comercial.solicitudes.convertir", { id: s.id })).toBe(
      "UNPROCESSABLE",
    );
  });

  it("permisos: viewer sin acceso; gerente no configura canales", async () => {
    expect(await codigo(ctx(a, "viewer"), "comercial.solicitudes.list", {})).toBe("FORBIDDEN");
    expect(await codigo(ctx(a, "gerente"), "comercial.solicitudes.list", {})).toBe("OK");
    expect(await codigo(ctx(a, "gerente"), "comercial.canales.get", {})).toBe("FORBIDDEN");
    expect(await codigo(ctx(a), "comercial.canales.get", {})).toBe("OK");
  });

  it("canales: por defecto web y correo sin conectar; se configura el responsable", async () => {
    const lista = await dato<{ canal: string; estado: string }[]>(
      ctx(a),
      "comercial.canales.get",
      {},
    );
    expect(lista.map((c) => `${c.canal}:${c.estado}`)).toEqual([
      "formulario_web:sin_conectar",
      "correo:sin_conectar",
      "agente:conectado",
      "manual:conectado",
    ]);
    const u = await e.admin.user.create({
      data: { email: `resp-${sufijo}@atlas.example`, name: "Resp", emailVerified: true },
    });
    await e.admin.membership.create({
      data: { tenantId: a, userId: u.id, rol: "gerente", estado: "activa" },
    });
    const c = await dato<{ responsableId: string | null }>(ctx(a), "comercial.canales.update", {
      canal: "manual",
      responsableId: u.id,
    });
    expect(c.responsableId).toBe(u.id);
    expect(
      await codigo(ctx(a), "comercial.canales.update", {
        canal: "correo",
        dominioAutorizado: "a.cl",
      }),
    ).toBe("UNPROCESSABLE");
    const s = await crear(a, { email: "canal@atlas.example" });
    const fila = await e.admin.solicitud.findUniqueOrThrow({ where: { id: s.id } });
    expect(fila.responsableId).toBe(u.id);
    expect(await e.admin.canalSolicitud.count({ where: { tenantId: b } })).toBe(0);
  });
});
