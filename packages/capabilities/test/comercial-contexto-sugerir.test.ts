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

import { contextoSugerirSeccion } from "../src/comercial/contexto-sugerir";

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
type Donde = { estado?: string; id?: { in: string[] } };
// Contexto falso mínimo: la capacidad lee `ctx.db.negocioContexto`, abre una transacción corta y audita.
function armar(filas = NOTAS, tras: (filas: typeof NOTAS) => typeof NOTAS = (f) => f) {
  let llamadas = 0;
  const findMany = vi.fn(async (a: { where: Donde }) => {
    llamadas += 1;
    const base = llamadas === 1 ? filas : tras(filas);
    return base.filter((f) => (!a.where.estado || f.estado === a.where.estado) && (!a.where.id || a.where.id.in.includes(f.id)));
  });
  const registrar = vi.fn(async (_tx: unknown, _e: unknown) => ({ seq: 1, hash: "h" }));
  const nc = { findMany };
  const ctx = {
    tenantId: "t1",
    actor: { tipo: "user", id: "u1" },
    db: { negocioContexto: nc },
    transaccion: async <T,>(fn: (tx: { negocioContexto: typeof nc }) => Promise<T>) => fn({ negocioContexto: nc }),
    auditoria: { registrar },
  } as unknown as Ctx;
  return { ctx, findMany, registrar };
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

  it("audita los IDs de las notas usadas en una transacción corta, después de la IA", async () => {
    const orden: string[] = [];
    dobles.iaDe.mockResolvedValue({ completar: async () => { orden.push("ia"); return { texto: "Texto." }; } });
    const { ctx: c, registrar } = armar();
    registrar.mockImplementation(async () => { orden.push("auditoria"); return { seq: 1, hash: "h" }; });
    await ejecutar(c);
    expect(orden).toEqual(["ia", "auditoria"]);
    expect(registrar).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ capability: "comercial.contexto.sugerir_seccion", payload: { ids: ["n2", "n1"] } }));
  });

  it("con incluirInferido en falso el filtro de estado va en la consulta, antes del límite", async () => {
    dobles.iaDe.mockResolvedValue({ completar: async () => ({ texto: "Texto." }) });
    const { ctx: c, findMany } = armar();
    await ejecutar(c, { incluirInferido: false });
    expect(findMany.mock.calls[0]![0].where).toMatchObject({ estado: "confirmado" });
  });

  it("si una nota cambió mientras la IA generaba, no revela nada ni audita", async () => {
    dobles.iaDe.mockResolvedValue({ completar: async () => ({ texto: "Texto." }) });
    const { ctx: c, registrar } = armar(NOTAS, (f) => f.filter((x) => x.id !== "n1"));
    await expect(ejecutar(c)).rejects.toThrow(/cambió mientras se generaba/);
    expect(registrar).not.toHaveBeenCalled();
  });

  it("si falla el append de auditoría, no se revela el borrador", async () => {
    dobles.iaDe.mockResolvedValue({ completar: async () => ({ texto: "Texto." }) });
    const { ctx: c, registrar } = armar();
    registrar.mockRejectedValue(new Error("auditoría caída"));
    await expect(ejecutar(c)).rejects.toThrow(/auditoría caída/);
  });
});
