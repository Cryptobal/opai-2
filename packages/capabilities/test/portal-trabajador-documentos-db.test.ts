// CAR-463 · «Mis documentos» del portal del trabajador contra Postgres real (si hay DATABASE_URL_TEST): dos empresas y
// RLS con el rol sin BYPASSRLS. Prueba que el trabajador ve y descarga solo sus documentos visibles en el portal: no
// los de un compañero, no los de otra empresa, no los que la empresa no compartió, ni los archivados; que un tipo
// visible por defecto alcanza a los documentos sin portales fijados; y que la descarga de uno ajeno responde NOT_FOUND.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";
import { manifest } from "../../../modules/portal_trabajador/manifest";
import { almacenamientoEnMemoria } from "../src/testing/almacenamiento-memoria";

import type * as ModuloCapacidades from "../src";

type Capacidades = typeof ModuloCapacidades;
type Doc = { id: string; titulo: string; tipo: string | null };

describe.skipIf(!urlPropietario)("portal trabajador · mis documentos (Postgres real)", () => {
  let e: Entorno;
  let mod: Capacidades;
  const almacen = almacenamientoEnMemoria();
  const t = { a: "", b: "" };
  const u = { a1: "", a2: "", b1: "" };
  const d = { visible: "", porTipo: "", oculto: "", archivado: "", companero: "", otraEmpresa: "" };

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo, ...manifest.capacidades]);
    const sufijo = randomUUID().slice(0, 8);
    for (const k of ["a", "b"] as const)
      t[k] = (await e.admin.tenant.create({ data: { slug: `md-${k}-${sufijo}`, nombre: k, vertical: "seguridad" } })).id;
    const personas: Record<string, string> = {};
    for (const [k, tenantId, rut] of [["a1", t.a, "11111111-1"], ["a2", t.a, "22222222-2"], ["b1", t.b, "33333333-3"]] as const) {
      u[k] = randomUUID();
      await e.admin.user.create({ data: { id: u[k], name: k, email: `${k}-${sufijo}@prueba.cl` } });
      await e.admin.membership.create({ data: { tenantId, userId: u[k], rol: "viewer", portales: ["trabajador"], estado: "activa" } });
      personas[k] = (await e.admin.persona.create({ data: { tenantId, usuarioId: u[k], rut, nombres: k, apellidos: "Prueba" } })).id;
    }
    const tipoContrato = await e.admin.documentoTipo.create({
      data: { tenantId: t.a, codigo: `contrato-${sufijo}`, nombre: "Contrato", capa: "persona", visiblePortalDefault: ["trabajador"] },
    });
    const doc = async (tenantId: string, persona: string, nombre: string, extra: Record<string, unknown> = {}) => {
      const id = (
        await e.admin.documento.create({
          data: { tenantId, nombre, mime: "application/pdf", tamano: 1_000, storageKey: `k-${randomUUID()}`, estado: "disponible", creadoPorTipo: "user", ...extra },
        })
      ).id;
      await e.admin.documentoVinculo.create({ data: { tenantId, documentoId: id, entidadTipo: "persona", entidadId: persona, rol: "propietario" } });
      return id;
    };
    const a1 = personas["a1"] ?? "";
    d.visible = await doc(t.a, a1, "anexo.pdf", { visibleEn: ["trabajador"] });
    d.porTipo = await doc(t.a, a1, "contrato.pdf", { tipoId: tipoContrato.id });
    d.oculto = await doc(t.a, a1, "evaluacion.pdf", { visibleEn: ["supervisor"], tipoId: tipoContrato.id });
    d.archivado = await doc(t.a, a1, "viejo.pdf", { visibleEn: ["trabajador"], estado: "archivado", archivadoEn: new Date() });
    d.companero = await doc(t.a, personas["a2"] ?? "", "otro.pdf", { visibleEn: ["trabajador"] });
    d.otraEmpresa = await doc(t.b, personas["b1"] ?? "", "ajeno.pdf", { visibleEn: ["trabajador"] });
  });

  afterAll(async () => {
    await e?.cerrar();
  });

  const correr = (tenantId: string, usuarioId: string, id: string, input: unknown) =>
    mod.executeCapability(
      mod.crearContexto({
        tenantId, actor: { tipo: "user", id: usuarioId }, portal: "trabajador", portalesMembresia: ["trabajador"],
        modulosActivos: ["portal_trabajador"], rol: "viewer", medidor: { registrar: async () => undefined },
        servicios: { almacenamiento: almacen.almacenamiento },
      }),
      id,
      input,
    );
  async function lista(tenantId: string, usuarioId: string, input: unknown = {}) {
    const r = await correr(tenantId, usuarioId, "portal_trabajador.mis_documentos.listar", input);
    if (!r.ok) throw new Error(JSON.stringify(r.error));
    return r.data as { items: Doc[]; siguiente: string | null };
  }

  it("ve sus documentos compartidos y los de un tipo visible por defecto, nada más", async () => {
    const r = await lista(t.a, u.a1);
    expect(r.items.map((x) => x.id).sort()).toEqual([d.visible, d.porTipo].sort());
    expect(r.items.find((x) => x.id === d.porTipo)?.tipo).toBe("Contrato");
  });

  it("el compañero y el trabajador de otra empresa ven solo lo suyo", async () => {
    expect((await lista(t.a, u.a2)).items.map((x) => x.id)).toEqual([d.companero]);
    expect((await lista(t.b, u.b1)).items.map((x) => x.id)).toEqual([d.otraEmpresa]);
  });

  it("pagina por cursor propio y rechaza un cursor ajeno", async () => {
    const uno = await lista(t.a, u.a1, { limite: 1 });
    expect(uno.items).toHaveLength(1);
    const dos = await lista(t.a, u.a1, { limite: 1, cursor: uno.siguiente });
    expect(dos.siguiente).toBeNull();
    const ajeno = await correr(t.a, u.a1, "portal_trabajador.mis_documentos.listar", { cursor: d.companero });
    expect(ajeno.ok ? "ok" : ajeno.error.code).toBe("NOT_FOUND");
  });

  it("descarga solo un documento propio y visible", async () => {
    const ok = await correr(t.a, u.a1, "portal_trabajador.mis_documentos.descargar", { id: d.visible });
    expect(ok.ok && (ok.data as { url: string }).url).toMatch(/^https:\/\/r2\.test\//);
    for (const id of [d.oculto, d.archivado, d.companero, d.otraEmpresa]) {
      const r = await correr(t.a, u.a1, "portal_trabajador.mis_documentos.descargar", { id });
      expect(r.ok ? "ok" : r.error.code).toBe("NOT_FOUND");
    }
  });
});
