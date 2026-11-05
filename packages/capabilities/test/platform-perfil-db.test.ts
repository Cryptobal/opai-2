// CAR-188 contra Postgres real: el RUT de la empresa es único (índice parcial, sin depender de la RLS),
// crear una empresa con un RUT repetido no deja nada a medias y el perfil de una empresa no se ve
// desde otra. La creación atómica abre su propia transacción con el tenant nuevo fijado.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { digitoVerificador } from "@opai/domain";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

describe.skipIf(!urlPropietario)("RUT de la empresa en Plataforma (base real)", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  const s = randomUUID().slice(0, 8);
  // RUT válidos y distintos en cada corrida: la base de pruebas local persiste entre corridas.
  const cuerpo = () => String(10_000_000 + Math.floor(Math.random() * 80_000_000));
  const nuevoRut = () => {
    const c = cuerpo();
    return `${c}-${digitoVerificador(c)}`;
  };
  const rutA = nuevoRut();
  const rutB = nuevoRut();
  const rutC = nuevoRut();
  let plat = "";
  let x = "";
  let y = "";

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.limpiarModulos();
    mod.registrarCapacidades(mod.capacidadesDelNucleo);
    plat = (
      await e.admin.user.create({
        data: {
          name: "plat",
          email: `plat-${s}@prueba.cl`,
          emailVerified: true,
          platformRole: "owner",
        },
      })
    ).id;
    const tenant = (slug: string) =>
      e.admin.tenant.create({ data: { slug, nombre: slug, vertical: "seguridad" } });
    x = (await tenant(`rut-x-${s}`)).id;
    y = (await tenant(`rut-y-${s}`)).id;
  });

  afterAll(async () => {
    await e?.cerrar();
  });

  const persona = () =>
    mod.crearContexto({
      tenantId: null,
      actor: { tipo: "user", id: plat },
      rol: null,
      portal: "platform",
      portalesMembresia: [],
      usuario: { id: plat, nombre: "plat", email: `plat-${s}@prueba.cl`, platformRole: "owner" },
      medidor: { registrar: async () => undefined },
    });
  const set = (tenantId: string, rut: string) =>
    mod.executeCapability(persona(), "platform.tenants.perfil_set", {
      tenantId,
      razonSocial: "Empresa de prueba SpA",
      rut,
    });

  it("dos empresas no pueden tener el mismo RUT; la propia sí puede reescribir el suyo", async () => {
    expect(await set(x, rutA)).toMatchObject({ ok: true });
    expect(await set(x, rutA)).toMatchObject({ ok: true });
    const otra = await set(y, rutA);
    expect(otra).toMatchObject({ ok: false, error: { code: "CONFLICT" } });
    expect(await e.admin.perfilEmpresa.count({ where: { tenantId: y } })).toBe(0);
    expect(await set(y, rutB)).toMatchObject({ ok: true });
  });

  it("el perfil de una empresa no aparece al consultar otra", async () => {
    const r = await mod.executeCapability(persona(), "platform.tenants.perfil_get", {
      tenantId: y,
    });
    expect(r).toMatchObject({ ok: true, data: { tenantId: y, rut: rutB } });
  });

  it("crear con un RUT repetido da CONFLICT y no deja la empresa; con uno libre la crea completa", async () => {
    const base = {
      nombre: "Nueva",
      vertical: "seguridad",
      razonSocial: "Nueva SpA",
      adminEmail: `jefa-${s}@prueba.cl`,
    };
    const dup = await mod.executeCapability(persona(), "platform.tenants.create", {
      ...base,
      slug: `rut-dup-${s}`,
      rut: rutA,
    });
    expect(dup).toMatchObject({ ok: false, error: { code: "CONFLICT" } });
    expect(await e.admin.tenant.count({ where: { slug: `rut-dup-${s}` } })).toBe(0);
    const ok = await mod.executeCapability(persona(), "platform.tenants.create", {
      ...base,
      slug: `rut-ok-${s}`,
      rut: rutC,
    });
    expect(ok).toMatchObject({ ok: true });
    const t = await e.admin.tenant.findUniqueOrThrow({ where: { slug: `rut-ok-${s}` } });
    expect(await e.admin.perfilEmpresa.findFirst({ where: { tenantId: t.id } })).toMatchObject({
      rut: rutC,
      razonSocial: "Nueva SpA",
    });
  });

  it("si la propia empresa escribe en su Configuración un RUT ajeno, recibe CONFLICT claro", async () => {
    const ctxEmpresa = mod.crearContexto({
      tenantId: y,
      actor: { tipo: "user", id: plat },
      portal: "erp",
      portalesMembresia: ["erp"],
      usuario: { id: plat, nombre: "Olivia", email: `plat-${s}@prueba.cl`, platformRole: null },
      rol: "owner",
      medidor: { registrar: async () => undefined },
    });
    const r = await mod.executeCapability(ctxEmpresa, "core.empresa.update", { rut: rutA });
    expect(r).toMatchObject({ ok: false, error: { code: "CONFLICT" } });
    expect(JSON.stringify(r)).not.toContain(x);
  });
});
