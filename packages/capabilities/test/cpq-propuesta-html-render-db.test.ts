// CAR-533 · CAR-575 · Un solo motor de documento, contra Postgres real y dos empresas: la plantilla HTML en uso (o la
// base de OPAI) con las secciones activas del armador donde está `{{secciones}}`; la vista previa usa datos reales, el
// envío congela plantilla y textos, y una empresa nunca usa la plantilla de la otra.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { sembrarComercial } from "@opai/db";

import { capacidades as capacidadesCpq } from "../../../modules/cpq/capabilities";
import { leerPdf } from "../../../modules/cpq/persistencia/pdf/prueba-pdf";
import { pdfPropuestaDesdeSnapshot } from "../../../modules/cpq/persistencia/propuesta-envio-pdf-propuesta";
import { construirSnapshotEnvioPropuesta } from "../../../modules/cpq/persistencia/propuesta-envio-snapshot";
import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";
import { registrarModuloComercial } from "./comercial-modulo";

type Res<T> = { ok: true; data: T } | { ok: false; error: { code: string; message: string } };
const HTML = (titulo: string, cierre = "{{secciones}}<p>Cierre de la plantilla.</p>") =>
  `<section><h1>${titulo} para {{cuenta.nombre}}</h1>${cierre}</section>`;
const bloque = (id: string, tipo: string, contenidoOverride?: string) => ({
  id, tipo, activo: true, fijo: false, opcional: true, ...(contenidoOverride ? { contenidoOverride } : {}),
});
const BLOQUES = JSON.stringify([
  bloque("b1", "comprension_servicio", "Entendemos la necesidad de {{cuenta.nombre}}."),
  bloque("b2", "metodologia", "Metodología de trabajo propia."),
  bloque("b3", "condiciones", "Pago a 30 días."),
  bloque("b4", "certificaciones"),
]);

describe.skipIf(!urlPropietario)("cpq · la propuesta usa la plantilla HTML de la empresa", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  const medidor = { registrar: async () => undefined };
  const usuario = randomUUID();
  const ctx = (tenantId: string) =>
    mod.crearContexto({
      tenantId, actor: { tipo: "user", id: usuario },
      usuario: { id: usuario, nombre: "Ana", email: "ana@cpq.test", platformRole: null },
      portal: "erp", portalesMembresia: ["erp"], rol: "owner", modulosActivos: ["comercial", "cpq"], medidor,
    });
  async function run<T>(tenantId: string, id: string, input: unknown, sistema = false) {
    const c = sistema
      ? mod.crearContexto({ tenantId, actor: { tipo: "system" }, rol: "owner", modulosActivos: ["comercial", "cpq"], medidor })
      : ctx(tenantId);
    const r = (await mod.executeCapability(c, id, input, { dryRun: false })) as Res<T>;
    if (!r.ok) throw new Error(`${id}: ${JSON.stringify(r.error)}`);
    return r.data;
  }
  async function escenario(nombre: string) {
    const t = await e.admin.tenant.create({ data: { slug: `hr-${randomUUID().slice(0, 8)}`, nombre, vertical: "seguridad" } });
    await sembrarComercial(e.admin.$extends({}), t.id);
    const cuentaId = (await run<{ id: string }>(t.id, "core.cuentas.create", { nombre }, true)).id;
    const negocio = await run<{ id: string }>(t.id, "comercial.negocios.create", { cuentaId, titulo: `Guardias ${nombre}` }, true);
    const cot = await e.admin.cpqCotizacion.create({
      data: { tenantId: t.id, negocioId: negocio.id, codigo: `CPQ-${t.id.slice(0, 6)}-1`, titulo: "Guardias", vigente: true, creadoPorId: usuario },
    });
    const version = await e.admin.cpqVersion.create({ data: { tenantId: t.id, cotizacionId: cot.id, numero: 1, estado: "borrador", creadoPorId: usuario } });
    const plantilla = await e.admin.cpqPlantillaDocumento.create({ data: { tenantId: t.id, tipo: "propuesta_tecnica", bloquesJson: "[]" } });
    const prop = await e.admin.cpqPropuestaTecnica.create({
      data: { tenantId: t.id, cotizacionId: cot.id, versionId: version.id, base: "clasica", plantillaDocumentoId: plantilla.id, plantillaDocumentoVersion: 1, estado: "borrador", bloquesJson: BLOQUES, creadoPorId: usuario },
    });
    return { tenantId: t.id, cotizacionId: cot.id, codigo: cot.codigo, propuestaId: prop.id };
  }
  type Esc = Awaited<ReturnType<typeof escenario>>;
  const vista = async (x: Esc) => {
    const r = await run<{ pdfBase64: string }>(x.tenantId, "cpq.propuestas_tecnica.preview_pdf", { id: x.propuestaId, cotizacionId: x.cotizacionId });
    return (await leerPdf(Buffer.from(r.pdfBase64, "base64"))).paginas.join(" ");
  };
  const pos = (t: string, x: string) => t.indexOf(x);
  const importar = (x: Esc, titulo: string) =>
    run<{ id: string; activa: boolean }>(x.tenantId, "cpq.propuestas_html.importar", { nombre: "Base", html: HTML(titulo) });
  const enviado = async (x: Esc, snap: Awaited<ReturnType<typeof construirSnapshotEnvioPropuesta>>) => {
    const servicio = { codigo: x.codigo, versionNumero: 1, secciones: [] };
    const bytes = await pdfPropuestaDesdeSnapshot(ctx(x.tenantId), snap, { cotizacionId: x.cotizacionId, codigo: x.codigo, titulo: "Guardias", servicio, netoTotalClp: 0, propuestaTecnicaId: x.propuestaId });
    return (await leerPdf(bytes)).paginas.join(" ");
  };

  let a: Esc;
  let b: Esc;
  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo, ...mod.capacidadesComercial, ...capacidadesCpq]);
    registrarModuloComercial();
    await e.admin.user.create({ data: { id: usuario, email: `u-${usuario.slice(0, 8)}@cpq.test`, name: "Ana", emailVerified: true } });
    a = await escenario("Alfa");
    b = await escenario("Beta");
  });
  afterAll(async () => {
    await e?.cerrar();
  });

  it("sin plantilla de la empresa sale la base de OPAI con las secciones activas, en orden y sin las vacías", async () => {
    const t = await vista(a);
    expect(t).toContain("Guardias");
    expect(t).toContain("Preparada para");
    expect(pos(t, "1. Comprensión del servicio")).toBeGreaterThan(0);
    expect(pos(t, "2. Metodología de trabajo")).toBeGreaterThan(pos(t, "1. Comprensión del servicio"));
    expect(pos(t, "3. Condiciones comerciales")).toBeGreaterThan(pos(t, "2. Metodología de trabajo"));
    expect(t).toContain("Entendemos la necesidad de Alfa.");
    expect(t).toContain("Pago a 30 días.");
    expect(t).not.toContain("Certificaciones");
    expect(await vista(b)).toContain("Entendemos la necesidad de Beta.");
  });

  it("con plantilla en uso, las secciones van donde está {{secciones}}; la otra empresa sigue con la base", async () => {
    expect((await importar(a, "Propuesta")).activa).toBe(true);
    const t = await vista(a);
    expect(pos(t, "Propuesta para Alfa")).toBeLessThan(pos(t, "1. Comprensión del servicio"));
    expect(pos(t, "3. Condiciones comerciales")).toBeLessThan(pos(t, "Cierre de la plantilla."));
    expect(await vista(b)).not.toContain("Propuesta para");
  });

  it("sin el marcador, las secciones se agregan al final de la plantilla", async () => {
    await run(a.tenantId, "cpq.propuestas_html.importar", { nombre: "Sin marcador", html: HTML("Informe", "<p>Solo portada.</p>") });
    const t = await vista(a);
    expect(pos(t, "Solo portada.")).toBeLessThan(pos(t, "1. Comprensión del servicio"));
    await importar(a, "Propuesta");
  });

  it("el envío congela plantilla y textos: lo editado después no cambia lo enviado", async () => {
    const snap = await construirSnapshotEnvioPropuesta(ctx(a.tenantId), { cotizacionId: a.cotizacionId, propuestaTecnicaId: a.propuestaId, destinatarios: [] });
    expect(snap.camposContrato?.valores.campos["cuenta.nombre"]).toBe("Alfa");
    const version = snap.plantillaHtml?.version;
    await importar(a, "Oferta");
    await e.admin.cpqPropuestaTecnica.update({ where: { id: a.propuestaId }, data: { bloquesJson: JSON.stringify([bloque("b9", "texto_libre", "Texto nuevo")]) } });
    const vigente = await vista(a);
    expect(vigente).toContain("Oferta para Alfa");
    expect(vigente).toContain("Texto nuevo");
    const pdf = await enviado(a, snap);
    expect(pdf).toContain("Propuesta para Alfa");
    expect(pdf).toContain("Entendemos la necesidad de Alfa.");
    expect(pdf).not.toMatch(/Oferta|Texto nuevo/);
    expect(version).toBeGreaterThan(0);
    await expect(enviado(b, snap)).rejects.toThrow();
  });

  it("al desactivarla vuelve a la base y el envío no congela plantilla", async () => {
    const enUso = (await run<{ plantillas: { id: string; estado: string }[] }>(a.tenantId, "cpq.propuestas_html.list", {})).plantillas.find((p) => p.estado === "activa");
    await run(a.tenantId, "cpq.propuestas_html.activar", { id: enUso?.id, activa: false });
    expect(await vista(a)).not.toContain("Oferta para");
    const snap = await construirSnapshotEnvioPropuesta(ctx(a.tenantId), { cotizacionId: a.cotizacionId, propuestaTecnicaId: a.propuestaId, destinatarios: [] });
    expect(snap.plantillaHtml).toBeUndefined();
  });
});
