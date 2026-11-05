import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { crearContexto, executeCapability } from "../src";
import { prepararVinculosJornada } from "./vinculos-jornada-fixture";

// CAR-182: «Vincular a» del explorador de Documentos con alcance y tenant reales (RLS). La UI solo
// ofrece candidatos; `iniciar_subida` decide con `verificarEntidad` y `tipoParaEntidad`.
describe("subir a una entidad elegida: alcance, tenant y capa", () => {
  let f: Awaited<ReturnType<typeof prepararVinculosJornada>>;
  let cuentaPropia = "";
  let cuentaAjena = "";
  const tipos: Record<string, string> = {};
  const ctx = (rol: "owner" | "supervisor") =>
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
  const subir = (entidad: { tipo: string; id: string }, tipoId?: string) => ({
    entidad,
    ...(tipoId ? { tipoId } : {}),
    nombre: "prueba.pdf",
    mime: "application/pdf",
    tamano: 1000,
    sha256: "b".repeat(64),
  });
  const previa = (c: ReturnType<typeof ctx>, input: ReturnType<typeof subir>) =>
    executeCapability(c, "core.documentos.iniciar_subida", input, { dryRun: true });

  beforeAll(async () => {
    f = await prepararVinculosJornada();
    const propia = await f.e
      .forTenant(f.tenantId)
      .instalacion.findFirstOrThrow({ where: { id: f.a } });
    cuentaPropia = propia.cuentaId;
    const ajena = await f.e
      .forTenant(f.otro)
      .instalacion.findFirstOrThrow({ where: { id: f.ajena } });
    cuentaAjena = ajena.cuentaId;
    for (const capa of ["empresa", "cuenta", "instalacion", "persona"]) {
      const t = await f.e.forTenant(f.tenantId).documentoTipo.create({
        data: { tenantId: f.tenantId, codigo: `vinc_${capa}`, capa, nombre: `Tipo ${capa}` },
      });
      tipos[capa] = t.id;
    }
  });
  afterAll(async () => {
    await f?.e.cerrar();
  });

  it("el dueño vincula a cada entidad de su empresa con un tipo de su capa", async () => {
    for (const [tipo, id, capa] of [
      ["tenant", f.tenantId, "empresa"],
      ["cuenta", cuentaPropia, "cuenta"],
      ["instalacion", f.a, "instalacion"],
      ["persona", f.personaId, "persona"],
    ] as const) {
      expect(await previa(ctx("owner"), subir({ tipo, id }, tipos[capa])), tipo).toMatchObject({
        ok: true,
      });
    }
  });

  it("no vincula a una entidad de otra empresa, ni siquiera el dueño", async () => {
    for (const c of [ctx("owner"), ctx("supervisor")]) {
      for (const entidad of [
        { tipo: "instalacion", id: f.ajena },
        { tipo: "cuenta", id: cuentaAjena },
        { tipo: "tenant", id: f.otro },
      ]) {
        expect(await previa(c, subir(entidad)), entidad.tipo).toMatchObject({
          ok: false,
          error: { code: "NOT_FOUND" },
        });
      }
    }
  });

  it("el supervisor solo vincula a lo que tiene a cargo", async () => {
    const supervisor = ctx("supervisor");
    expect(
      await previa(supervisor, subir({ tipo: "instalacion", id: f.a }, tipos["instalacion"])),
    ).toMatchObject({ ok: true });
    expect(
      await previa(supervisor, subir({ tipo: "cuenta", id: cuentaPropia }, tipos["cuenta"])),
    ).toMatchObject({ ok: true });
    for (const entidad of [
      { tipo: "instalacion", id: f.b },
      { tipo: "tenant", id: f.tenantId },
    ]) {
      expect(await previa(supervisor, subir(entidad)), entidad.tipo).toMatchObject({
        ok: false,
        error: { code: "NOT_FOUND" },
      });
    }
  });

  it("rechaza un tipo de otra capa también con la entidad a cargo", async () => {
    for (const c of [ctx("owner"), ctx("supervisor")]) {
      expect(
        await previa(c, subir({ tipo: "instalacion", id: f.a }, tipos["persona"])),
      ).toMatchObject({
        ok: false,
        error: { code: "UNPROCESSABLE" },
      });
    }
  });
});
