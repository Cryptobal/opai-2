import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { hashClaveFiscalizacion } from "../../../modules/asistencia/domain/fiscalizacion";
import { manifest } from "../../../modules/asistencia/manifest";
import { empleadorPorRut } from "../../db/src/fiscalizacion-publica";
import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

type Res<T> = { ok: true; data: T } | { ok: false };

describe.skipIf(!urlPropietario)("Asistencia · fiscalización DT (Postgres real)", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  const A = { tenant: "", rut: "76111111-1" };
  const B = { tenant: "", rut: "76222222-2" };

  const ctx = (tenantId: string, email = "fiscal@dt.gob.cl") =>
    mod.crearContexto({
      tenantId,
      actor: { tipo: "user", id: randomUUID() },
      usuario: { id: randomUUID(), nombre: "RRHH", email: "rrhh@x.cl", platformRole: null },
      portal: "erp",
      portalesMembresia: ["erp"],
      rol: "owner",
      modulosActivos: ["asistencia"],
      medidor: { registrar: async () => undefined },
    });

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.limpiarModulos();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo]);
    mod.registrarModulos([manifest]);
    for (const [slug, ref] of [["fis-a", A], ["fis-b", B]] as const) {
      const tenant = (await e.admin.tenant.create({ data: { slug: `qa-${slug}-${randomUUID().slice(0, 6)}`, nombre: slug, vertical: "seguridad" } })).id;
      await e.admin.perfilEmpresa.create({
        data: { tenantId: tenant, rut: ref.rut, razonSocial: `${slug} SpA` },
      });
      ref.tenant = tenant;
    }
  });

  afterAll(async () => {
    await e?.cerrar();
  });

  it("resuelve empleador por RUT sin mezclar empresas", async () => {
    const a = await empleadorPorRut(A.rut);
    const b = await empleadorPorRut(B.rut);
    expect(a?.tenantId).toBe(A.tenant);
    expect(b?.tenantId).toBe(B.tenant);
    expect(a?.tenantId).not.toBe(b?.tenantId);
  });

  it("clave temporal permite ingreso auditado", async () => {
    const gen = (await mod.executeCapability(ctx(A.tenant), "asistencia.fiscalizacion_claves.generar", {
      correo: "inspector@dt.gob.cl",
    })) as Res<{ clave: string }>;
    expect(gen.ok).toBe(true);
    const clave = gen.ok ? gen.data.clave : "";
    const ing = (await mod.executeCapability(ctx(A.tenant), "asistencia.fiscalizacion_ingreso.validar", {
      correo: "inspector@dt.gob.cl",
      rutEmpleador: A.rut,
      clave,
      ip: "127.0.0.1",
    })) as Res<unknown>;
    expect(ing.ok).toBe(true);
    const acc = (await mod.executeCapability(ctx(A.tenant), "asistencia.fiscalizacion_accesos.listar", { limite: 10 })) as Res<{ items: { correo: string }[] }>;
    expect(acc.ok && acc.data.items.some((x) => x.correo === "inspector@dt.gob.cl")).toBe(true);
    expect(hashClaveFiscalizacion(clave!)).toHaveLength(64);
  });

  it("respaldo de bitácora publica manifiesto verificable", async () => {
    const gen = (await mod.executeCapability(ctx(B.tenant), "asistencia.respaldos.generar", { origen: "manual" })) as Res<{ manifiestoSha256: string }>;
    expect(gen.ok).toBe(true);
    const sha = gen.ok ? gen.data.manifiestoSha256 : "";
    const lista = (await mod.executeCapability(ctx(B.tenant), "asistencia.respaldos.listar", {})) as Res<{ items: { manifiestoSha256: string }[] }>;
    const item = lista.ok ? lista.data.items[0] : undefined;
    expect(item?.manifiestoSha256).toBe(sha);
  });
});