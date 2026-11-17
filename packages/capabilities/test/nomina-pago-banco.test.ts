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

describe("nomina.pago_banco.generar", () => {
  it("rechaza período abierto", async () => {
    const c = contextoDePrueba({ rol: "owner", portal: "erp", modulosActivos: ["nomina"], semilla: semilla() });
    const r = await executeCapability(c.ctx, "nomina.pago_banco.generar", { periodoId: PER_ABIERTO });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe("UNPROCESSABLE");
  });

  it("marca error sin cuenta bancaria en período cerrado", async () => {
    const c = contextoDePrueba({ rol: "owner", portal: "erp", modulosActivos: ["nomina"], semilla: semilla() });
    const r = await executeCapability(c.ctx, "nomina.pago_banco.generar", { periodoId: PER_CERRADO });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.filas).toBe(0);
    expect(r.data.errores.some((e) => e.personaId === P1)).toBe(true);
  });
});