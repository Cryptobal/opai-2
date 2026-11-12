import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { crearContexto, executeCapability } from "../src";
import { MENSAJE_PLANTILLA_EJEMPLO } from "../src/core/anexos/plantilla";
import { almacenamientoEnMemoria } from "../src/testing/almacenamiento-memoria";
import { prepararVinculosJornada } from "./vinculos-jornada-fixture";

// CAR-58: con una plantilla de clase «Anexo» publicada en Documentos, el anexo se aprueba y su documento
// final es un PDF armado con ese texto; sin ella sigue bloqueado por la plantilla de ejemplo.
describe("anexos sobre plantillas de Documentos", () => {
  let f: Awaited<ReturnType<typeof prepararVinculosJornada>>;
  const almacen = almacenamientoEnMemoria();
  let userId = "";
  const ctx = () => crearContexto({ tenantId: f.tenantId, rol: "owner", portal: "erp", portalesMembresia: ["erp"], actor: { tipo: "user", id: userId }, usuario: { id: userId, nombre: "Rosa", email: "rosa@prueba.cl", platformRole: null }, servicios: { almacenamiento: almacen.almacenamiento } });
  let anexoId = "";

  beforeAll(async () => {
    f = await prepararVinculosJornada();
    userId = (await f.e.admin.user.create({ data: { name: "Rosa", email: `rosa-${Date.now()}@prueba.cl`, emailVerified: true } })).id;
    await f.e.admin.membership.create({ data: { tenantId: f.tenantId, userId, rol: "owner", portales: ["erp"] } });
    await f.e.forTenant(f.tenantId).persona.update({ where: { id: f.personaId }, data: { calle: "Av. Matta 123", comuna: "Santiago" } });
    await f.e.forTenant(f.tenantId).vinculoLaboral.create({
      data: { tenantId: f.tenantId, personaId: f.personaId, cargoId: f.cargoId, instalacionId: f.a, tipo: "indefinido", inicio: new Date("2026-03-01T00:00:00Z"), horasSemanales: 44, distribucion: "5x2 de 8 horas", estado: "vigente" },
    });
    const g = await executeCapability(ctx(), "core.anexos.generar", { personaId: f.personaId, motivoCambio: "monto", snapshotDespues: { nota: "x" } });
    if (!g.ok) throw new Error(JSON.stringify(g));
    anexoId = (g.data as { id: string }).id;
  });
  afterAll(async () => {
    await f?.e.cerrar();
  });

  it("sin plantilla publicada no se puede aprobar", async () => {
    const r = await executeCapability(ctx(), "core.anexos.aprobar", { id: anexoId });
    expect(r.ok).toBe(false);
    expect(JSON.stringify(r)).toContain(MENSAJE_PLANTILLA_EJEMPLO.slice(0, 40));
  });

  it("con la plantilla publicada aprueba y deja el PDF en Documentos", async () => {
    const c = await executeCapability(ctx(), "core.documento_plantillas.create", {
      nombre: "Anexo de contrato",
      clase: "anexo_contrato",
      nivelFirma: "N2",
      contenido: "En {contrato.fecha}, {persona.nombre}, RUT {persona.rut}, se modifica {contrato.motivo_cambio}.",
    });
    expect(c.ok).toBe(true);
    const r = await executeCapability(ctx(), "core.anexos.aprobar", { id: anexoId });
    expect(r.ok).toBe(true);
    const a = r.ok ? (r.data as { documentoId: string; estado: string }) : null;
    expect(a?.estado).toBe("aprobado");
    const doc = await f.e.admin.documento.findUniqueOrThrow({ where: { id: a?.documentoId ?? "" } });
    expect(doc.mime).toBe("application/pdf");
    expect(doc.nombre).toMatch(/\.pdf$/);
    const bytes = await almacen.almacenamiento.leerBytes(doc.storageKey);
    expect(bytes?.subarray(0, 5).toString()).toBe("%PDF-");
  });
});
