import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { crearContexto, executeCapability } from "../src";
import { prepararVinculosJornada } from "./vinculos-jornada-fixture";

// CAR-127 PR 4a · Vista previa de un documento laboral con Postgres real: variables de la ficha, del
// contrato, de la instalación y del sueldo; lo que falta; aislamiento entre empresas y permisos.
type Vista = {
  parrafos: { texto: string; faltante: string | null }[][];
  faltantes: { clave: string; motivo: string }[];
  puedeGenerar: boolean;
  persona: { nombre: string };
  firma: { nivel: string; firmantes: string };
};
const texto = (v: Vista) => v.parrafos.map((p) => p.map((s) => s.texto).join("")).join("\n");

describe("plantillas laborales: vista previa del documento", () => {
  let f: Awaited<ReturnType<typeof prepararVinculosJornada>>;
  let plantillaId = "";
  const ctx = (tenantId: string, rol: "owner" | "gerente" = "owner") =>
    crearContexto({ tenantId, rol, actor: { tipo: "system" } });
  const rellenar = (rol: "owner" | "gerente" = "owner", tenant = f.tenantId, personaId = f.personaId) =>
    executeCapability(ctx(tenant, rol), "core.documento_plantillas.rellenar", { plantillaId, personaId, fecha: "2026-11-01" });

  beforeAll(async () => {
    f = await prepararVinculosJornada();
    const r = await executeCapability(ctx(f.tenantId), "core.documento_plantillas.create", {
      nombre: "Anexo de prueba",
      clase: "anexo_contrato",
      nivelFirma: "N2",
      contenido: "En {contrato.fecha}, {persona.nombre}, RUT {persona.rut}, domiciliada en {persona.direccion}.\n\nCargo **{vinculo.cargo}** en {instalacion.nombre} desde {vinculo.inicio}, {vinculo.jornada}. Sueldo base {sueldo.base}.",
    });
    expect(r.ok).toBe(true);
    plantillaId = r.ok ? (r.data as { id: string }).id : "";
  });
  afterAll(async () => {
    await f?.e.cerrar();
  });

  it("sin dirección ni contrato vigente informa qué falta y no permite generar", async () => {
    const r = await rellenar();
    expect(r.ok).toBe(true);
    const v = r.ok ? (r.data as Vista) : null;
    expect(v?.puedeGenerar).toBe(false);
    expect(v?.faltantes.map((x) => x.clave)).toEqual(
      expect.arrayContaining(["persona.direccion", "vinculo.cargo", "vinculo.inicio", "instalacion.nombre"]),
    );
    expect(v?.faltantes.find((x) => x.clave === "persona.direccion")?.motivo).toMatch(/Falta la dirección/);
    expect(v?.faltantes.find((x) => x.clave === "vinculo.cargo")?.motivo).toMatch(/no tiene un contrato vigente/);
    expect(texto(v as Vista)).toContain("En 01-11-2026, Persona Ficticia, RUT 12.345.678-5");
  });

  it("con dirección y contrato vigente rellena todo, incluido el sueldo con lectura sensible", async () => {
    const db = f.e.forTenant(f.tenantId);
    await db.persona.update({ where: { id: f.personaId }, data: { calle: "Av. Matta 123", comuna: "Santiago" } });
    await db.vinculoLaboral.create({
      data: { tenantId: f.tenantId, personaId: f.personaId, cargoId: f.cargoId, instalacionId: f.a, tipo: "indefinido", inicio: new Date("2026-03-01T00:00:00Z"), horasSemanales: 44, distribucion: "5x2 de 8 horas", estado: "vigente" },
    });
    const r = await rellenar();
    expect(r.ok).toBe(true);
    const v = r.ok ? (r.data as Vista) : ({} as Vista);
    expect(v.faltantes).toEqual([]);
    expect(v.puedeGenerar).toBe(true);
    expect(texto(v)).toBe(
      "En 01-11-2026, Persona Ficticia, RUT 12.345.678-5, domiciliada en Av. Matta 123, Santiago.\nCargo Guardia en Norte desde 01-03-2026, 44 horas semanales, 5x2 de 8 horas. Sueldo base $ 600.000.",
    );
    expect(v.firma).toEqual({ nivel: "N2", firmantes: "ambos" });
  });

  it("el gerente queda fuera y otra empresa no ve ni la plantilla ni la persona", async () => {
    expect(await rellenar("gerente")).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
    expect(await rellenar("owner", f.otro)).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
  });

  it("deja registro de la lectura de la persona sin copiar el texto ni los montos", async () => {
    const filas = await f.e.admin.auditEvent.findMany({ where: { tenantId: f.tenantId, capability: "core.documento_plantillas.rellenar" } });
    expect(filas.length).toBeGreaterThan(0);
    const json = JSON.stringify(filas);
    expect(json).not.toContain("600.000");
    expect(json).not.toContain("Av. Matta");
  });
});
