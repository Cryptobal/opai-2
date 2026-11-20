// CAR-99: nómina de Previred del período (105 campos). Reutiliza la carga del LRE: aquí se prueban los
// datos propios de Previred (previsión de la liquidación, sexo, cargas) y los permisos.
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
const P2 = "0192f3a0-0000-7000-8000-00000000f502";
const PER = "0192f3a0-0000-7000-8000-00000000f5a1";
const f = (s: string) => new Date(`${s}T00:00:00.000Z`);
const linea = (concepto: string, monto: number) => ({ concepto, monto });
const detalle = (aportes: boolean) => ({
  haberes: [linea("Sueldo base", 600_000), linea("Gratificación", 150_000)],
  descuentosLegales: [linea("AFP", 80_000), linea("Salud", 52_500)],
  otrosDescuentos: [linea("Anticipos", 100_000)],
  ...(aportes ? { aportesEmpleador: [linea("SIS", 11_000)], diasLicencia: 0, prevision: { afp: "modelo", salud: "fonasa", basePrevisional: 750_000, baseCesantia: 750_000 } } : {}),
});

const semilla = (rutEmpleador: string | null) => ({
  ...semillaTenant(),
  ajuste: rutEmpleador ? [{ id: "a1", tenantId: T, modulo: "nomina", clave: "empleador_rut", ambito: "tenant", sujetoId: T, valor: rutEmpleador }] : [],
  ajustePlataforma: [],
  persona: [
    { id: P1, tenantId: T, nombres: "N", apellidos: "A", rut: "12345678-5", sexo: "femenino", nacionalidad: "CL", estado: "activa" },
    { id: P2, tenantId: T, nombres: "N", apellidos: "B", rut: "11111111-1", sexo: null, nacionalidad: "PE", estado: "activa" },
  ],
  vinculoLaboral: [
    { id: "v1", tenantId: T, personaId: P1, cargoId: "c", tipo: "indefinido", inicio: f("2025-01-01"), termino: null, estado: "vigente" },
    { id: "v2", tenantId: T, personaId: P2, cargoId: "c", tipo: "plazo_fijo", inicio: f("2026-06-01"), termino: f("2026-11-20"), estado: "terminado" },
  ],
  personaPrevision: [{ id: "pp1", tenantId: T, personaId: P1, tramoAsignacion: "B", cargasSimples: 2, cargasMaternales: 0, cargasInvalidez: 0, jubilado: false }],
  nominaPeriodo: [{ id: PER, tenantId: T, anio: 2026, mes: 11, estado: "abierto", inicio: f("2026-11-01"), fin: f("2026-11-30"), cierrePrevisto: f("2026-11-30") }],
  nominaLiquidacion: [
    { id: "0192f3a0-0000-7000-8000-00000000f5b1", tenantId: T, periodoId: PER, personaId: P1, diasTrabajados: 30, liquido: 517_500, detalle: detalle(true) },
    { id: "0192f3a0-0000-7000-8000-00000000f5b2", tenantId: T, periodoId: PER, personaId: P2, diasTrabajados: 20, liquido: 517_500, detalle: detalle(false) },
  ],
});
const como = (rol: "owner" | "gerente" = "owner", rut: string | null = "76.543.210-3", extra: Parameters<typeof contextoDePrueba>[0] = {}) =>
  contextoDePrueba({ rol, portal: "erp", modulosActivos: ["nomina"], semilla: semilla(rut), ...extra });
type Salida = { nombre: string; contenido: string; filas: number; personaIds: string[]; errores: { personaId: string | null; mensaje: string }[]; advertencias: string[]; formatoVerificado: boolean };
const generar = (c: ReturnType<typeof como>) => executeCapability(c.ctx, "nomina.previred.generar", { periodoId: PER });

beforeEach(() => {
  limpiarRegistro();
  limpiarModulos();
  registrarCapacidades([...capacidadesDelNucleo, ...capacidadesNomina]);
  registrarModulos([defineModule({ id: "nomina", nombre: "Remuneraciones", version: "0.1.0", dependencias: [], permisos: [], navegacion: [], configuracion: ajustesNomina, eventos: [], capacidades: [] })]);
});

describe("nomina.previred.generar", () => {
  it("una línea de 105 campos por persona, con la previsión guardada en la liquidación", async () => {
    const c = como();
    const r = await generar(c);
    if (!r.ok) throw new Error(r.error.message);
    const s = r.data as Salida;
    expect(s.nombre).toBe("previred_76543210_112026.txt");
    expect(s.filas).toBe(2);
    const [l1, l2] = s.contenido.trim().split("\r\n").map((l) => l.split(";"));
    expect(l1).toHaveLength(105);
    expect([l1?.[0], l1?.[5], l1?.[17], l1?.[18], l1?.[25], l1?.[26]]).toEqual(["12345678", "F", "B", "2", "34", "750000"]);
    // P2: extranjera, sin sexo y con una liquidación antigua sin previsión ni aportes.
    expect(l2?.[6]).toBe("1");
    expect(s.errores.map((e) => e.mensaje)).toEqual([
      "Falta el sexo (F o M) que pide Previred.",
      "Liquidación sin datos de previsión: recalcula el período.",
      "Liquidación sin aportes del empleador: recalcula el período.",
    ]);
    const audit = (c.tabla("auditEvent") as { capability: string }[]).filter((e) => e.capability === "nomina.previred.generar");
    expect(audit).toHaveLength(1);
    expect(JSON.stringify(audit[0])).not.toContain("12345678");
  });

  it("gerente y roles con alcance no pueden generarla", async () => {
    expect((await generar(como("gerente"))).ok).toBe(false);
    expect((await generar(como("owner", "76.543.210-3", { alcance: { instalaciones: [] } }))).ok).toBe(false);
  });
});
