// CAR-429: OS-10 de la ficha respaldado por el documento vigente en Documentos. Postgres real, datos ficticios.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, omitirSuiteDb, prepararEntorno } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

type R = { ok: boolean; data?: Record<string, unknown>; error?: { code: string; message: string } };
type Respaldo = { documentoId: string; emitidoEn: string | null; venceEn: string | null } | null;

describe.skipIf(omitirSuiteDb())("Personas · OS-10 desde Documentos CAR-429 (db)", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  const tenants: string[] = [];
  const personas: string[] = [];
  const uid = randomUUID();
  const ctx = (t: number) =>
    mod.crearContexto({
      tenantId: tenants[t]!,
      actor: { tipo: "user", id: uid },
      usuario: {
        id: uid,
        nombre: "RRHH",
        email: `${uid.slice(0, 6)}@c429.test`,
        platformRole: null,
      },
      portal: "erp",
      portalesMembresia: ["erp"],
      rol: "owner",
      modulosActivos: [],
      medidor: { registrar: async () => undefined },
    });
  const ejecutar = async (t: number, id: string, input: Record<string, unknown>) =>
    (await mod.executeCapability(ctx(t), id, input, {})) as R;
  const respaldoDe = async (t: number) =>
    (
      (await ejecutar(t, "core.personas.laboral_ver", { id: personas[t] })).data as {
        os10Respaldo: Respaldo;
      }
    ).os10Respaldo;
  const documentoOs10 = async (t: number, venceEn: string, extra: Record<string, unknown> = {}) => {
    const tenantId = tenants[t]!;
    const tipo =
      (await e.admin.documentoTipo.findFirst({ where: { tenantId, codigo: "os10" } })) ??
      (await e.admin.documentoTipo.create({
        data: {
          tenantId,
          codigo: "os10",
          nombre: "Credencial OS-10",
          capa: "persona",
          tieneVencimiento: true,
        },
      }));
    const doc = await e.admin.documento.create({
      data: {
        tenantId,
        tipoId: tipo.id,
        nombre: "credencial.pdf",
        mime: "application/pdf",
        tamano: 10,
        storageKey: `qa/${randomUUID()}`,
        estado: "disponible",
        venceEn: new Date(`${venceEn}T00:00:00Z`),
        creadoPorTipo: "user",
        ...extra,
      },
    });
    await e.admin.documentoVinculo.create({
      data: {
        tenantId,
        documentoId: doc.id,
        entidadTipo: "persona",
        entidadId: personas[t]!,
        rol: "propietario",
      },
    });
    return doc.id;
  };

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo]);
    await e.admin.user.create({
      data: { id: uid, name: "RRHH", email: `${uid.slice(0, 8)}@c429.test` },
    });
    for (const [i, [vertical, rut]] of [
      ["seguridad", "14444444-4"],
      ["aseo", "13333333-3"],
    ].entries()) {
      const tenantId = (
        await e.admin.tenant.create({
          data: {
            slug: `qa-c429-${i}-${randomUUID().slice(0, 6)}`,
            nombre: "c429",
            vertical: vertical!,
          },
        })
      ).id;
      await e.admin.membership.create({
        data: { tenantId, userId: uid, rol: "owner", portales: ["erp"] },
      });
      personas.push(
        (
          await e.admin.persona.create({
            data: { tenantId, nombres: "Ana", apellidos: "Ficticia", rut: rut!, estado: "activa" },
          })
        ).id,
      );
      tenants.push(tenantId);
    }
  });
  afterAll(async () => {
    await e?.cerrar();
  });

  it("sin documento no hay respaldo: la ficha queda con el dato manual", async () => {
    const r = await ejecutar(0, "core.personas.laboral_actualizar", {
      id: personas[0],
      os10: { credencial: "OS-0001", venceEn: "2027-05-01" },
    });
    expect(r.ok, JSON.stringify(r)).toBe(true);
    expect(await respaldoDe(0)).toBeNull();
  });

  it("toma el documento disponible con el vencimiento más lejano; ignora archivados", async () => {
    await documentoOs10(0, "2026-06-01");
    const vigente = await documentoOs10(0, "2028-01-10");
    await documentoOs10(0, "2030-01-01", { estado: "archivado", archivadoEn: new Date() });
    expect(await respaldoDe(0)).toEqual({
      documentoId: vigente,
      emitidoEn: null,
      venceEn: "2028-01-10",
    });
  });

  it("aísla por empresa: el documento de otra empresa no respalda a nadie aquí", async () => {
    expect(await respaldoDe(1)).toBeNull();
    const r = await ejecutar(1, "core.personas.laboral_ver", { id: personas[0] });
    expect(r.error?.code).toBe("NOT_FOUND");
  });
});
