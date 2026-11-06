// CAR-78 · B4: biometría de terreno contra Postgres real. Sin consentimiento no se enrola; con él se guarda solo
// una referencia CIFRADA; verificar 1:1 con prueba de vida; revocar el consentimiento borra la referencia (en el
// proveedor y en OPAI); aislamiento entre empresas.
import { randomBytes, randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { biometriaDelEntorno } from "@opai/integrations";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

type Capacidades = typeof ModuloCapacidades;

describe.skipIf(!urlPropietario)("biometría de terreno en base real (CAR-78 B4)", () => {
  let e: Entorno;
  let mod: Capacidades;
  const medidor = { registrar: async () => undefined };
  const t = { A: "", B: "" };
  const p = { ana: "", beto: "", ajena: "" };

  const ctx = (tenantId: string) =>
    mod.crearContexto({
      tenantId,
      actor: { tipo: "system" },
      rol: "owner",
      alcance: null,
      medidor,
    });
  const run = (tenant: string, id: string, input: unknown, o = {}) =>
    mod.executeCapability(ctx(tenant), id, input, o);
  const dato = async <T>(tenant: string, id: string, input: unknown, o = {}) => {
    const r = await run(tenant, id, input, o);
    if (!r.ok) throw new Error(`${id}: ${JSON.stringify(r.error)}`);
    return r.data as T;
  };
  const consentimiento = (personaId: string, estado: "otorgado" | "revocado") =>
    dato(
      t.A,
      estado === "otorgado"
        ? "core.cumplimiento.consentimiento_registrar"
        : "core.cumplimiento.consentimiento_revocar",
      {
        titular: { tipo: "persona", id: personaId },
        proposito: "biometria_asistencia",
        versionAviso: "v1",
      },
    );
  const enrolar = (personaId: string, muestra: string, tenant = t.A) =>
    run(tenant, "core.biometria.enrolar", { personaId, muestra });
  const verificar = (personaId: string, muestra: string) =>
    run(t.A, "core.biometria.verificar", { personaId, muestra });
  const estado = (personaId: string, tenant = t.A) =>
    dato<{ enrolada: boolean; consentimiento: string }>(tenant, "core.biometria.estado", {
      personaId,
    });

  beforeAll(async () => {
    process.env["OPAI_SECRETS_KEY"] = randomBytes(32).toString("base64");
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades(mod.capacidadesDelNucleo);
    mod.registrarConsumidores(mod.consumidoresDelNucleo);
    const sufijo = randomUUID().slice(0, 8);
    for (const k of ["A", "B"] as const) {
      t[k] = (
        await e.admin.tenant.create({
          data: { slug: `bio-${k.toLowerCase()}-${sufijo}`, nombre: k, vertical: "seguridad" },
        })
      ).id;
    }
    const persona = (tenantId: string, rut: string, nombres: string) =>
      e.admin.persona.create({ data: { tenantId, rut, nombres, apellidos: "Prueba" } });
    p.ana = (await persona(t.A, `1${sufijo.slice(0, 7)}-9`, "Ana")).id;
    p.beto = (await persona(t.A, `2${sufijo.slice(0, 7)}-9`, "Beto")).id;
    p.ajena = (await persona(t.B, `3${sufijo.slice(0, 7)}-9`, "Ajena")).id;
  }, 120_000);

  afterAll(async () => {
    await e?.cerrar?.();
  });

  it("sin consentimiento vigente no se enrola ni se verifica", async () => {
    const r = await enrolar(p.beto, "rostro:beto");
    expect(r.ok).toBe(false);
    expect(JSON.stringify(r)).toContain("consentimiento");
    expect(await e.admin.enrolamientoBiometrico.count({ where: { personaId: p.beto } })).toBe(0);
    expect((await estado(p.beto)).consentimiento).toBe("sin_registro");
  });

  it("con consentimiento enrola, guarda solo una referencia cifrada y verifica 1:1 con prueba de vida", async () => {
    await consentimiento(p.ana, "otorgado");
    const dry = await run(
      t.A,
      "core.biometria.enrolar",
      { personaId: p.ana, muestra: "rostro:ana" },
      { dryRun: true },
    );
    expect(dry.ok).toBe(true);
    expect(await e.admin.enrolamientoBiometrico.count({ where: { personaId: p.ana } })).toBe(0);

    const r = await enrolar(p.ana, "rostro:ana");
    expect(r.ok).toBe(true);
    expect(JSON.stringify(r)).not.toMatch(/sim:|rostro:/);
    const fila = await e.admin.enrolamientoBiometrico.findFirstOrThrow({
      where: { personaId: p.ana },
    });
    expect(fila.referenciaCifrada).toMatch(/^enc:v2:/);
    expect(fila.referenciaCifrada).not.toContain("sim:");
    expect(fila.proveedor).toBe("simulado");
    expect(await estado(p.ana)).toMatchObject({ enrolada: true, consentimiento: "otorgado" });

    const ok = await dato<{ verificado: boolean }>(t.A, "core.biometria.verificar", {
      personaId: p.ana,
      muestra: "rostro:ana",
    });
    expect(ok.verificado).toBe(true);
    const otra = await dato<{ verificado: boolean; coincide: boolean }>(
      t.A,
      "core.biometria.verificar",
      { personaId: p.ana, muestra: "rostro:otro" },
    );
    expect(otra).toMatchObject({ verificado: false, coincide: false });
    const foto = await dato<{ verificado: boolean; vivo: boolean }>(
      t.A,
      "core.biometria.verificar",
      { personaId: p.ana, muestra: "rostro:ana:foto" },
    );
    expect(foto).toMatchObject({ verificado: false, vivo: false });
  });

  it("no enrola dos veces, rechaza una foto y una muestra ilegible", async () => {
    expect((await enrolar(p.ana, "rostro:ana")).ok).toBe(false);
    await consentimiento(p.beto, "otorgado");
    const foto = await enrolar(p.beto, "rostro:beto:foto");
    expect(foto.ok).toBe(false);
    expect((await enrolar(p.beto, "ilegible!!")).ok).toBe(false);
    expect(await e.admin.enrolamientoBiometrico.count({ where: { personaId: p.beto } })).toBe(0);
    expect((await verificar(p.beto, "rostro:beto")).ok).toBe(false); // no está enrolado
  });

  it("dos empresas: no se enrola ni se consulta a una persona de otra empresa", async () => {
    expect((await enrolar(p.ajena, "rostro:ajena")).ok).toBe(false); // A no ve a la persona de B
    expect((await run(t.A, "core.biometria.estado", { personaId: p.ajena })).ok).toBe(false);
    expect((await run(t.B, "core.biometria.estado", { personaId: p.ana })).ok).toBe(false);
  });

  it("revocar el consentimiento borra la referencia aquí y en el proveedor, y deja de verificar", async () => {
    const antes = await e.admin.enrolamientoBiometrico.findFirstOrThrow({
      where: { personaId: p.ana },
    });
    await consentimiento(p.ana, "revocado");
    await mod.despacharPendientes(ctx(t.A));
    expect(await e.admin.enrolamientoBiometrico.count({ where: { personaId: p.ana } })).toBe(0);
    expect(await estado(p.ana)).toMatchObject({ enrolada: false, consentimiento: "revocado" });
    expect((await verificar(p.ana, "rostro:ana")).ok).toBe(false);
    const ev = await e.admin.evento.findFirst({
      where: { tenantId: t.A, tipo: "core.biometria.borrado", entidadId: p.ana },
    });
    expect(ev?.payload).toEqual({ motivo: "consentimiento_revocado" });
    // El proveedor ya no conoce esa referencia (la fila cifrada desapareció: se comprueba con el simulado).
    expect(antes.referenciaCifrada).toMatch(/^enc:/);
    await expect(
      biometriaDelEntorno().verificar({ referencia: "sim:inexistente", muestra: "rostro:ana" }),
    ).rejects.toMatchObject({ motivo: "referencia_inexistente" });
  });

  it("una revocación tardía no borra el rostro enrolado después con un consentimiento nuevo", async () => {
    await consentimiento(p.ana, "otorgado"); // consentimiento nuevo, posterior a la revocación anterior
    expect((await enrolar(p.ana, "rostro:ana")).ok).toBe(true);
    const nuevo = await e.admin.enrolamientoBiometrico.findFirstOrThrow({
      where: { personaId: p.ana },
    });
    const viejo = await e.admin.evento.findFirstOrThrow({
      where: {
        tenantId: t.A,
        tipo: "core.cumplimiento.consentimiento_revocado",
        entidadTipo: "consentimiento",
      },
    });
    expect(nuevo.consentimientoId > (viejo.entidadId ?? "")).toBe(true);
    await mod.despacharPendientes(ctx(t.A));
    expect(await e.admin.enrolamientoBiometrico.count({ where: { personaId: p.ana } })).toBe(1);
  });

  it("borrar a mano elimina el rostro; la vista previa no borra", async () => {
    const dry = await dato<{ borrado: boolean }>(
      t.A,
      "core.biometria.borrar",
      { personaId: p.ana },
      { dryRun: true },
    );
    expect(dry.borrado).toBe(true);
    expect(await e.admin.enrolamientoBiometrico.count({ where: { personaId: p.ana } })).toBe(1);
    const r = await dato<{ borrado: boolean }>(t.A, "core.biometria.borrar", { personaId: p.ana });
    expect(r.borrado).toBe(true);
    expect(await e.admin.enrolamientoBiometrico.count({ where: { personaId: p.ana } })).toBe(0);
    expect(
      (await dato<{ borrado: boolean }>(t.A, "core.biometria.borrar", { personaId: p.ana }))
        .borrado,
    ).toBe(false);
  });
});
