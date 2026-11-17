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
});

const como = () => contextoDePrueba({ rol: "owner", portal: "erp", modulosActivos: ["nomina"], semilla: semilla() });

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

  it("lista baja pendiente tras término de vínculo", async () => {
    const { ctx } = como();
    const r = await executeCapability(ctx, "nomina.midt.listar", {});
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const data = r.data as { items: ItemMidt[] };
    const baja = data.items.find((m) => m.movimientoTipo === "baja" && m.referenciaId === V2);
    expect(baja?.registrado).toBe(false);
    expect(baja?.hechoEn).toBe("2026-09-15");
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
});