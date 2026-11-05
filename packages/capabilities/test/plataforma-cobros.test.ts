// CAR-188 · Cobro por módulo (ADR-071): condiciones, resumen, cargos idempotentes, anular, permisos
// y aislamiento entre empresas en memoria. La RLS real se prueba en `plataforma-cobros-db.test.ts`.
import { beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";

import { capacidadesDelNucleo } from "../src/core";
import { executeCapability } from "../src/execute";
import { defineModule, limpiarModulos, registrarModulos } from "../src/module";
import { limpiarRegistro, registrarCapacidades } from "../src/registry";
import { contextoDePrueba, TENANT_DE_PRUEBA, USUARIO_DE_PRUEBA } from "../src/testing";
import type { platformCobrosResumen } from "../src/core/plataforma/cobros/resumen";
import { cargoDePrueba } from "./plataforma-cobros-semilla";

type Resumen = z.output<typeof platformCobrosResumen.output>;
import { semillaTenant } from "./semilla";

const OTRA = "0192f3a0-0000-7000-8000-00000000000b";
const CARGO_OTRA = "0192f3a0-0000-7000-8000-0000000000e1";
const owner = { ...USUARIO_DE_PRUEBA, platformRole: "owner" as const };
const support = { ...USUARIO_DE_PRUEBA, platformRole: "support" as const };
const modulo = (id: string, deps: string[] = []) =>
  defineModule({
    id,
    nombre: id.toUpperCase(),
    version: "0.1.0",
    dependencias: deps,
    permisos: [],
    navegacion: [],
    configuracion: z.object({}),
    eventos: [],
    capacidades: [],
  });

beforeEach(() => {
  limpiarRegistro();
  limpiarModulos();
  registrarCapacidades(capacidadesDelNucleo);
  registrarModulos([modulo("crm"), modulo("cpq", ["crm"]), modulo("rendiciones")]);
});

function semilla() {
  const s = semillaTenant();
  const mod = (tenantId: string, moduloId: string, estado: string) => ({
    id: `${tenantId.slice(0, 30)}${moduloId.length}${estado.length}`,
    tenantId,
    moduloId,
    estado,
  });
  return {
    ...s,
    tenant: [...s.tenant, { ...s.tenant[0], id: OTRA, slug: "otra", nombre: "Otra" }],
    user: s.user.map((u) => (u.id === owner.id ? { ...u, platformRole: "owner" } : u)),
    tenantModule: [
      mod(TENANT_DE_PRUEBA, "crm", "activo"),
      mod(TENANT_DE_PRUEBA, "cpq", "trial"),
      mod(OTRA, "crm", "activo"),
    ],
    cobroCargo: [cargoDePrueba(CARGO_OTRA, OTRA)],
    // UF de fin de octubre publicada (centavos de CLP).
    ufPublicada: [{ id: "uf1", desde: new Date("2026-10-31T00:00:00Z"), centavos: 3_900_000 }],
  };
}

const contexto = (usuario: typeof owner | typeof support = owner) =>
  contextoDePrueba({ usuario, semilla: semilla(), conTenant: false, rol: null });
const fijar = (tenantId: string, moduloId: string, condicion: Record<string, unknown> | null) => ({
  tenantId,
  moduloId,
  condicion,
});

describe("platform.cobros", () => {
  it("la vista previa no guarda; la escritura guarda y el resumen la refleja", async () => {
    const { ctx, tabla } = contexto();
    const entrada = fijar(TENANT_DE_PRUEBA, "crm", {
      moneda: "UF",
      precio: "2,5",
      cobroDesde: "2026-10-16",
      descuentoPorcentaje: 10,
    });
    const previa = await executeCapability(ctx, "platform.cobros.condiciones_set", entrada, {
      dryRun: true,
    });
    expect(previa).toMatchObject({
      ok: true,
      data: { antes: null, despues: { precio: 25_000, forma: "fijo" } },
    });
    expect(tabla("cobroCondicion")).toHaveLength(0);
    expect(await executeCapability(ctx, "platform.cobros.condiciones_set", entrada)).toMatchObject({
      ok: true,
    });
    const r = await executeCapability(ctx, "platform.cobros.resumen", { periodo: "2026-10" });
    if (!r.ok) throw new Error(r.error.message);
    const gard = (r.data as Resumen).empresas.find((e) => e.tenantId === TENANT_DE_PRUEBA);
    const crm = gard?.modulos.find((m) => m.moduloId === "crm");
    // 2,5 UF × 16/31 = 1,2903 UF; −10 % = 1,1613 UF; × $39.000 = $45.291.
    expect(crm?.calculo).toMatchObject({
      facturable: true,
      diasCobrados: 16,
      monto: 11_613,
      montoClp: 45_291,
    });
    expect(gard?.modulos.find((m) => m.moduloId === "cpq")?.calculo.motivo).toBe("sin_condicion");
    expect(gard?.modulos.find((m) => m.moduloId === "rendiciones")?.calculo.motivo).toBe(
      "modulo_inactivo",
    );
    expect((r.data as Resumen).totales).toMatchObject({
      facturables: 1,
      noFacturables: 4, // cpq, crm de la otra empresa y el plan base de las dos (sin condición)
      totalClp: 45_291,
    });
  });

  it("genera los cargos de un mes cerrado una sola vez, y se pueden anular y regenerar", async () => {
    const { ctx, tabla } = contexto();
    await executeCapability(
      ctx,
      "platform.cobros.condiciones_set",
      fijar(TENANT_DE_PRUEBA, "crm", {
        moneda: "CLP",
        precio: "300.000",
        cobroDesde: "2026-01-01",
      }),
    );
    const gen = { periodo: "2026-10", tenantId: TENANT_DE_PRUEBA };
    const previa = await executeCapability(ctx, "platform.cobros.cargos_generar", gen, {
      dryRun: true,
    });
    expect(previa).toMatchObject({ ok: true, data: { creados: 1, montoClp: 300_000 } });
    expect(tabla("cobroCargo").filter((c) => c["tenantId"] === TENANT_DE_PRUEBA)).toHaveLength(0);
    expect(await executeCapability(ctx, "platform.cobros.cargos_generar", gen)).toMatchObject({
      data: { creados: 1 },
    });
    const otra = await executeCapability(ctx, "platform.cobros.cargos_generar", gen);
    expect(otra).toMatchObject({
      data: { creados: 0, empresas: [{ omitidos: [{ motivo: "Ya generado" }] }] },
    });
    const lista = await executeCapability(ctx, "platform.cobros.cargos_list", {
      tenantId: TENANT_DE_PRUEBA,
    });
    if (!lista.ok) throw new Error(lista.error.message);
    const id = (lista.data as { id: string }[])[0]?.id ?? "";
    expect(
      await executeCapability(ctx, "platform.cobros.cargo_anular", {
        tenantId: TENANT_DE_PRUEBA,
        cargoId: id,
        motivo: "precio mal cargado",
      }),
    ).toMatchObject({ ok: true, data: { estado: "anulado" } });
    expect(await executeCapability(ctx, "platform.cobros.cargos_generar", gen)).toMatchObject({
      data: { creados: 1 },
    });
  });

  it("no genera el mes en curso y omite los cargos en UF sin la UF del último día", async () => {
    const { ctx } = contexto();
    const actual = new Date().toISOString().slice(0, 7);
    expect(
      await executeCapability(ctx, "platform.cobros.cargos_generar", { periodo: actual }),
    ).toMatchObject({ ok: false, error: { code: "UNPROCESSABLE" } });
    await executeCapability(
      ctx,
      "platform.cobros.condiciones_set",
      fijar(TENANT_DE_PRUEBA, "crm", {
        moneda: "UF",
        precio: "1",
        cobroDesde: "2026-01-01",
      }),
    );
    const r = await executeCapability(ctx, "platform.cobros.cargos_generar", {
      periodo: "2026-09",
      tenantId: TENANT_DE_PRUEBA,
    });
    expect(r).toMatchObject({
      data: {
        creados: 0,
        empresas: [{ omitidos: [{ motivo: "Sin UF publicada del último día del mes" }] }],
      },
    });
  });

  it("aísla las empresas: lo de una no se lee ni se anula desde otra", async () => {
    const { ctx } = contexto();
    const ajeno = await executeCapability(ctx, "platform.cobros.cargo_anular", {
      tenantId: TENANT_DE_PRUEBA,
      cargoId: CARGO_OTRA,
      motivo: "intento cruzado",
    });
    expect(ajeno).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
    const lista = await executeCapability(ctx, "platform.cobros.cargos_list", {
      tenantId: TENANT_DE_PRUEBA,
    });
    expect(lista).toMatchObject({ ok: true, data: [] });
    const modulo = await executeCapability(
      ctx,
      "platform.cobros.condiciones_set",
      fijar(TENANT_DE_PRUEBA, "core", null),
    );
    expect(modulo).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
  });

  it("el rol support lee pero no escribe", async () => {
    const { ctx } = contexto(support);
    expect(await executeCapability(ctx, "platform.cobros.resumen", {})).toMatchObject({ ok: true });
    const w = await executeCapability(
      ctx,
      "platform.cobros.condiciones_set",
      fijar(TENANT_DE_PRUEBA, "crm", null),
    );
    expect(w).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
  });
});
