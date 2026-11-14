// CAR-344: `nomina.costo_proyectado.listar` para el flujo de caja. Solo totales por concepto y fecha,
// sin datos de personas; permisos de Nómina, rango máximo de 6 meses, contrato de listas y advertencias.
import { beforeEach, describe, expect, it } from "vitest";

import { CLAVES_INDICADORES } from "@opai/domain";

import { publicacionesReferencia } from "../../domain/src/remuneraciones/referencia.fixture";
import {
  capacidadesDelNucleo,
  capacidadesNomina,
  executeCapability,
  limpiarModulos,
  limpiarRegistro,
  registrarCapacidades,
} from "../src";
import { TENANT_DE_PRUEBA, contextoDePrueba } from "../src/testing";
import { semillaTenant } from "./semilla";

const T = TENANT_DE_PRUEBA;
const P1 = "0192f3a0-0000-7000-8000-00000000e301";
const P2 = "0192f3a0-0000-7000-8000-00000000e302";
const P3 = "0192f3a0-0000-7000-8000-00000000e303";
const CARGO = "0192f3a0-0000-7000-8000-00000000e3c1";
const f = (s: string) => new Date(`${s}T00:00:00.000Z`);

const indicadores = () => {
  const pubs = publicacionesReferencia();
  return {
    indicadorLegal: CLAVES_INDICADORES.map((clave) => ({ id: `i-${clave}`, clave })),
    valorPublicado: pubs.map((p, i) => ({
      id: `v-${i}`, indicadorId: `i-${p.indicador}`, estado: "vigente", vigenteDesde: f(p.vigenteDesde),
      vigenteHasta: null, valorJson: p.valor, fuente: p.fuente, consultadaEl: f("2026-11-01"), verificacion: "verificado",
    })),
  };
};
const vinculo = (id: string, personaId: string, extra: Record<string, unknown> = {}) => ({
  id, tenantId: T, personaId, cargoId: CARGO, tipo: "indefinido", inicio: f("2025-01-01"), termino: null,
  estado: "vigente", puestoId: null, instalacionId: null, horasSemanales: 42, ...extra,
});
const estructura = (id: string, personaId: string, sueldoBase: number | null) => ({
  id, tenantId: T, nivel: "persona", personaId, cargoId: null, puestoId: null, instalacionId: null, sueldoBase,
  colacion: 0, movilizacion: 0, gratificacion: "legal_25", gratificacionMonto: null, vigenteDesde: f("2026-01-01"),
  vigenteHasta: null, estado: "vigente", motivo: "prueba", items: [],
});
const semilla = (conIndicadores = true) => ({
  ...semillaTenant(),
  ...(conIndicadores ? indicadores() : { indicadorLegal: [], valorPublicado: [] }),
  persona: [P1, P2, P3].map((id, i) => ({ id, tenantId: T, nombres: "N", apellidos: `A${i}`, rut: `${i + 1}`, estado: "activa" })),
  vinculoLaboral: [
    vinculo("0192f3a0-0000-7000-8000-00000000e311", P1),
    vinculo("0192f3a0-0000-7000-8000-00000000e312", P2),
    vinculo("0192f3a0-0000-7000-8000-00000000e313", P3, { tipo: "honorarios" }),
    // Vínculo anterior de P1 que termina en noviembre: P1 cuenta una sola vez.
    vinculo("0192f3a0-0000-7000-8000-00000000e314", P1, { tipo: "plazo_fijo", inicio: f("2024-01-01"), termino: f("2026-11-10"), estado: "terminado" }),
  ],
  estructuraSueldo: [
    estructura("0192f3a0-0000-7000-8000-00000000e321", P1, 553_553),
    estructura("0192f3a0-0000-7000-8000-00000000e322", P2, null),
  ],
  estructuraItem: [],
  nominaReglaAnticipo: [{ id: "a1", tenantId: T, personaId: P1, activa: true, modo: "monto_fijo", valor: 100_000, diaMes: 15 }],
});
const como = (rol: "owner" | "gerente" = "owner", conIndicadores = true, extra: Parameters<typeof contextoDePrueba>[0] = {}) =>
  contextoDePrueba({ rol, portal: "erp", modulosActivos: ["nomina"], semilla: semilla(conIndicadores), ...extra });
const sensibles = (c: ReturnType<typeof como>) =>
  (c.tabla("auditEvent") as { capability: string }[]).filter((e) => e.capability === "core.estructuras.read_sensible");

beforeEach(() => {
  limpiarRegistro();
  limpiarModulos();
  registrarCapacidades([...capacidadesDelNucleo, ...capacidadesNomina]);
});

type Salida = { items: { fecha: string; concepto: string; monto: number; personas: number }[]; siguiente: string | null; advertencias: string[] };
const listar = async (c: ReturnType<typeof como>, input: Record<string, unknown>) => {
  const r = await executeCapability(c.ctx, "nomina.costo_proyectado.listar", input);
  if (!r.ok) throw new Error(`${r.error.code}: ${r.error.message}`);
  return r.data as Salida;
};

describe("nomina.costo_proyectado.listar", () => {
  it("devuelve totales por concepto y fecha, sin datos de personas, y avisa lo que queda fuera", async () => {
    const r = await listar(como(), { desde: "2026-11-01", hasta: "2026-12-31" });
    const nov = r.items.filter((i) => i.fecha.startsWith("2026-11"));
    expect(nov.map((i) => [i.fecha, i.concepto, i.personas])).toEqual([
      ["2026-11-13", "previred", 1],
      ["2026-11-15", "anticipo", 1],
      ["2026-11-30", "sueldos", 1],
    ]);
    expect(nov[1]?.monto).toBe(100_000);
    expect(r.items.find((i) => i.fecha === "2026-12-13")?.concepto).toBe("previred");
    expect(JSON.stringify(r)).not.toMatch(new RegExp(`${P1}|${P2}|${P3}`));
    expect(r.advertencias.some((a) => a.startsWith("2026-11: 1 persona(s) sin estructura"))).toBe(true);
    expect(r.advertencias.some((a) => a.includes("CAR-96"))).toBe(true);
  });

  it("leer sueldos queda en la auditoría sensible", async () => {
    const c = como();
    await listar(c, { desde: "2026-11-01", hasta: "2026-11-30" });
    expect(sensibles(c).length).toBeGreaterThan(0);
  });

  it("sin el permiso de sueldos sensibles no suma montos y lo advierte", async () => {
    const c = como("owner", true, { permisosRol: ["nomina:read"] });
    const r = await listar(c, { desde: "2026-11-01", hasta: "2026-11-30" });
    expect(r.items).toEqual([]);
    expect(r.advertencias.some((a) => a.includes("sueldo oculto por permisos"))).toBe(true);
  });

  it("con alcance por instalación solo suma el personal de sus instalaciones", async () => {
    const r = await listar(como("owner", true, { alcance: { instalaciones: [] } }), { desde: "2026-11-01", hasta: "2026-11-30" });
    expect(r.items).toEqual([]);
    expect(r.advertencias.some((a) => a.includes("sin estructura"))).toBe(false);
  });

  it("sin valores legales no proyecta ni lee sueldos, y lo advierte", async () => {
    const c = como("owner", false);
    const r = await listar(c, { desde: "2026-11-01", hasta: "2026-11-30" });
    expect(r.items).toEqual([]);
    expect(r.advertencias.some((a) => a.includes("faltan valores legales"))).toBe(true);
    expect((c.tabla("auditEvent") as { capability: string }[]).some((e) => e.capability === "core.estructuras.read_sensible")).toBe(false);
  });

  it("pagina con cursor y límite", async () => {
    const c = como();
    const p1 = await listar(c, { desde: "2026-11-01", hasta: "2026-12-31", limite: 2 });
    expect(p1.items).toHaveLength(2);
    expect(p1.siguiente).toBe("2");
    const p2 = await listar(c, { desde: "2026-11-01", hasta: "2026-12-31", limite: 2, cursor: p1.siguiente });
    expect(p2.items[0]).not.toEqual(p1.items[0]);
  });

  it("rechaza un rango invertido o de más de 6 meses", async () => {
    const c = como();
    for (const input of [
      { desde: "2026-11-02", hasta: "2026-11-01" },
      { desde: "2026-01-01", hasta: "2026-07-02" },
      { desde: "2026-08-31", hasta: "2027-03-01" },
      { desde: "2026-11-01", hasta: "2026-11-30", cursor: "-2" },
    ])
      expect(await executeCapability(c.ctx, "nomina.costo_proyectado.listar", input)).toMatchObject({ ok: false, error: { code: "INVALID_INPUT" } });
  });

  it("el gerente no tiene acceso a Nómina (bloqueo financiero)", async () => {
    expect(await executeCapability(como("gerente").ctx, "nomina.costo_proyectado.listar", { desde: "2026-11-01", hasta: "2026-11-30" }))
      .toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
  });
});
