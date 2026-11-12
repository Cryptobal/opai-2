import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { crearContexto, executeCapability } from "../src";
import { almacenamientoEnMemoria } from "../src/testing/almacenamiento-memoria";
import { prepararVinculosJornada } from "./vinculos-jornada-fixture";

// CAR-127 PR 4b · Generar el PDF del documento laboral con Postgres real: no genera si faltan datos,
// la vista previa no guarda, la generación deja el PDF en la ficha con su huella y la bitácora.
type Gen = { documento: { id: string; mime: string; tamano: number } | null; nombre: string; paginas: number };

describe("plantillas laborales: generar el PDF", () => {
  let f: Awaited<ReturnType<typeof prepararVinculosJornada>>;
  let plantillaId = "";
  const almacen = almacenamientoEnMemoria();
  const ctx = (tenantId: string, rol: "owner" | "gerente" = "owner") =>
    crearContexto({ tenantId, rol, actor: { tipo: "system" }, servicios: { almacenamiento: almacen.almacenamiento } });
  const generar = (opts: { dryRun?: boolean; rol?: "owner" | "gerente"; tenant?: string } = {}) =>
    executeCapability(
      ctx(opts.tenant ?? f.tenantId, opts.rol),
      "core.documento_plantillas.generar",
      { plantillaId, personaId: f.personaId, fecha: "2026-11-01" },
      { dryRun: opts.dryRun ?? false },
    );

  beforeAll(async () => {
    f = await prepararVinculosJornada();
    const r = await executeCapability(ctx(f.tenantId), "core.documento_plantillas.create", {
      nombre: "Carta de prueba",
      clase: "anexo_contrato",
      nivelFirma: "N2",
      contenido: "En {contrato.fecha}, {persona.nombre}, RUT {persona.rut}, domiciliada en {persona.direccion}.",
    });
    if (!r.ok) throw new Error(JSON.stringify(r));
    plantillaId = (r.data as { id: string }).id;
  });
  afterAll(async () => {
    await f?.e.cerrar();
  });

  it("no genera si faltan datos y dice cuáles", async () => {
    const r = await generar();
    expect(r.ok).toBe(false);
    expect(JSON.stringify(r)).toMatch(/Faltan datos/);
    expect(almacen.objetos.size).toBe(0);
  });

  it("la vista previa arma el PDF pero no guarda nada", async () => {
    await f.e.forTenant(f.tenantId).persona.update({ where: { id: f.personaId }, data: { calle: "Av. Matta 123", comuna: "Santiago" } });
    const r = await generar({ dryRun: true });
    expect(r.ok).toBe(true);
    const d = r.ok ? (r.data as Gen) : null;
    expect(d?.documento).toBeNull();
    expect(d?.paginas).toBe(1);
    expect(almacen.objetos.size).toBe(0);
  });

  it("genera el PDF, lo guarda en la ficha con huella y bitácora", async () => {
    const r = await generar();
    expect(r.ok).toBe(true);
    const d = r.ok ? (r.data as Gen) : ({} as Gen);
    expect(d.documento?.mime).toBe("application/pdf");
    expect(d.nombre).toMatch(/\.pdf$/);
    const fila = await f.e.admin.documento.findUniqueOrThrow({ where: { id: d.documento?.id ?? "" }, include: { vinculos: true } });
    expect(fila.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(fila.origen).toBe("generado");
    expect(fila.bitacoraSeq).not.toBeNull();
    expect(fila.vinculos[0]).toMatchObject({ entidadTipo: "persona", entidadId: f.personaId, rol: "propietario" });
    const guardado = await almacen.almacenamiento.leerBytes(fila.storageKey);
    expect(guardado?.subarray(0, 5).toString()).toBe("%PDF-");
  });

  it("el gerente queda fuera y otra empresa no ve la plantilla", async () => {
    expect(await generar({ rol: "gerente" })).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
    expect(await generar({ tenant: f.otro })).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
  });
});
