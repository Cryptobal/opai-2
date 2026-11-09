// CAR-138 PR 5 · sugerencia de sección con IA: contexto falso y adaptador de IA simulado. Comprueba qué ve
// la IA (confirmado e inferido rotulado), que sin notas no se llama a la IA y que el error del proveedor no sale.
import { beforeEach, describe, expect, it, vi } from "vitest";

import type * as Comun from "../src/comercial/comun";

const dobles = vi.hoisted(() => ({ iaDe: vi.fn() }));
vi.mock("../src/integraciones/ia", () => ({ iaDe: dobles.iaDe }));
vi.mock("../src/comercial/comun", async (orig) => ({
  ...(await orig<typeof Comun>()),
  negocioDe: async (_ctx: unknown, id: string) => ({ id }),
}));

import { ESPERA_IA_MS, contextoSugerirSeccion } from "../src/comercial/contexto-sugerir";

type Solicitud = { prompt: string; sistema?: string };
type Ctx = Parameters<typeof contextoSugerirSeccion.handler>[0];
const fecha = (d: string) => new Date(`${d}T00:00:00.000Z`);
const fila = (id: string, estado: "confirmado" | "inferido", resumen: string, f: string) => ({
  id,
  tipo: "reunion",
  resumen,
  fuente: `acta ${f}`,
  fechaFuente: fecha(f),
  estado,
  createdAt: fecha(f),
});
const NOTAS = [
  fila("n2", "inferido", "Posible segunda instalación.", "2026-11-07"),
  fila("n1", "confirmado", "Pidió control de acceso y cobertura 24/7.", "2026-11-05"),
];
type Donde = { estado?: string };
// Contexto falso mínimo: la capacidad solo lee `ctx.db.negocioContexto` (la auditoría la hace el motor).
function armar(filas = NOTAS) {
  const findMany = vi.fn(async (a: { where: Donde }) => filas.filter((f) => !a.where.estado || f.estado === a.where.estado));
  return { ctx: { db: { negocioContexto: { findMany } } } as unknown as Ctx, findMany };
}
const ctx = (filas = NOTAS) => armar(filas).ctx;
const entrada = { negocioId: "00000000-0000-4000-8000-000000000001", seccion: "Comprensión del servicio", incluirInferido: true };
const ejecutar = (c: Ctx, input: Partial<typeof entrada> = {}) =>
  contextoSugerirSeccion.handler(c, { ...entrada, ...input }, { dryRun: false } as never);

describe("comercial.contexto.sugerir_seccion", () => {
  beforeEach(() => dobles.iaDe.mockReset());

  it("sin IA configurada avisa y deja seguir a mano", async () => {
    dobles.iaDe.mockResolvedValue(null);
    const r = await ejecutar(ctx());
    expect(r).toMatchObject({ disponible: false, borrador: null });
    expect(r.aviso).toMatch(/a mano/);
  });

  it("sin notas no llama a la IA y dice qué falta", async () => {
    const r = await ejecutar(ctx([]));
    expect(dobles.iaDe).not.toHaveBeenCalled();
    expect(r.borrador).toBeNull();
    expect(r.faltantes[0]).toMatch(/No hay notas de contexto/);
  });

  it("la IA ve lo confirmado y lo inferido rotulado, y el resultado separa borrador y faltantes", async () => {
    const completar = vi.fn(async (_s: Solicitud) => ({ texto: "Cobertura 24/7 con control de acceso.\n### FALTANTES\n- horario de visitas" }));
    dobles.iaDe.mockResolvedValue({ completar });
    const r = await ejecutar(ctx());
    const solicitud = completar.mock.calls[0]![0];
    expect(solicitud.prompt).toContain("Pidió control de acceso");
    expect(solicitud.prompt).toContain("(inferido)");
    expect(solicitud.sistema).toMatch(/No inventes montos/);
    expect(dobles.iaDe).toHaveBeenCalledWith(expect.anything(), "estandar", "comercial");
    expect(r.borrador).toBe("Cobertura 24/7 con control de acceso.");
    expect(r.faltantes).toEqual(["horario de visitas"]);
    expect(r.fuentes.map((f) => [f.id, f.estado])).toEqual([["n2", "inferido"], ["n1", "confirmado"]]);
  });

  it("con incluirInferido en falso la IA solo ve lo confirmado", async () => {
    const completar = vi.fn(async (_s: Solicitud) => ({ texto: "Texto." }));
    dobles.iaDe.mockResolvedValue({ completar });
    const r = await ejecutar(ctx(), { incluirInferido: false });
    const prompt = completar.mock.calls[0]![0].prompt;
    expect(prompt).not.toContain("segunda instalación");
    expect(r.fuentes.map((f) => f.id)).toEqual(["n1"]);
  });

  it("un fallo del proveedor no filtra su detalle", async () => {
    dobles.iaDe.mockResolvedValue({ completar: async () => { throw new Error("401 clave sk-secreta inválida"); } });
    await expect(ejecutar(ctx())).rejects.toThrow(/No pudimos generar la sugerencia/);
    await expect(ejecutar(ctx())).rejects.not.toThrow(/sk-secreta/);
  });

  it("con incluirInferido en falso el filtro de estado va en la consulta, antes del límite", async () => {
    dobles.iaDe.mockResolvedValue({ completar: async () => ({ texto: "Texto." }) });
    const { ctx: c, findMany } = armar();
    await ejecutar(c, { incluirInferido: false });
    expect(findMany.mock.calls[0]![0].where).toMatchObject({ estado: "confirmado" });
  });

  it("si la IA tarda más del límite, falla con un aviso claro dentro del plazo de la transacción", async () => {
    vi.useFakeTimers();
    try {
      dobles.iaDe.mockResolvedValue({ completar: () => new Promise(() => undefined) });
      const resultado = expect(ejecutar(ctx())).rejects.toThrow(/tardó demasiado/);
      await vi.advanceTimersByTimeAsync(ESPERA_IA_MS + 1);
      await resultado;
      expect(ESPERA_IA_MS).toBeLessThan(15_000);
    } finally {
      vi.useRealTimers();
    }
  });
});
