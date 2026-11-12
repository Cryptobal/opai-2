import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { crearContexto, executeCapability } from "../src";
import { almacenamientoEnMemoria } from "../src/testing/almacenamiento-memoria";
import { prepararVinculosJornada } from "./vinculos-jornada-fixture";

// CAR-315 parte 2 · Documentos sobre una cuenta o una instalación con Postgres real: el contrato de servicio
// se rellena con la cuenta, el acta con la instalación; cada ámbito rechaza la plantilla del otro (y la de
// persona); la generación deja el PDF vinculado a la entidad.
type Gen = { documento: { id: string } | null; nombre: string; paginas: number };
type Rel = { faltantes: { clave: string }[]; puedeGenerar: boolean; entidad: { tipo: string; nombre: string } };

describe("plantillas de cuenta e instalación", () => {
  let f: Awaited<ReturnType<typeof prepararVinculosJornada>>;
  let cuentaId = "";
  let contratoId = "";
  let actaId = "";
  let laboralId = "";
  const almacen = almacenamientoEnMemoria();
  const ctx = (tenantId: string, rol: "owner" | "gerente" = "owner") =>
    crearContexto({ tenantId, rol, actor: { tipo: "system" }, servicios: { almacenamiento: almacen.almacenamiento } });
  const crear = async (nombre: string, clase: string, contenido: string) => {
    const r = await executeCapability(ctx(f.tenantId), "core.documento_plantillas.create", { nombre, clase, nivelFirma: "N1", contenido });
    if (!r.ok) throw new Error(JSON.stringify(r));
    return (r.data as { id: string }).id;
  };
  const llamar = (id: string, input: Record<string, unknown>, opts: { dryRun?: boolean; rol?: "owner" | "gerente"; tenant?: string } = {}) =>
    executeCapability(ctx(opts.tenant ?? f.tenantId, opts.rol), id, { fecha: "2026-11-01", ...input }, { dryRun: opts.dryRun ?? false });

  beforeAll(async () => {
    f = await prepararVinculosJornada();
    cuentaId = (await f.e.admin.instalacion.findUniqueOrThrow({ where: { id: f.a } })).cuentaId;
    contratoId = await crear("Contrato de servicio", "contrato_servicio", "Cliente {cuenta.razon_social}, RUT {cuenta.rut}, en {contrato.fecha}.");
    actaId = await crear("Acta de entrega", "acta", "Acta en {instalacion.nombre} de {cuenta.nombre}.");
    laboralId = await crear("Carta", "carta_trabajador", "Estimado {persona.nombre}.");
  });
  afterAll(async () => {
    await f?.e.cerrar();
  });

  it("el contrato de servicio dice qué falta de la cuenta", async () => {
    const r = await llamar("core.documento_plantillas.rellenar_entidad", { plantillaId: contratoId, entidadId: cuentaId });
    expect(r.ok).toBe(true);
    const d = r.ok ? (r.data as Rel) : ({} as Rel);
    expect(d.entidad.tipo).toBe("cuenta");
    expect(d.puedeGenerar).toBe(false);
    expect(d.faltantes.map((x) => x.clave)).toEqual(expect.arrayContaining(["cuenta.razon_social", "cuenta.rut"]));
    expect(await llamar("core.documento_plantillas.generar_entidad", { plantillaId: contratoId, entidadId: cuentaId })).toMatchObject({ ok: false });
    expect(almacen.objetos.size).toBe(0);
  });

  it("cada ámbito rechaza la plantilla ajena", async () => {
    expect(await llamar("core.documento_plantillas.rellenar_entidad", { plantillaId: laboralId, entidadId: cuentaId })).toMatchObject({ ok: false });
    expect(await llamar("core.documento_plantillas.rellenar", { plantillaId: contratoId, personaId: f.personaId })).toMatchObject({ ok: false });
    expect(await llamar("core.documento_plantillas.rellenar_entidad", { plantillaId: contratoId, entidadId: f.a })).toMatchObject({ ok: false });
  });

  it("no deja usar variables de persona en un contrato de servicio", async () => {
    const r = await executeCapability(ctx(f.tenantId), "core.documento_plantillas.create", {
      nombre: "Mala",
      clase: "contrato_servicio",
      nivelFirma: "N1",
      contenido: "Hola {persona.nombre}",
    });
    expect(r.ok).toBe(false);
    expect(JSON.stringify(r)).toMatch(/no valen para este tipo/);
  });

  it("genera el acta de una instalación y deja el PDF vinculado a ella", async () => {
    const vista = await llamar("core.documento_plantillas.generar_entidad", { plantillaId: actaId, entidadId: f.a }, { dryRun: true });
    expect(vista.ok).toBe(true);
    expect(almacen.objetos.size).toBe(0);
    const r = await llamar("core.documento_plantillas.generar_entidad", { plantillaId: actaId, entidadId: f.a });
    expect(r.ok).toBe(true);
    const d = r.ok ? (r.data as Gen) : ({} as Gen);
    const fila = await f.e.admin.documento.findUniqueOrThrow({ where: { id: d.documento?.id ?? "" }, include: { vinculos: true } });
    expect(fila.mime).toBe("application/pdf");
    expect(fila.bitacoraSeq).not.toBeNull();
    expect(fila.vinculos[0]).toMatchObject({ entidadTipo: "instalacion", entidadId: f.a, rol: "propietario" });
  });

  it("el gerente queda fuera y otra empresa no ve la entidad", async () => {
    const input = { plantillaId: actaId, entidadId: f.a };
    expect(await llamar("core.documento_plantillas.generar_entidad", input, { rol: "gerente" })).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
    expect(await llamar("core.documento_plantillas.generar_entidad", { plantillaId: actaId, entidadId: f.ajena }, {})).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
  });
});
