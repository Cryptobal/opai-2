import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { crearContexto, executeCapability } from "../src";
import { prepararVinculosJornada } from "./vinculos-jornada-fixture";

// CAR-182 (decisión de Carlos, 4-nov-2026): el supervisor sube documentos solo a instalaciones que
// tiene a cargo, con el permiso `core:documentos.subir_alcance` y SIN `documentos.manage`. Con
// alcance real (consulta bloqueada), RLS y dos empresas.
describe("subida acotada del supervisor: alcance, tenant y visibilidad reales", () => {
  let f: Awaited<ReturnType<typeof prepararVinculosJornada>>;
  let cuentaPropia = "";
  let cuentaAjena = "";
  const tipos: Record<string, string> = {};
  // Sin excepciones: el supervisor solo tiene el permiso acotado (el rol base no incluye manage).
  const supervisor = (instalaciones: string[]) =>
    crearContexto({
      tenantId: f.tenantId,
      rol: "supervisor",
      actor: { tipo: "system" },
      alcance: { instalaciones },
    });
  const dueno = () =>
    crearContexto({ tenantId: f.tenantId, rol: "owner", actor: { tipo: "system" } });
  const subir = (entidad: { tipo: string; id: string }, extra: Record<string, unknown> = {}) => ({
    entidad,
    nombre: "acta.pdf",
    mime: "application/pdf",
    tamano: 1000,
    sha256: "c".repeat(64),
    ...extra,
  });
  const previa = (c: ReturnType<typeof supervisor>, input: ReturnType<typeof subir>) =>
    executeCapability(c, "core.documentos.iniciar_subida", input, { dryRun: true });

  beforeAll(async () => {
    f = await prepararVinculosJornada();
    cuentaPropia = (
      await f.e.forTenant(f.tenantId).instalacion.findFirstOrThrow({ where: { id: f.a } })
    ).cuentaId;
    cuentaAjena = (
      await f.e.forTenant(f.otro).instalacion.findFirstOrThrow({ where: { id: f.ajena } })
    ).cuentaId;
    for (const [capa, portales] of [
      ["empresa", []],
      ["cuenta", []],
      ["instalacion", ["cliente", "trabajador"]],
      ["persona", []],
    ] as const) {
      const t = await f.e.forTenant(f.tenantId).documentoTipo.create({
        data: {
          tenantId: f.tenantId,
          codigo: `sub_${capa}`,
          capa,
          nombre: `Tipo ${capa}`,
          visiblePortalDefault: [...portales],
        },
      });
      tipos[capa] = t.id;
    }
  });
  afterAll(async () => {
    await f?.e.cerrar();
  });

  it("sube a su instalación y el documento queda sin visibilidad en portales", async () => {
    const r = await previa(
      supervisor([f.a]),
      subir({ tipo: "instalacion", id: f.a }, { tipoId: tipos["instalacion"] }),
    );
    expect(r).toMatchObject({ ok: true });
    // El tipo trae «cliente» y «trabajador» por defecto; el supervisor no publica a portales.
    expect(r.ok && (r.data as { documento: { visibleEn: string[] } }).documento.visibleEn).toEqual(
      [],
    );
    const d = await executeCapability(
      dueno(),
      "core.documentos.iniciar_subida",
      subir({ tipo: "instalacion", id: f.a }, { tipoId: tipos["instalacion"] }),
      { dryRun: true },
    );
    expect(d.ok && (d.data as { documento: { visibleEn: string[] } }).documento.visibleEn).toEqual([
      "cliente",
      "trabajador",
    ]);
  });

  it("no sube a otra instalación de su empresa que no tiene a cargo", async () => {
    expect(await previa(supervisor([f.a]), subir({ tipo: "instalacion", id: f.b }))).toMatchObject({
      ok: false,
      error: { code: "NOT_FOUND" },
    });
  });

  it("no sube a la empresa, a su cuenta ni a una persona, aunque estén en su alcance", async () => {
    for (const entidad of [
      { tipo: "tenant", id: f.tenantId },
      { tipo: "cuenta", id: cuentaPropia },
      { tipo: "persona", id: f.personaId },
    ]) {
      expect(await previa(supervisor([f.a]), subir(entidad)), entidad.tipo).toMatchObject({
        ok: false,
        error: { code: "FORBIDDEN" },
      });
    }
  });

  it("aislamiento: ni una instalación, cuenta o empresa de otra empresa (ni con su id a cargo)", async () => {
    // Aunque el id ajeno figurara en su alcance, la RLS y la verificación no lo encuentran.
    expect(
      await previa(supervisor([f.a, f.ajena]), subir({ tipo: "instalacion", id: f.ajena })),
    ).toMatchObject({
      ok: false,
      error: { code: "NOT_FOUND" },
    });
    for (const entidad of [
      { tipo: "cuenta", id: cuentaAjena },
      { tipo: "tenant", id: f.otro },
    ]) {
      const r = await previa(supervisor([f.a, f.ajena]), subir(entidad));
      expect(r, entidad.tipo).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
    }
  });

  it("no versiona un documento y un tipo de otra capa se rechaza", async () => {
    expect(
      await previa(
        supervisor([f.a]),
        subir({ tipo: "instalacion", id: f.a }, { reemplazaAId: f.personaId }),
      ),
    ).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
    expect(
      await previa(
        supervisor([f.a]),
        subir({ tipo: "instalacion", id: f.a }, { tipoId: tipos["persona"] }),
      ),
    ).toMatchObject({ ok: false, error: { code: "UNPROCESSABLE" } });
  });

  it("quien gestiona documentos conserva todo: empresa, cuenta, instalación y persona", async () => {
    for (const [tipo, id, capa] of [
      ["tenant", f.tenantId, "empresa"],
      ["cuenta", cuentaPropia, "cuenta"],
      ["instalacion", f.b, "instalacion"],
      ["persona", f.personaId, "persona"],
    ] as const) {
      expect(
        await previa(dueno(), subir({ tipo, id }, { tipoId: tipos[capa] })),
        tipo,
      ).toMatchObject({ ok: true });
    }
  });
});
