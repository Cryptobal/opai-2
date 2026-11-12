import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";

import { defineIndicador, type IndicadorGestion } from "../src";
import { defineModule, limpiarModulos, registrarModulos } from "../src/module";
import { contextoDePrueba, TENANT_DE_PRUEBA } from "../src/testing";
import { codigo, dato, reiniciar } from "./maestros-ayuda";

const ANA = "0192f3a0-0000-7000-8000-0000000000a1";
const BEA = "0192f3a0-0000-7000-8000-0000000000b2";
const CATALOGO = "core.indicadores_gestion.catalogo";
const MEDIR = "core.indicadores_gestion.medir";

/** Indicador de un módulo de prueba: 5 para Ana, sin dato para Bea. Recuerda con qué se le llamó. */
const llamadas: { sujetos?: readonly string[] }[] = [];
const visitas: IndicadorGestion = defineIndicador({
  id: "pruebas.visitas_hechas",
  nombre: "Visitas hechas",
  descripcion: "Visitas de prueba registradas en el mes por cada persona.",
  tipo: "resultado",
  unidad: "cantidad",
  sentido: "mayor",
  sujeto: "usuario",
  metaSugerida: 10,
  origen: "visitas de prueba",
  permiso: "pruebas:read",
  medir: async (_ctx, consulta) => {
    llamadas.push(consulta.sujetos ? { sujetos: consulta.sujetos } : {});
    return [
      { sujetoId: ANA, valor: 5 },
      { sujetoId: BEA, valor: null },
    ];
  },
});

const modulo = (indicadores: readonly IndicadorGestion[]) =>
  defineModule({
    id: "pruebas",
    nombre: "Pruebas",
    version: "0.0.1",
    dependencias: [],
    permisos: [{ id: "pruebas:read", descripcion: "Ver las pruebas" }],
    navegacion: [],
    configuracion: z.object({}),
    eventos: [],
    capacidades: [],
    indicadores,
  });

const tenant = { tenant: [{ id: TENANT_DE_PRUEBA, timezone: "America/Santiago" }] };

beforeEach(() => {
  reiniciar();
  limpiarModulos();
  registrarModulos([modulo([visitas])]);
  llamadas.length = 0;
});
afterEach(limpiarModulos);

describe("manifiesto con indicadores", () => {
  it("rechaza un indicador de otro módulo, duplicado o con un permiso no declarado", () => {
    expect(() => modulo([{ ...visitas, id: "otro.visitas" }])).toThrow(/debe empezar con "pruebas\."/);
    expect(() => modulo([visitas, visitas])).toThrow(/duplicado/);
    expect(() => modulo([{ ...visitas, permiso: "pruebas:otro" }])).toThrow(/permiso no declarado/);
  });
  it("defineIndicador exige un permiso del propio módulo", () => {
    expect(() => defineIndicador({ ...visitas, permiso: "core:personas.read" })).toThrow(/propio módulo/);
  });
});

describe(CATALOGO, () => {
  it("lista los del núcleo y los de módulos activos, sin tocar el núcleo para sumar uno", async () => {
    const { ctx } = contextoDePrueba({ modulosActivos: ["pruebas"] });
    const lista = await dato<{ id: string; modulo: string; puedeMedir: boolean }[]>(ctx, CATALOGO, {});
    expect(lista.map((i) => i.id)).toEqual(["core.tareas_a_tiempo", "pruebas.visitas_hechas"]);
    expect(lista.every((i) => i.puedeMedir)).toBe(true);
    const soloPruebas = await dato<{ id: string }[]>(ctx, CATALOGO, { modulo: "pruebas" });
    expect(soloPruebas.map((i) => i.id)).toEqual(["pruebas.visitas_hechas"]);
  });
  it("un módulo apagado o fuera de los scopes de la key no aporta indicadores", async () => {
    const apagado = contextoDePrueba({ modulosActivos: [] }).ctx;
    expect((await dato<{ id: string }[]>(apagado, CATALOGO, {})).map((i) => i.id)).toEqual([
      "core.tareas_a_tiempo",
    ]);
    const sinScope = contextoDePrueba({ modulosActivos: ["pruebas"], scopes: ["core"] }).ctx;
    expect((await dato<{ id: string }[]>(sinScope, CATALOGO, {})).map((i) => i.id)).toEqual([
      "core.tareas_a_tiempo",
    ]);
  });
  it("marca lo que el actor no puede medir y niega el catálogo a viewer y supervisor", async () => {
    const sinModulo = contextoDePrueba({
      modulosActivos: ["pruebas"],
      permisos: ["core:indicadores_gestion.read"],
    }).ctx;
    const lista = await dato<{ id: string; puedeMedir: boolean }[]>(sinModulo, CATALOGO, {});
    expect(lista.find((i) => i.id === "pruebas.visitas_hechas")?.puedeMedir).toBe(false);
    for (const rol of ["viewer", "supervisor"] as const) {
      expect(await codigo(contextoDePrueba({ rol }).ctx, CATALOGO, {})).toBe("FORBIDDEN");
    }
    expect(await codigo(contextoDePrueba({ rol: "gerente" }).ctx, CATALOGO, {})).toBe("OK");
  });
});

describe(MEDIR, () => {
  type Salida = {
    periodo: string;
    desde: string;
    hasta: string;
    meta: number;
    mediciones: { sujetoId: string; valor: number | null; logro: number | null }[];
  };
  const ctxCon = (o: Parameters<typeof contextoDePrueba>[0] = {}) =>
    contextoDePrueba({ modulosActivos: ["pruebas"], semilla: tenant, ...o });

  it("mide el mes de la empresa y calcula el logro contra la meta sugerida", async () => {
    const { ctx } = ctxCon();
    const r = await dato<Salida>(ctx, MEDIR, { indicador: "pruebas.visitas_hechas", periodo: "2026-11" });
    expect(r).toMatchObject({
      periodo: "2026-11",
      desde: "2026-11-01T03:00:00.000Z",
      hasta: "2026-12-01T03:00:00.000Z",
      meta: 10,
    });
    expect(r.mediciones).toEqual([
      { sujetoId: ANA, valor: 5, logro: 0.5 },
      { sujetoId: BEA, valor: null, logro: null },
    ]);
  });
  it("usa la meta que se le pase y nunca devuelve a quien no se pidió", async () => {
    const { ctx } = ctxCon();
    const r = await dato<Salida>(ctx, MEDIR, {
      indicador: "pruebas.visitas_hechas",
      periodo: "2026-11",
      sujetos: [ANA],
      meta: 4,
    });
    expect(llamadas.at(-1)?.sujetos).toEqual([ANA]);
    // El indicador de prueba ignora el filtro y devuelve también a Bea: la capacidad la descarta.
    expect(r.mediciones).toEqual([{ sujetoId: ANA, valor: 5, logro: 1.2 }]);
  });
  it("audita los sujetos medidos, sin valores", async () => {
    const { ctx, eventos } = ctxCon();
    await dato(ctx, MEDIR, { indicador: "pruebas.visitas_hechas", periodo: "2026-11" });
    const lectura = eventos.find((e) => e.capability === MEDIR);
    expect(JSON.stringify(lectura?.payload)).toContain(ANA);
    expect(JSON.stringify(lectura?.payload)).not.toContain('"valor"');
  });
  it("un indicador de un módulo apagado no existe, y sin permiso del módulo no se mide", async () => {
    const apagado = ctxCon({ modulosActivos: [] }).ctx;
    expect(await codigo(apagado, MEDIR, { indicador: "pruebas.visitas_hechas" })).toBe("NOT_FOUND");
    const sinPermiso = ctxCon({ permisos: ["core:indicadores_gestion.read"] }).ctx;
    expect(await codigo(sinPermiso, MEDIR, { indicador: "pruebas.visitas_hechas" })).toBe("FORBIDDEN");
    expect(llamadas).toHaveLength(0);
  });
  it("con alcance por filas solo se mide a sí mismo", async () => {
    const permisos = ["core:indicadores_gestion.read", "pruebas:read"];
    const { ctx } = ctxCon({ permisos, alcance: { instalaciones: [] } });
    const propio = await dato<Salida>(ctx, MEDIR, { indicador: "pruebas.visitas_hechas", periodo: "2026-11" });
    expect(propio.mediciones.map((m) => m.sujetoId)).toEqual([ANA]);
    const ajeno = { indicador: "pruebas.visitas_hechas", sujetos: [BEA] };
    expect(await codigo(ctx, MEDIR, ajeno)).toBe("FORBIDDEN");
  });
  it("entrega de a 200 sujetos, audita solo la página y dice desde dónde seguir", async () => {
    const id = (n: number) => `0192f3a0-0000-7000-8000-${String(n).padStart(12, "0")}`;
    const muchos = defineIndicador({
      ...visitas,
      id: "pruebas.muchos",
      medir: async () => Array.from({ length: 205 }, (_, n) => ({ sujetoId: id(205 - n), valor: n })),
    });
    limpiarModulos();
    registrarModulos([modulo([muchos])]);
    type Pagina = Salida & { siguiente: string | null };
    const { ctx, eventos } = ctxCon();
    const una = await dato<Pagina>(ctx, MEDIR, { indicador: "pruebas.muchos", periodo: "2026-11" });
    expect(una.mediciones).toHaveLength(200);
    expect(una.mediciones[0]?.sujetoId).toBe(id(1));
    expect(una.siguiente).toBe(id(200));
    const lectura = JSON.stringify(eventos.find((e) => e.capability === MEDIR)?.payload);
    expect(lectura).toContain(id(200));
    expect(lectura).not.toContain(id(201));
    const dos = await dato<Pagina>(ctx, MEDIR, {
      indicador: "pruebas.muchos",
      periodo: "2026-11",
      despuesDe: una.siguiente,
    });
    expect(dos.mediciones.map((m) => m.sujetoId)).toEqual([201, 202, 203, 204, 205].map(id));
    expect(dos.siguiente).toBeNull();
  });
  it("rechaza una meta sobre 100 en un indicador de porcentaje", async () => {
    const { ctx } = contextoDePrueba({ semilla: tenant });
    const entrada = { indicador: "core.tareas_a_tiempo", periodo: "2026-11", meta: 150 };
    expect(await codigo(ctx, MEDIR, entrada)).toBe("UNPROCESSABLE");
  });
  it("rechaza un período que no es aaaa-mm", async () => {
    const { ctx } = ctxCon();
    expect(await codigo(ctx, MEDIR, { indicador: "pruebas.visitas_hechas", periodo: "2026-13" })).toBe(
      "INVALID_INPUT",
    );
  });
});
