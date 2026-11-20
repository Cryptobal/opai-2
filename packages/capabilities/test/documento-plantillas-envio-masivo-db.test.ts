import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { crearContexto, executeCapability } from "../src";
import { almacenamientoEnMemoria } from "../src/testing/almacenamiento-memoria";
import { prepararVinculosJornada } from "./vinculos-jornada-fixture";

describe("plantillas laborales: envío masivo", () => {
  let f: Awaited<ReturnType<typeof prepararVinculosJornada>>;
  let plantillaId = "";
  let almacen = almacenamientoEnMemoria();
  let cerrarCaso: (() => Promise<void>) | undefined;
  const fecha = "2026-11-01";
  const ctx = (rol: "owner" | "gerente" = "owner") =>
    crearContexto({ tenantId: f.tenantId, rol, actor: { tipo: "system" }, servicios: { almacenamiento: almacen.almacenamiento } });

  beforeEach(async () => {
    cerrarCaso = undefined;
    almacen = almacenamientoEnMemoria();
    // El helper crea dos tenants con UUID nuevos y sus fixtures para este caso.
    f = await prepararVinculosJornada();
    cerrarCaso = () => f.e.cerrar();
    await f.e.forTenant(f.tenantId).vinculoLaboral.create({
      data: { tenantId: f.tenantId, personaId: f.personaId, cargoId: f.cargoId, instalacionId: f.a,
        tipo: "indefinido", inicio: new Date("2026-01-01T00:00:00Z"), estado: "vigente" },
    });
    const r = await executeCapability(ctx(), "core.documento_plantillas.create", {
      nombre: "Anexo masivo",
      clase: "anexo_contrato",
      nivelFirma: "N2",
      firmantes: "trabajador",
      contenido: "Anexo para {persona.nombre}, RUT {persona.rut}, domicilio {persona.direccion}.",
    });
    if (!r.ok) throw new Error(JSON.stringify(r));
    plantillaId = (r.data as { id: string }).id;
  });
  const completarPersona = () => f.e.forTenant(f.tenantId).persona.update({
    where: { id: f.personaId },
    data: { calle: "Calle Ficticia 123", comuna: "Santiago", emailPersonal: "persona@example.invalid" },
  });
  afterEach(async () => {
    // La bitácora es append-only incluso para el propietario: no borrar tenants ni desactivar
    // triggers. Las filas de estos UUID únicos se eliminan al destruir la base efímera de CI.
    try {
      await cerrarCaso?.();
    } finally {
      almacen.objetos.clear();
      almacen.cuerpos.clear();
      almacen.bytes.clear();
      cerrarCaso = undefined;
    }
  });

  it("lista candidatas y marca faltantes", async () => {
    const r = await executeCapability(ctx(), "core.documento_plantillas.candidatas", { plantillaId, fecha });
    expect(r.ok).toBe(true);
    const d = r.ok ? (r.data as { items: { personaId: string; puedeGenerar: boolean }[] }) : { items: [] };
    expect(d.items.some((p) => p.personaId === f.personaId)).toBe(true);
    expect(d.items.find((p) => p.personaId === f.personaId)?.puedeGenerar).toBe(false);
  });

  it("dryRun del lote no guarda documentos", async () => {
    await completarPersona();
    const c = await executeCapability(ctx(), "core.documento_plantillas.candidatas", { plantillaId, fecha });
    expect(c.ok).toBe(true);
    if (!c.ok) throw new Error(JSON.stringify(c));
    const candidata = (c.data as { items: { personaId: string; puedeGenerar: boolean }[] }).items
      .find((p) => p.personaId === f.personaId);
    expect(candidata?.puedeGenerar).toBe(true);
    const objetosAntes = almacen.objetos.size;
    const firmasAntes = await f.e.admin.solicitudFirma.count({ where: { tenantId: f.tenantId } });
    const antes = await f.e.admin.documento.count({ where: { tenantId: f.tenantId } });
    const r = await executeCapability(
      ctx(),
      "core.documento_plantillas.enviar_masivo",
      { plantillaId, fecha, personaIds: [f.personaId] },
      { dryRun: true },
    );
    expect(r.ok).toBe(true);
    const despues = await f.e.admin.documento.count({ where: { tenantId: f.tenantId } });
    expect(r).toMatchObject({ ok: true, data: { procesadas: 1, exitosas: 1, fallidas: 0,
      filas: [{ personaId: f.personaId, estado: "ok", documentoId: null, solicitudFirmaId: null }] } });
    expect(despues).toBe(antes);
    expect(await f.e.admin.solicitudFirma.count({ where: { tenantId: f.tenantId } })).toBe(firmasAntes);
    expect(almacen.objetos.size).toBe(objetosAntes);
  });

  it("un error en una persona no frena a la otra", async () => {
    await completarPersona();
    const r = await executeCapability(ctx(), "core.documento_plantillas.enviar_masivo", {
      plantillaId, fecha,
      personaIds: [f.personaId, "00000000-0000-4000-8000-000000000099"],
    });
    expect(r.ok).toBe(true);
    const d = r.ok ? (r.data as { exitosas: number; fallidas: number }) : { exitosas: 0, fallidas: 0 };
    expect(d.exitosas).toBe(1);
    expect(d.fallidas).toBe(1);
  });
});