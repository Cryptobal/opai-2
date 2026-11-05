import { executeCapability, registrarCapacidades } from "@opai/capabilities";
import { contextoDePrueba } from "@opai/capabilities/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { resumenCalculoCongeladoParaLista } from "../persistencia/resumen-lista-cache";
import { mockMotorLegal } from "../persistencia/mock-motor-legal";
import type { ResultadoCalculo } from "../domain/motor";
import { ACTIVOS, CON_COSTOS, GESTOR, GESTOR_COSTOS, NEGOCIO_1, semilla } from "./fixtures";
import { capacidades } from "./index";

beforeAll(() => {
  registrarCapacidades(capacidades);
});

const ESTADOS_CONGELADO = ["archivada", "rechazada", "en_aprobacion", "lista"] as const;

async function cotizacionConPuesto(ctx: ReturnType<typeof contextoDePrueba>["ctx"]) {
  const c = await executeCapability(ctx, "cpq.cotizaciones.create", {
    negocioId: NEGOCIO_1,
    titulo: "Congelado estados",
  });
  if (!c.ok) throw new Error("fixture");
  const id = (c.data as { id: string }).id;
  const f0 = await executeCapability(ctx, "cpq.cotizaciones.ficha", { id });
  if (!f0.ok) throw new Error("ficha");
  const sec = (f0.data as { secciones: { id: string }[] }).secciones[0]!;
  await executeCapability(ctx, "cpq.lineas.crear", {
    seccionId: sec.id,
    tipo: "puesto",
    nombre: "Turno",
    sueldoBaseClp: 650_000,
  });
  await executeCapability(ctx, "cpq.cotizaciones.calcular", { id });
  const v = await ctx.db.cpqVersion.findFirst({ where: { cotizacionId: id }, orderBy: { numero: "desc" } });
  if (!v?.calculoCongeladoJson) throw new Error("sin cache");
  return { id, versionId: v.id, jsonCompleto: v.calculoCongeladoJson };
}

function ctxCon(permisos: readonly string[]) {
  return contextoDePrueba({
    semilla: semilla(),
    modulosActivos: ACTIVOS,
    permisos: [...permisos],
  });
}

describe("calculoCongeladoJson por estado (C-2)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockMotorLegal();
  });

  it.each(ESTADOS_CONGELADO)("persiste resultado completo tras calcular (%s)", async (estado) => {
    const { ctx } = ctxCon([...GESTOR, ...CON_COSTOS]);
    const { id } = await cotizacionConPuesto(ctx);
    await ctx.db.cpqVersion.updateMany({ where: { cotizacionId: id }, data: { estado } });
    const v = await ctx.db.cpqVersion.findFirst({ where: { cotizacionId: id } });
    const parsed = JSON.parse(v!.calculoCongeladoJson!) as { advertencias?: unknown; lineas?: unknown };
    expect(Array.isArray(parsed.advertencias)).toBe(true);
    expect(Array.isArray(parsed.lineas)).toBe(true);
  });

  it.each(ESTADOS_CONGELADO)(
    "ficha y preview_pdf ok con JSON completo y legacy de 4 campos (%s, con/sin costos)",
    async (estado) => {
      for (const legacy of [false, true]) {
        const { ctx } = ctxCon([...GESTOR, ...CON_COSTOS]);
        const { id, jsonCompleto } = await cotizacionConPuesto(ctx);
        const json = legacy
          ? JSON.stringify(
              resumenCalculoCongeladoParaLista(JSON.parse(jsonCompleto) as ResultadoCalculo),
            )
          : jsonCompleto;
        await ctx.db.cpqVersion.updateMany({
          where: { cotizacionId: id },
          data: { estado, calculoCongeladoJson: json },
        });

        for (const permisos of [GESTOR, GESTOR_COSTOS]) {
          const h = { ...ctx, autorizar: (p: string) => permisos.includes(p) };
          const ficha = await executeCapability(h, "cpq.cotizaciones.ficha", { id });
          expect(ficha.ok, `ficha ${estado} legacy=${legacy}`).toBe(true);
          if (!ficha.ok) continue;
          const calc = (ficha.data as { calculo: { advertencias?: string[]; ventaMensual?: number | null } }).calculo;
          expect(Array.isArray(calc.advertencias)).toBe(true);

          const pdf = await executeCapability(h, "cpq.cotizaciones.preview_pdf", { id });
          expect(pdf.ok, `preview ${estado} legacy=${legacy}`).toBe(true);
          if (pdf.ok) {
            const bytes = (pdf.data as { bytes: number }).bytes;
            expect(bytes).toBeGreaterThan(500);
            const raw = Buffer.from((pdf.data as { pdfBase64: string }).pdfBase64, "base64");
            expect(raw.subarray(0, 4).toString()).toBe("%PDF");
          }
        }
      }
    },
  );

  it("marcar_lista rechaza cuando hay costos pendientes", async () => {
    const { ctx } = ctxCon(GESTOR);
    const c = await executeCapability(ctx, "cpq.cotizaciones.create", {
      negocioId: NEGOCIO_1,
      titulo: "No lista",
    });
    if (!c.ok) throw new Error("fixture");
    const id = (c.data as { id: string }).id;
    const f0 = await executeCapability(ctx, "cpq.cotizaciones.ficha", { id });
    if (!f0.ok) throw new Error("ficha");
    const sec = (f0.data as { secciones: { id: string }[] }).secciones[0]!;
    await executeCapability(ctx, "cpq.lineas.crear", {
      seccionId: sec.id,
      tipo: "puesto",
      nombre: "Sin sueldo",
    });
    await executeCapability(ctx, "cpq.cotizaciones.calcular", { id });
    const r = await executeCapability(ctx, "cpq.cotizaciones.marcar_lista", { id });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("esperaba fallo");
    expect(r.error.message).toContain("costos o UF pendientes");
  });
});
