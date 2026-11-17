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
const V1 = "0192f3a0-0000-7000-8000-00000000f602";
const V2 = "0192f3a0-0000-7000-8000-00000000f603";
const f = (s: string) => new Date(`${s}T00:00:00.000Z`);

const semilla = () => ({
  ...semillaTenant(),
  cargo: [{ id: "c", tenantId: T, nombre: "Guardia", estado: "activo" }],
  persona: [{ id: P1, tenantId: T, nombres: "Ana", apellidos: "Prueba", rut: "12345678-5", estado: "activa" }],
  vinculoLaboral: [
    { id: V1, tenantId: T, personaId: P1, cargoId: "c", tipo: "indefinido", inicio: f("2026-10-01"), termino: null, estado: "vigente" },
    {
      id: V2,
      tenantId: T,
      personaId: P1,
      cargoId: "c",
      tipo: "indefinido",
      inicio: f("2024-01-01"),
      termino: f("2026-09-15"),
      estado: "terminado",
      motivoTermino: "necesidades de la empresa",
    },
  ],
  anexoContrato: [],
  estructuraSueldo: [
    {
      id: "0192f3a0-0000-7000-8000-00000000f604",
      tenantId: T,
      nivel: "persona",
      personaId: P1,
      cargoId: null,
      puestoId: null,
      instalacionId: null,
      sueldoBase: 465_600,
      colacion: 0,
      movilizacion: 0,
      gratificacion: "legal_25",
      gratificacionMonto: null,
      vigenteDesde: f("2024-01-01"),
      vigenteHasta: null,
      estado: "vigente",
      motivo: "prueba",
      items: [],
    },
  ],
  estructuraItem: [],
});

const modulos = ["nomina", "nomina.cumplimiento_dt"] as const;

const como = () => contextoDePrueba({ rol: "owner", portal: "erp", modulosActivos: [...modulos], semilla: semilla() });

type ItemMidt = { movimientoTipo: string; referenciaId: string; registrado: boolean; hechoEn: string };

type ItemMidt = { movimientoTipo: string; referenciaId: string };

beforeEach(() => {
  limpiarRegistro();
  limpiarModulos();
  registrarCapacidades([...capacidadesDelNucleo, ...capacidadesNomina]);
  registrarModulos([
    defineModule({ id: "nomina", nombre: "Remuneraciones", version: "0.1.0", dependencias: [], permisos: [], navegacion: [], configuracion: ajustesNomina, eventos: [], capacidades: [] }),
  ]);
});

describe("nomina.cumplimiento_dt", () => {
  it("lista el alta del vínculo vigente", async () => {
    const { ctx } = como();
    const r = await executeCapability(ctx, "nomina.midt.listar", {});
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const data = r.data as { pendientes: number; items: ItemMidt[] };
    expect(data.pendientes).toBeGreaterThanOrEqual(1);
    expect(data.items.some((m) => m.movimientoTipo === "alta" && m.referenciaId === V1)).toBe(true);
  });

  it("lista finiquito pendiente tras término de vínculo", async () => {
    const { ctx } = como();
    const r = await executeCapability(ctx, "nomina.midt.listar", {});
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const lista = r.data as { items: ItemMidt[] };
    const fin = lista.items.find((m) => m.movimientoTipo === "finiquito" && m.referenciaId === V2);
    expect(fin?.registrado).toBe(false);
    expect(fin?.hechoEn).toBe("2026-09-15");
  });

  it("exporta CSV de pendientes", async () => {
    const { ctx } = como();
    const r = await executeCapability(ctx, "nomina.midt.exportar_pendientes", {});
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const csv = r.data as { contenido: string; filas: number };
    expect(csv.contenido).toContain("movimiento");
    expect(csv.filas).toBeGreaterThan(0);
  });

  it("obtiene propuesta de finiquito del vínculo terminado", async () => {
    const { ctx } = como();
    const r = await executeCapability(ctx, "nomina.finiquito.obtener", { vinculoId: V2 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const data = r.data as {
      propuesta: { lineas: { id: string }[] };
      comprobanteMiDt: unknown;
      cartaArt162: unknown;
      personaNombre: string;
    };
    expect(data.propuesta.lineas.length).toBeGreaterThan(0);
    expect(data.propuesta.lineas.some((l) => l.id === "feriado_proporcional")).toBe(true);
    expect(data.comprobanteMiDt).toBeNull();
    expect(data.cartaArt162).toBeNull();
    expect(data.personaNombre).toContain("Prueba");
  });

  it("rechaza sin el complemento Cumplimiento DT", async () => {
    const { ctx } = contextoDePrueba({ rol: "owner", portal: "erp", modulosActivos: ["nomina"], semilla: semilla() });
    const r = await executeCapability(ctx, "nomina.midt.listar", {});
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.message).toContain("Cumplimiento DT");
  });
});