// CAR-407: la búsqueda global incluye documentos y plantillas de documento, con su permiso, sin
// cruzar empresas ni mostrar documentos sensibles. Datos ficticios, Postgres real.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";
import type * as Mod from "../src";

type Grupo = { grupo: string; items: { id: string; href: string }[] };

describe.skipIf(!urlPropietario)("core.buscar · documentos y plantillas (CAR-407)", () => {
  let e: Entorno, mod: typeof Mod;
  const medidor = { registrar: async () => undefined };
  const ctx = (tenantId: string, sinPermiso?: string) => {
    const c = mod.crearContexto({ tenantId, actor: { tipo: "system" }, rol: "owner", medidor });
    if (sinPermiso) {
      const base = c.autorizar;
      c.autorizar = (p: string) => p !== sinPermiso && base(p);
    }
    return c;
  };
  const grupos = async (c: ReturnType<typeof ctx>) => {
    const r = await mod.executeCapability(c, "core.buscar", { q: "Zafiro" }, {});
    if (!r.ok) throw new Error(JSON.stringify(r.error));
    return (r.data as { otros: Grupo[] }).otros;
  };
  async function empresa(nombre: string) {
    const t = await e.admin.tenant.create({
      data: { slug: `qa-busdoc-${randomUUID().slice(0, 8)}`, nombre, vertical: "seguridad" },
    });
    const doc = await e.admin.documento.create({
      data: {
        tenantId: t.id,
        nombre: "contrato.pdf",
        titulo: "Contrato Zafiro",
        mime: "application/pdf",
        tamano: 10,
        storageKey: `qa/${randomUUID()}`,
        estado: "disponible",
        creadoPorTipo: "system",
      },
    });
    await e.admin.documentoVinculo.create({
      data: {
        tenantId: t.id,
        documentoId: doc.id,
        entidadTipo: "tenant",
        entidadId: t.id,
        rol: "propietario",
      },
    });
    const plantilla = await e.admin.documentoPlantilla.create({
      data: {
        tenantId: t.id,
        nombre: "Contrato Zafiro",
        clase: "contrato_trabajo",
        nivelFirma: "N1",
      },
    });
    return { tenantId: t.id, docId: doc.id, plantillaId: plantilla.id };
  }
  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo]);
  });
  afterAll(async () => {
    await e?.cerrar();
  });

  it("encuentra el documento y la plantilla de la empresa, no los de otra", async () => {
    const a = await empresa("Alfa");
    const b = await empresa("Beta");
    const otros = await grupos(ctx(a.tenantId));
    expect(otros.find((g) => g.grupo === "documentos")?.items).toEqual([
      expect.objectContaining({ id: a.docId, href: `/documentos?ver=${a.docId}` }),
    ]);
    expect(otros.find((g) => g.grupo === "plantillas_documento")?.items).toEqual([
      expect.objectContaining({
        id: a.plantillaId,
        href: `/documentos/plantillas/${a.plantillaId}`,
      }),
    ]);
    expect(JSON.stringify(otros)).not.toContain(b.docId);
    expect(JSON.stringify(otros)).not.toContain(b.plantillaId);
  });

  it("sin el permiso de cada grupo no aparece", async () => {
    const a = await empresa("Gamma");
    const sinDocs = await grupos(ctx(a.tenantId, "core:documentos.read"));
    expect(sinDocs.map((g) => g.grupo)).toEqual(["plantillas_documento"]);
    const sinPlantillas = await grupos(ctx(a.tenantId, "core:documentos.plantillas.manage"));
    expect(sinPlantillas.map((g) => g.grupo)).toEqual(["documentos"]);
  });

  it("no muestra documentos archivados", async () => {
    const a = await empresa("Delta");
    await e.admin.documento.update({ where: { id: a.docId }, data: { estado: "archivado" } });
    const otros = await grupos(ctx(a.tenantId));
    expect(otros.find((g) => g.grupo === "documentos")).toBeUndefined();
  });
});
