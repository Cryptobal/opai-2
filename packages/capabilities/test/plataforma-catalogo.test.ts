// CAR-204 · Catálogo de Plataforma (ADR-071 adenda, ADR-072): precio de lista versionado, lo incluido
// en el plan base, dependencias de las partes de Finanzas y que el precio de lista no toca condiciones.
import { beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";

import { PARTES_FINANZAS } from "@opai/domain";

import { capacidadesDelNucleo } from "../src/core";
import { executeCapability } from "../src/execute";
import { defineModule, limpiarModulos, registrarModulos } from "../src/module";
import { limpiarRegistro, registrarCapacidades } from "../src/registry";
import { contextoDePrueba, TENANT_DE_PRUEBA, USUARIO_DE_PRUEBA } from "../src/testing";
import { semillaTenant } from "./semilla";

const OTRA = "0192f3a0-0000-7000-8000-00000000000b";
const owner = { ...USUARIO_DE_PRUEBA, platformRole: "owner" as const };
const support = { ...USUARIO_DE_PRUEBA, platformRole: "support" as const };
const enDias = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);
const modulo = (id: string) =>
  defineModule({
    id,
    nombre: id,
    version: "0.1.0",
    dependencias: [],
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
  registrarModulos([modulo("tickets"), modulo("cpq"), modulo("finanzas")]);
});

function contexto(usuario: typeof owner | typeof support = owner) {
  const s = semillaTenant();
  const mod = (tenantId: string, moduloId: string, estado: string) => ({
    id: `m-${tenantId.slice(-4)}-${moduloId}`,
    tenantId,
    moduloId,
    estado,
  });
  return contextoDePrueba({
    usuario,
    conTenant: false,
    rol: null,
    semilla: {
      ...s,
      tenant: [...s.tenant, { ...s.tenant[0], id: OTRA, slug: "otra", nombre: "Otra" }],
      user: s.user.map((u) => (u.id === owner.id ? { ...u, platformRole: "owner" } : u)),
      perfilEmpresa: [{ tenantId: TENANT_DE_PRUEBA, rut: "76123456-0", razonSocial: "Gard SpA" }],
      tenantModule: [
        mod(TENANT_DE_PRUEBA, "finanzas", "activo"),
        mod(TENANT_DE_PRUEBA, "tickets", "activo"),
        mod(OTRA, "finanzas", "activo"),
      ],
    },
  });
}

const lista = {
  moduloId: "cpq",
  precio: {
    moneda: "UF",
    forma: "por_unidad",
    unidad: "usuario_licencia",
    precio: "0,1",
    minimoMensual: "5",
  },
};
const fijar = (tenantId: string, moduloId: string) => ({
  tenantId,
  moduloId,
  condicion: { moneda: "UF", precio: "3", cobroDesde: "2026-11-01" },
});

describe("platform.catalogo.list", () => {
  it("lista el plan base, los módulos y las siete partes; lo incluido va marcado y sin precio", async () => {
    const { ctx } = contexto();
    const r = await executeCapability(ctx, "platform.catalogo.list", {});
    if (!r.ok) throw new Error(r.error.message);
    const filas = r.data as { id: string; incluidoEnBase: boolean; formaSugerida: string | null }[];
    for (const p of PARTES_FINANZAS) expect(filas.some((f) => f.id === p)).toBe(true);
    expect(filas[0]?.id).toBe("base");
    for (const id of ["tickets", "portal_trabajador", "portal_cliente"])
      expect(filas.find((f) => f.id === id)).toMatchObject({
        incluidoEnBase: true,
        formaSugerida: null,
      });
    expect(filas.find((f) => f.id === "agente")?.incluidoEnBase).toBe(false);
    expect(filas.find((f) => f.id === "finanzas.flujo")).toMatchObject({
      dependenciasTexto: ["Bancos"],
    });
  });
});

describe("platform.catalogo.precio_set", () => {
  it("la vista previa no escribe; la real versiona y audita antes y después", async () => {
    const { ctx, tabla } = contexto();
    const previa = await executeCapability(ctx, "platform.catalogo.precio_set", lista, {
      dryRun: true,
    });
    expect(previa).toMatchObject({ ok: true, data: { antes: null, despues: { version: 1 } } });
    expect(tabla("ajustePlataforma")).toHaveLength(0);
    await executeCapability(ctx, "platform.catalogo.precio_set", lista);
    await executeCapability(ctx, "platform.catalogo.precio_set", {
      ...lista,
      precio: { ...lista.precio, precio: "0,12" },
    });
    expect(tabla("ajustePlataforma")).toHaveLength(1);
    const audit = tabla("auditoriaGlobal").filter(
      (e) => e["capability"] === "platform.catalogo.precio_set",
    );
    expect(audit).toHaveLength(2);
    expect(audit[0]).toMatchObject({ antes: null, despues: { version: 1 } });
    expect(audit[1]).toMatchObject({
      antes: { version: 1, precio: { precio: 1_000 } },
      despues: { version: 2, precio: { precio: 1_200 } },
    });
    const r = await executeCapability(ctx, "platform.catalogo.list", {});
    if (!r.ok) throw new Error(r.error.message);
    expect(
      (r.data as { id: string; textoPrecio: string | null }[]).find((f) => f.id === "cpq")
        ?.textoPrecio,
    ).toBe("UF 0,12 por usuario con licencia · mínimo UF 5");
  });

  it("la versión del precio de lista no retrocede al quitarlo y volver a fijarlo", async () => {
    const { ctx } = contexto();
    await executeCapability(ctx, "platform.catalogo.precio_set", lista);
    await executeCapability(ctx, "platform.catalogo.precio_set", { moduloId: "cpq", precio: null });
    const r = await executeCapability(ctx, "platform.catalogo.precio_set", lista);
    expect(r).toMatchObject({ ok: true, data: { despues: { version: 3 } } });
  });

  it("rechaza lo incluido en el plan base, lo desconocido y por unidad sin unidad", async () => {
    const { ctx, tabla } = contexto();
    const precio = { moneda: "UF", forma: "fijo", precio: "1" };
    expect(
      await executeCapability(ctx, "platform.catalogo.precio_set", { moduloId: "tickets", precio }),
    ).toMatchObject({
      ok: false,
      error: { message: expect.stringContaining("incluido en el plan base") },
    });
    expect(
      await executeCapability(ctx, "platform.catalogo.precio_set", { moduloId: "nada", precio }),
    ).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
    expect(
      await executeCapability(ctx, "platform.catalogo.precio_set", {
        moduloId: "cpq",
        precio: { ...precio, forma: "por_unidad" },
      }),
    ).toMatchObject({ ok: false });
    expect(tabla("ajustePlataforma")).toHaveLength(0);
  });

  it("support lee el catálogo pero no lo cambia", async () => {
    const { ctx, tabla } = contexto(support);
    expect(await executeCapability(ctx, "platform.catalogo.list", {})).toMatchObject({ ok: true });
    expect(await executeCapability(ctx, "platform.catalogo.precio_set", lista)).toMatchObject({
      ok: false,
      error: { code: "FORBIDDEN" },
    });
    expect(tabla("ajustePlataforma")).toHaveLength(0);
  });

  it("cambiar el precio de lista no toca las condiciones de las empresas", async () => {
    const { ctx, tabla } = contexto();
    await executeCapability(ctx, "platform.cobros.condiciones_set", fijar(TENANT_DE_PRUEBA, "cpq"));
    const antes = JSON.stringify(tabla("cobroCondicion"));
    await executeCapability(ctx, "platform.catalogo.precio_set", lista);
    expect(JSON.stringify(tabla("cobroCondicion"))).toBe(antes);
    expect(tabla("cobroCargo")).toHaveLength(0);
  });
});

describe("cobro de lo incluido y de las partes de Finanzas", () => {
  it("fijar precio a algo incluido en el plan base se rechaza con un mensaje claro", async () => {
    const { ctx, tabla } = contexto();
    const r = await executeCapability(
      ctx,
      "platform.cobros.condiciones_set",
      fijar(TENANT_DE_PRUEBA, "tickets"),
    );
    expect(r).toMatchObject({
      ok: false,
      error: { message: "Tickets está incluido en el plan base: no tiene precio aparte." },
    });
    expect(tabla("cobroCondicion")).toHaveLength(0);
    const p = await executeCapability(ctx, "platform.cobros.prueba_abrir", {
      tenantId: TENANT_DE_PRUEBA,
      moduloId: "tickets",
      pruebaHasta: enDias(30),
    });
    expect(p).toMatchObject({
      ok: false,
      error: { message: expect.stringContaining("plan base") },
    });
  });

  it("el resumen muestra lo incluido como «Incluido en el plan base»", async () => {
    const { ctx } = contexto();
    const r = await executeCapability(ctx, "platform.cobros.resumen", {
      periodo: "2026-10",
      tenantId: TENANT_DE_PRUEBA,
    });
    if (!r.ok) throw new Error(r.error.message);
    const e = (
      r.data as {
        empresas: {
          modulos: {
            moduloId: string;
            incluidoEnBase: boolean;
            calculo: { motivoTexto: string };
          }[];
        }[];
      }
    ).empresas[0];
    expect(e?.modulos.find((m) => m.moduloId === "tickets")).toMatchObject({
      incluidoEnBase: true,
      calculo: { motivoTexto: "Incluido en el plan base" },
    });
  });

  it("una parte necesita su dependencia al fijar precio y al abrir prueba", async () => {
    const { ctx } = contexto();
    expect(
      await executeCapability(
        ctx,
        "platform.cobros.condiciones_set",
        fijar(TENANT_DE_PRUEBA, "finanzas.flujo"),
      ),
    ).toMatchObject({
      ok: false,
      error: { message: expect.stringContaining("Flujo de caja necesita Bancos") },
    });
    expect(
      await executeCapability(
        ctx,
        "platform.cobros.condiciones_set",
        fijar(TENANT_DE_PRUEBA, "finanzas.bancos"),
      ),
    ).toMatchObject({ ok: true });
    expect(
      await executeCapability(
        ctx,
        "platform.cobros.condiciones_set",
        fijar(TENANT_DE_PRUEBA, "finanzas.flujo"),
      ),
    ).toMatchObject({ ok: true });
    // Cobranza necesita Ventas: abrir su prueba (con precio) también lo valida.
    await executeCapability(ctx, "platform.cobros.condiciones_set", {
      ...fijar(TENANT_DE_PRUEBA, "finanzas.contabilidad"),
    });
    const sinVentas = await executeCapability(ctx, "platform.cobros.prueba_abrir", {
      tenantId: TENANT_DE_PRUEBA,
      moduloId: "finanzas.cobranza",
      pruebaHasta: enDias(30),
    });
    expect(sinVentas).toMatchObject({ ok: false });
  });

  it("no se quita Bancos mientras Flujo de caja lo necesite, y no se mezcla Finanzas entero con partes", async () => {
    const { ctx } = contexto();
    await executeCapability(
      ctx,
      "platform.cobros.condiciones_set",
      fijar(TENANT_DE_PRUEBA, "finanzas.bancos"),
    );
    await executeCapability(
      ctx,
      "platform.cobros.condiciones_set",
      fijar(TENANT_DE_PRUEBA, "finanzas.flujo"),
    );
    expect(
      await executeCapability(ctx, "platform.cobros.condiciones_set", {
        tenantId: TENANT_DE_PRUEBA,
        moduloId: "finanzas.bancos",
        condicion: null,
      }),
    ).toMatchObject({
      ok: false,
      error: { message: expect.stringContaining("depende de Bancos") },
    });
    expect(
      await executeCapability(
        ctx,
        "platform.cobros.condiciones_set",
        fijar(TENANT_DE_PRUEBA, "finanzas"),
      ),
    ).toMatchObject({ ok: false, error: { message: expect.stringContaining("quítalas") } });
  });

  it("fijar una parte en una empresa no cambia la otra", async () => {
    const { ctx, tabla } = contexto();
    await executeCapability(
      ctx,
      "platform.cobros.condiciones_set",
      fijar(TENANT_DE_PRUEBA, "finanzas.bancos"),
    );
    expect(tabla("cobroCondicion").map((c) => c["tenantId"])).toEqual([TENANT_DE_PRUEBA]);
    const r = await executeCapability(ctx, "platform.cobros.resumen", {
      periodo: "2026-11",
      tenantId: OTRA,
    });
    if (!r.ok) throw new Error(r.error.message);
    const m = (r.data as { empresas: { modulos: { moduloId: string; condicion: unknown }[] }[] })
      .empresas[0]?.modulos;
    expect(m?.find((x) => x.moduloId === "finanzas.bancos")?.condicion).toBeNull();
  });
});
