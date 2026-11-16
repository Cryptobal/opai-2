// CAR-533 · La propuesta usa la plantilla HTML en uso de la empresa, contra Postgres real y dos empresas: la vista
// previa reemplaza los campos con datos reales, sin plantilla vuelve al formato actual, el envío congela la
// versión usada (una versión nueva no cambia lo enviado) y una empresa nunca usa la plantilla de la otra.
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
const HTML = (titulo: string) =>
  `<section><h1>${titulo} para {{cuenta.nombre}}</h1><p>Servicio de guardias.</p></section>`;

describe.skipIf(!urlPropietario)("cpq · la propuesta usa la plantilla HTML de la empresa", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  const medidor = { registrar: async () => undefined };
  const usuario = randomUUID();
  const ctx = (tenantId: string) =>
    mod.crearContexto({
      tenantId,
      actor: { tipo: "user", id: usuario },
      usuario: { id: usuario, nombre: "Ana", email: "ana@cpq.test", platformRole: null },
      portal: "erp",
      portalesMembresia: ["erp"],
      rol: "owner",
      modulosActivos: ["comercial", "cpq"],
      medidor,
    });
  async function run<T>(tenantId: string, id: string, input: unknown, sistema = false) {
    const c = sistema
      ? mod.crearContexto({
          tenantId,
          actor: { tipo: "system" },
          rol: "owner",
          modulosActivos: ["comercial", "cpq"],
          medidor,
        })
      : ctx(tenantId);
    const r = (await mod.executeCapability(c, id, input, { dryRun: false })) as Res<T>;
    if (!r.ok) throw new Error(`${id}: ${JSON.stringify(r.error)}`);
    return r.data;
  }
  async function escenario(nombre: string) {
    const t = await e.admin.tenant.create({
      data: { slug: `hr-${randomUUID().slice(0, 8)}`, nombre, vertical: "seguridad" },
    });
    await sembrarComercial(e.admin.$extends({}), t.id);
    const cuentaId = (await run<{ id: string }>(t.id, "core.cuentas.create", { nombre }, true)).id;
    const negocio = await run<{ id: string }>(
      t.id,
      "comercial.negocios.create",
      { cuentaId, titulo: `Guardias ${nombre}` },
      true,
    );
    const cot = await e.admin.cpqCotizacion.create({
      data: {
        tenantId: t.id,
        negocioId: negocio.id,
        codigo: `CPQ-${t.id.slice(0, 6)}-1`,
        titulo: "Guardias",
        vigente: true,
        creadoPorId: usuario,
      },
    });
    const version = await e.admin.cpqVersion.create({
      data: {
        tenantId: t.id,
        cotizacionId: cot.id,
        numero: 1,
        estado: "borrador",
        creadoPorId: usuario,
      },
    });
    const plantilla = await e.admin.cpqPlantillaDocumento.create({
      data: { tenantId: t.id, tipo: "propuesta_tecnica", bloquesJson: "[]" },
    });
    const prop = await e.admin.cpqPropuestaTecnica.create({
      data: {
        tenantId: t.id,
        cotizacionId: cot.id,
        versionId: version.id,
        base: "clasica",
        plantillaDocumentoId: plantilla.id,
        plantillaDocumentoVersion: 1,
        estado: "borrador",
        bloquesJson: "[]",
        creadoPorId: usuario,
      },
    });
    return { tenantId: t.id, cotizacionId: cot.id, codigo: cot.codigo, propuestaId: prop.id };
  }
  type Esc = Awaited<ReturnType<typeof escenario>>;
  const vista = async (x: Esc) => {
    const r = await run<{ pdfBase64: string }>(x.tenantId, "cpq.propuestas_tecnica.preview_pdf", {
      id: x.propuestaId,
      cotizacionId: x.cotizacionId,
    });
    return (await leerPdf(Buffer.from(r.pdfBase64, "base64"))).paginas.join(" ");
  };
  const importar = (x: Esc, titulo: string) =>
    run<{ id: string; activa: boolean }>(x.tenantId, "cpq.propuestas_html.importar", {
      nombre: "Base",
      html: HTML(titulo),
    });
  const enviado = async (
    x: Esc,
    snap: Awaited<ReturnType<typeof construirSnapshotEnvioPropuesta>>,
  ) => {
    const servicio = { codigo: x.codigo, versionNumero: 1, secciones: [] };
    const bytes = await pdfPropuestaDesdeSnapshot(ctx(x.tenantId), snap, {
      cotizacionId: x.cotizacionId,
      codigo: x.codigo,
      titulo: "Guardias",
      servicio,
      netoTotalClp: 0,
      propuestaTecnicaId: x.propuestaId,
    });
    return (await leerPdf(bytes)).paginas.join(" ");
  };

  let a: Esc;
  let b: Esc;
  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades([
      ...mod.capacidadesDelNucleo,
      ...mod.capacidadesComercial,
      ...capacidadesCpq,
    ]);
    registrarModuloComercial();
    await e.admin.user.create({
      data: {
        id: usuario,
        email: `u-${usuario.slice(0, 8)}@cpq.test`,
        name: "Ana",
        emailVerified: true,
      },
    });
    a = await escenario("Alfa");
    b = await escenario("Beta");
  });
  afterAll(async () => {
    await e?.cerrar();
  });

  it("con plantilla en uso, la vista previa sale del HTML con los datos reales; la otra empresa sigue con el formato actual", async () => {
    expect(await vista(a)).not.toContain("Propuesta para");
    expect((await importar(a, "Propuesta")).activa).toBe(true);
    expect(await vista(a)).toContain("Propuesta para Alfa");
    const doc = await run<{ html: string | null }>(
      a.tenantId,
      "cpq.propuestas_tecnica.vista_html",
      { id: a.propuestaId, cotizacionId: a.cotizacionId },
    );
    expect(doc.html).toContain("Propuesta para Alfa");
    expect(doc.html).not.toContain("script");
    expect(
      (
        await run<{ html: string | null }>(b.tenantId, "cpq.propuestas_tecnica.vista_html", {
          id: b.propuestaId,
          cotizacionId: b.cotizacionId,
        })
      ).html,
    ).toBeNull();
    expect(
      (
        await mod.executeCapability(ctx(b.tenantId), "cpq.propuestas_tecnica.vista_html", {
          id: a.propuestaId,
          cotizacionId: a.cotizacionId,
        })
      ).ok,
    ).toBe(false);
    expect(await vista(b)).not.toContain("Propuesta para");
  });

  it("el envío congela la versión usada: una versión nueva cambia la vista previa, no lo enviado", async () => {
    const snap = await construirSnapshotEnvioPropuesta(ctx(a.tenantId), {
      cotizacionId: a.cotizacionId,
      propuestaTecnicaId: a.propuestaId,
      destinatarios: [],
    });
    expect(snap.plantillaHtml?.version).toBe(1);
    expect(snap.camposContrato?.valores.campos["cuenta.nombre"]).toBe("Alfa");
    await importar(a, "Oferta");
    expect(await vista(a)).toContain("Oferta para Alfa");
    const pdf = await enviado(a, snap);
    expect(pdf).toContain("Propuesta para Alfa");
    expect(pdf).not.toContain("Oferta");
    // Otra empresa no puede usar la plantilla congelada de esta.
    await expect(enviado(b, snap)).rejects.toThrow();
  });

  it("al desactivarla vuelve al formato actual y el envío no congela plantilla", async () => {
    const enUso = (
      await run<{ plantillas: { id: string; estado: string }[] }>(
        a.tenantId,
        "cpq.propuestas_html.list",
        {},
      )
    ).plantillas.find((p) => p.estado === "activa");
    await run(a.tenantId, "cpq.propuestas_html.activar", { id: enUso?.id, activa: false });
    expect(await vista(a)).not.toContain("Oferta para");
    expect(
      (
        await run<{ html: string | null }>(a.tenantId, "cpq.propuestas_tecnica.vista_html", {
          id: a.propuestaId,
          cotizacionId: a.cotizacionId,
        })
      ).html,
    ).toBeNull();
    const snap = await construirSnapshotEnvioPropuesta(ctx(a.tenantId), {
      cotizacionId: a.cotizacionId,
      propuestaTecnicaId: a.propuestaId,
      destinatarios: [],
    });
    expect(snap.plantillaHtml).toBeUndefined();
  });
});
