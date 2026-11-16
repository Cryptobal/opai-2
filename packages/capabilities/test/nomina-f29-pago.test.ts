// CAR-99: F29 retenciones y archivo de pago bancario (diseño 06).
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

const P1 = "0192f3a0-0000-7000-8000-00000000f601";
const PER_ABIERTO = "0192f3a0-0000-7000-8000-00000000f6a1";
const PER_CERRADO = "0192f3a0-0000-7000-8000-00000000f6a2";
const f = (s: string) => new Date(`${s}T00:00:00.000Z`);
const linea = (concepto: string, monto: number) => ({ concepto, monto });
const detalle = {
  haberes: [linea("Sueldo base", 600_000)],
  descuentosLegales: [linea("Impuesto único", 25_000), linea("AFP", 50_000)],
  otrosDescuentos: [],
  aportesEmpleador: [linea("SIS", 5_000)],
  diasLicencia: 0,
};

const semilla = () => ({
  ...semillaTenant(),
  ajuste: [{ id: "a1", tenantId: T, modulo: "nomina", clave: "empleador_rut", ambito: "tenant", sujetoId: T, valor: "76.543.210-3" }],
  persona: [{ id: P1, tenantId: T, nombres: "N", apellidos: "A", rut: "12345678-5", estado: "activa" }],
  vinculoLaboral: [
    { id: "v1", tenantId: T, personaId: P1, cargoId: "c", tipo: "indefinido", inicio: f("2025-01-01"), termino: null, estado: "vigente" },
  ],
  nominaPeriodo: [
    { id: PER_ABIERTO, tenantId: T, anio: 2026, mes: 11, estado: "abierto", inicio: f("2026-11-01"), fin: f("2026-11-30"), cierrePrevisto: f("2026-11-30") },
    { id: PER_CERRADO, tenantId: T, anio: 2026, mes: 10, estado: "cerrado", inicio: f("2026-10-01"), fin: f("2026-10-31"), cierrePrevisto: f("2026-10-31") },
  ],
  nominaLiquidacion: [
    { id: "l1", tenantId: T, periodoId: PER_ABIERTO, personaId: P1, diasTrabajados: 30, liquido: 500_000, detalle },
    { id: "l2", tenantId: T, periodoId: PER_CERRADO, personaId: P1, diasTrabajados: 30, liquido: 500_000, detalle },
  ],
});
const como = () => contextoDePrueba({ rol: "owner", portal: "erp", modulosActivos: ["nomina"], semilla: semilla() });

beforeEach(() => {
  limpiarRegistro();
  limpiarModulos();
  registrarCapacidades([...capacidadesDelNucleo, ...capacidadesNomina]);
  registrarModulos([
    defineModule({
      id: "nomina",
      nombre: "Remuneraciones",
      version: "0.1.0",
      dependencias: [],
      permisos: [],
      navegacion: [],
      configuracion: ajustesNomina,
      eventos: [],
      capacidades: [],
    }),
  ]);
});

describe("nomina.f29.generar", () => {
  it("devuelve Excel con una fila y retención del impuesto único", async () => {
    const c = como();
    const r = await executeCapability(c.ctx, "nomina.f29.generar", { periodoId: PER_ABIERTO });
    if (!r.ok) throw new Error(r.error.message);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const d = r.data as { filas: number; base64: string; nombre: string };
    expect(d.filas).toBe(1);
    expect(d.nombre).toContain("f29_retencion");
    expect(d.base64.length).toBeGreaterThan(100);
  });
});

describe("nomina.pago_banco.generar", () => {
  it("rechaza período abierto", async () => {
    const c = como();
    const r = await executeCapability(c.ctx, "nomina.pago_banco.generar", { periodoId: PER_ABIERTO });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe("UNPROCESSABLE");
  });

  it("marca error sin cuenta bancaria en período cerrado", async () => {
    const c = como();
    const r = await executeCapability(c.ctx, "nomina.pago_banco.generar", { periodoId: PER_CERRADO });
    if (!r.ok) throw new Error(r.error.message);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const d = r.data as { filas: number; errores: { personaId: string | null }[] };
    expect(d.filas).toBe(0);
    expect(d.errores.some((e) => e.personaId === P1)).toBe(true);
  });
});