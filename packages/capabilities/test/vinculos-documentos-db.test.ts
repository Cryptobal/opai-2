import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { crearContexto, executeCapability } from "../src";
import { prepararVinculosJornada } from "./vinculos-jornada-fixture";

describe("07b: documentos de personas en alcance del Supervisor", () => {
  let f: Awaited<ReturnType<typeof prepararVinculosJornada>>;
  let propio: string, ajeno: string, pendiente: string, fuera: string;
  const ctx = (rol: "owner" | "supervisor" = "supervisor") =>
    crearContexto({
      tenantId: f.tenantId,
      rol,
      actor: { tipo: "system" },
      ...(rol === "supervisor"
        ? {
            alcance: { instalaciones: [f.a] },
            excepciones: [{ permiso: "core:documentos.manage", conceder: true }],
          }
        : {}),
    });
  const subir = (id: string) => ({
    entidad: { tipo: "persona", id },
    nombre: "prueba.pdf",
    mime: "application/pdf",
    tamano: 1000,
    sha256: "a".repeat(64),
  });
  beforeAll(async () => {
    f = await prepararVinculosJornada();
    expect(
      await executeCapability(ctx("owner"), "core.vinculos.create", {
        personaId: f.personaId,
        cargoId: f.cargoId,
        instalacionId: f.a,
        horasSemanales: 40,
        distribucion: "Lunes a viernes",
        tipo: "indefinido",
        inicio: "2026-01-01",
      }),
    ).toMatchObject({ ok: true });
    const db = f.e.forTenant(f.tenantId);
    fuera = (
      await db.persona.create({
        data: { tenantId: f.tenantId, nombres: "Fuera", apellidos: "Prueba", rut: "87654321-4" },
      })
    ).id;
    for (const [entidadId, estado] of [
      [f.personaId, "disponible"],
      [fuera, "disponible"],
      [f.personaId, "pendiente"],
    ] as const) {
      const d = await db.documento.create({
        data: {
          tenantId: f.tenantId,
          nombre: "prueba.pdf",
          mime: "application/pdf",
          tamano: 1000,
          sha256: "a".repeat(64),
          storageKey: randomUUID(),
          estado,
          creadoPorTipo: "system",
        },
      });
      await db.documentoVinculo.create({
        data: {
          tenantId: f.tenantId,
          documentoId: d.id,
          entidadTipo: "persona",
          entidadId,
          rol: "propietario",
        },
      });
      if (estado === "pendiente") pendiente = d.id;
      else if (entidadId === fuera) ajeno = d.id;
      else propio = d.id;
    }
  });
  afterAll(async () => {
    await f?.e.cerrar();
  });
  it("revela el documento propio y deniega el ajeno", async () => {
    expect(await executeCapability(ctx(), "core.documentos.get", { id: propio })).toMatchObject({
      ok: true,
    });
    expect(await executeCapability(ctx(), "core.documentos.get", { id: ajeno })).toMatchObject({
      ok: false,
      error: { code: "NOT_FOUND" },
    });
  });
  it("subida y referencias no permiten seleccionar persona fuera de alcance ni enumerar duplicados", async () => {
    expect(
      await executeCapability(ctx(), "core.documentos.iniciar_subida", subir(fuera), {
        dryRun: true,
      }),
    ).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
    expect(
      await executeCapability(
        ctx(),
        "core.documentos.vincular",
        { id: propio, entidad: { tipo: "persona", id: fuera } },
        { dryRun: true },
      ),
    ).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
    expect(
      await executeCapability(ctx(), "core.documentos.iniciar_subida", subir(f.personaId), {
        dryRun: true,
      }),
    ).toMatchObject({ ok: true, data: { duplicados: [{ id: propio }] } });
  });
  it("un traslado retira lectura y confirmación antes de consultar storage", async () => {
    const v = await f.e
      .forTenant(f.tenantId)
      .vinculoLaboral.findFirstOrThrow({ where: { personaId: f.personaId, estado: "vigente" } });
    expect(
      await executeCapability(ctx("owner"), "core.vinculos.update", {
        id: v.id,
        instalacionId: f.b,
      }),
    ).toMatchObject({ ok: true });
    expect(await executeCapability(ctx(), "core.documentos.get", { id: propio })).toMatchObject({
      ok: false,
      error: { code: "NOT_FOUND" },
    });
    expect(
      await executeCapability(
        ctx(),
        "core.documentos.confirmar_subida",
        { id: pendiente },
        { dryRun: true },
      ),
    ).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
  });
});
