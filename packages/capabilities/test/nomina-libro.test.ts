// CAR-99: libro de remuneraciones PDF/Excel del período.
import { beforeEach, describe, expect, it } from "vitest";

import {
  ajustesNomina,
  capacidadesDelNucleo,
  capacidadesNomina,
  executeCapability,
  limpiarModulos,
  limpiarRegistro,
  registrarCapacidades,
} from "../src";
import { defineModule, registrarModulos } from "../src/module";
import { TENANT_DE_PRUEBA as T, contextoDePrueba } from "../src/testing";
import { semillaTenant } from "./semilla";

const P1 = "0192f3a0-0000-7000-8000-00000000f501";
const PER = "0192f3a0-0000-7000-8000-00000000f5a1";
const f = (s: string) => new Date(`${s}T00:00:00.000Z`);
const linea = (concepto: string, monto: number) => ({ concepto, monto });

const semilla = () => ({
  ...semillaTenant(),
  ajuste: [{ id: "a1", tenantId: T, modulo: "nomina", clave: "empleador_rut", ambito: "tenant", sujetoId: T, valor: "76.543.210-3" }],
  persona: [{ id: P1, tenantId: T, nombres: "N", apellidos: "A", rut: "12345678-5", estado: "activa" }],
  vinculoLaboral: [{ id: "v1", tenantId: T, personaId: P1, cargoId: "c", tipo: "indefinido", inicio: f("2025-01-01"), termino: null, estado: "vigente" }],
  nominaPeriodo: [{ id: PER, tenantId: T, anio: 2026, mes: 11, estado: "abierto", inicio: f("2026-11-01"), fin: f("2026-11-30"), cierrePrevisto: f("2026-11-30") }],
  nominaLiquidacion: [
    {
      id: "0192f3a0-0000-7000-8000-00000000f5b1",
      tenantId: T,
      periodoId: PER,
      personaId: P1,
      diasTrabajados: 30,
      liquido: 517_500,
      detalle: {
        haberes: [linea("Sueldo base", 600_000), linea("Gratificación", 150_000)],
        descuentosLegales: [linea("AFP", 80_000), linea("Salud", 52_500)],
        otrosDescuentos: [linea("Anticipos", 100_000)],
        aportesEmpleador: [linea("SIS", 11_000)],
        diasLicencia: 0,
      },
    },
  ],
});

beforeEach(() => {
  limpiarRegistro();
  limpiarModulos();
  registrarCapacidades([...capacidadesDelNucleo, ...capacidadesNomina]);
  registrarModulos([
    defineModule({ id: "nomina", nombre: "Remuneraciones", version: "0.1.0", dependencias: [], permisos: [], navegacion: [], configuracion: ajustesNomina, eventos: [], capacidades: [] }),
  ]);
});

const ctx = () => contextoDePrueba({ rol: "owner", portal: "erp", modulosActivos: ["nomina"], semilla: semilla() });
type Salida = { nombre: string; mime: string; base64: string; filas: number };

describe("nomina.libro_remuneraciones", () => {
  it("excel devuelve un xlsx con una fila y audita la persona", async () => {
    const c = ctx();
    const r = await executeCapability(c.ctx, "nomina.libro_remuneraciones.excel", { periodoId: PER });
    if (!r.ok) throw new Error(r.error.message);
    const s = r.data as Salida;
    expect(s.nombre).toBe("libro_remuneraciones_202611.xlsx");
    expect(s.filas).toBe(1);
    expect(s.mime).toContain("spreadsheet");
    expect(s.base64.length).toBeGreaterThan(100);
    const audit = (c.tabla("auditEvent") as { capability: string }[]).filter((e) => e.capability === "nomina.libro_remuneraciones.excel");
    expect(audit).toHaveLength(1);
    expect(JSON.stringify(audit[0])).toContain(P1);
  });

  it("pdf devuelve un archivo válido", async () => {
    const r = await executeCapability(ctx().ctx, "nomina.libro_remuneraciones.pdf", { periodoId: PER });
    if (!r.ok) throw new Error(r.error.message);
    const s = r.data as Salida;
    expect(s.nombre).toBe("libro_remuneraciones_202611.pdf");
    expect(s.mime).toBe("application/pdf");
    expect(Buffer.from(s.base64, "base64").subarray(0, 5).toString()).toBe("%PDF-");
  });
});