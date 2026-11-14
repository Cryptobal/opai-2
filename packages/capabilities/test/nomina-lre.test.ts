// CAR-99: archivo LRE del período. Permisos (vista completa), auditoría por personas, RUT del
// empleador desde Ajustes, contratos que terminan en el mes y liquidaciones antiguas sin aportes.
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
  ...(aportes ? { aportesEmpleador: [linea("SIS", 11_000)], diasLicencia: 0 } : {}),
});

const semilla = (rutEmpleador: string | null) => ({
  ...semillaTenant(),
  ajuste: rutEmpleador ? [{ id: "a1", tenantId: T, modulo: "nomina", clave: "empleador_rut", ambito: "tenant", sujetoId: T, valor: rutEmpleador }] : [],
  ajustePlataforma: [],
  persona: [
    { id: P1, tenantId: T, nombres: "N", apellidos: "A", rut: "12345678-5", estado: "activa" },
    { id: P2, tenantId: T, nombres: "N", apellidos: "B", rut: "11111111-1", estado: "activa" },
  ],
  vinculoLaboral: [
    { id: "v1", tenantId: T, personaId: P1, cargoId: "c", tipo: "indefinido", inicio: f("2025-01-01"), termino: null, estado: "vigente" },
    { id: "v2", tenantId: T, personaId: P2, cargoId: "c", tipo: "plazo_fijo", inicio: f("2026-06-01"), termino: f("2026-11-20"), estado: "terminado" },
  ],
  nominaPeriodo: [{ id: PER, tenantId: T, anio: 2026, mes: 11, estado: "abierto", inicio: f("2026-11-01"), fin: f("2026-11-30"), cierrePrevisto: f("2026-11-30") }],
  nominaLiquidacion: [
    { id: "0192f3a0-0000-7000-8000-00000000f5b1", tenantId: T, periodoId: PER, personaId: P1, diasTrabajados: 30, liquido: 517_500, detalle: detalle(true) },
    { id: "0192f3a0-0000-7000-8000-00000000f5b2", tenantId: T, periodoId: PER, personaId: P2, diasTrabajados: 20, liquido: 517_500, detalle: detalle(false) },
  ],
});
const como = (rol: "owner" | "gerente" = "owner", rut: string | null = "76.543.210-3", extra: Parameters<typeof contextoDePrueba>[0] = {}) =>
  contextoDePrueba({ rol, portal: "erp", modulosActivos: ["nomina"], semilla: semilla(rut), ...extra });
type Salida = { nombre: string; contenido: string; filas: number; personaIds: string[]; errores: { personaId: string | null; mensaje: string }[]; advertencias: string[]; formatoVerificado: boolean };
const generar = (c: ReturnType<typeof como>) => executeCapability(c.ctx, "nomina.lre.generar", { periodoId: PER });

beforeEach(() => {
  limpiarRegistro();
  limpiarModulos();
  registrarCapacidades([...capacidadesDelNucleo, ...capacidadesNomina]);
  registrarModulos([defineModule({ id: "nomina", nombre: "Remuneraciones", version: "0.1.0", dependencias: [], permisos: [], navegacion: [], configuracion: ajustesNomina, eventos: [], capacidades: [] })]);
});

describe("nomina.lre.generar", () => {
  it("arma el archivo con una fila por liquidación y audita a las personas incluidas", async () => {
    const c = como();
    const r = await generar(c);
    if (!r.ok) throw new Error(r.error.message);
    const s = r.data as Salida;
    expect(s.nombre).toBe("76543210_202611.csv");
    expect(s.filas).toBe(2);
    expect(s.formatoVerificado).toBe(false);
    const lineas = s.contenido.trim().split("\r\n");
    expect(lineas).toHaveLength(3);
    // P2 termina el 20 de noviembre: va la fecha de término.
    expect(lineas[2]?.split(";").slice(0, 3)).toEqual(["11111111-1", "01/06/2026", "20/11/2026"]);
    expect(s.errores).toEqual([{ personaId: P2, mensaje: "Liquidación sin aportes del empleador: recalcula el período." }]);
    const audit = (c.tabla("auditEvent") as { capability: string; payload?: unknown }[]).filter((e) => e.capability === "nomina.lre.generar");
    expect(audit).toHaveLength(1);
    expect(JSON.stringify(audit[0])).toContain(P1);
    expect(JSON.stringify(audit[0])).not.toContain("12345678-5");
  });

  it("un contrato a honorarios queda fuera con su motivo y la persona queda auditada", async () => {
    const c = como();
    (c.tabla("vinculoLaboral") as { personaId: string; tipo: string }[]).forEach((v) => { if (v.personaId === P2) v.tipo = "honorarios"; });
    const r = await generar(c);
    if (!r.ok) throw new Error(r.error.message);
    const s = r.data as Salida;
    expect(s.filas).toBe(1);
    expect(s.errores).toEqual([{ personaId: P2, mensaje: "Contrato a honorarios: no va en el LRE." }]);
    const audit = (c.tabla("auditEvent") as { capability: string }[]).filter((e) => e.capability === "nomina.lre.generar");
    expect(JSON.stringify(audit[0])).toContain(P2);
  });

  it("sin RUT en Remuneraciones usa el de los datos de la empresa", async () => {
    const c = como("owner", null, { semilla: { ...semilla(null), perfilEmpresa: [{ id: "pe", tenantId: T, rut: "76543210-3" }] } });
    const r = await generar(c);
    if (!r.ok) throw new Error(r.error.message);
    expect((r.data as Salida).nombre).toBe("76543210_202611.csv");
  });

  it("sin RUT del empleador lo informa como error", async () => {
    const r = await generar(como("owner", null));
    if (!r.ok) throw new Error(r.error.message);
    expect((r.data as Salida).errores[0]).toEqual({ personaId: null, mensaje: expect.stringMatching(/RUT válido de la empresa/) });
  });

  it("gerente (sin sueldos sensibles) no puede generarlo", async () => {
    const r = await generar(como("gerente"));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(["FORBIDDEN", "PERMISSION_DENIED"]).toContain(r.error.code);
  });

  it("un rol con alcance por instalación no puede generarlo", async () => {
    const r = await generar(como("owner", "76.543.210-3", { alcance: { instalaciones: [] } }));
    expect(r.ok).toBe(false);
  });
});
