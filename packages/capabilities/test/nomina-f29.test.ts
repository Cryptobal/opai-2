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
const PER = "0192f3a0-0000-7000-8000-00000000f6a1";
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
    { id: PER, tenantId: T, anio: 2026, mes: 11, estado: "abierto", inicio: f("2026-11-01"), fin: f("2026-11-30"), cierrePrevisto: f("2026-11-30") },
  ],
  nominaLiquidacion: [{ id: "l1", tenantId: T, periodoId: PER, personaId: P1, diasTrabajados: 30, liquido: 500_000, detalle }],
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

describe("nomina.f29.generar", () => {
  it("devuelve Excel con retención del impuesto único del período", async () => {
    const c = contextoDePrueba({ rol: "owner", portal: "erp", modulosActivos: ["nomina"], semilla: semilla() });
    const r = await executeCapability(c.ctx, "nomina.f29.generar", { periodoId: PER });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const data = r.data as { filas: number; nombre: string; base64: string };
    expect(data.filas).toBe(1);
    expect(data.nombre).toContain("f29_retencion");
    expect(data.base64.length).toBeGreaterThan(100);
  });
});