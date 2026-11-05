// CAR-192 (pendiente d del Revisor de #315): las etapas de un plan ya guardado se revalidan al
// ejecutarlo y al leerlo. Una etapa borrada o inactiva da un resultado claro y no rompe el trabajo.
import { describe, expect, it } from "vitest";

import { cerrarSinRespuesta } from "../src/comercial/seguimiento-cierre";
import { aplicarRespuesta } from "../src/comercial/seguimiento-ejecucion";
import { etapasInvalidasDelPlan } from "../src/comercial/seguimiento-etapas";
import { seguimientoPlanesList } from "../src/comercial/seguimiento-planes";
import { contextoDePrueba } from "../src/testing";

const BORRADA = "0192b5c0-0000-7000-8000-0000000000aa";

async function escenario() {
  const { ctx, tabla } = contextoDePrueba({ modulosActivos: ["comercial"] });
  const embudo = await ctx.db.embudo.create({ data: { tenantId: ctx.tenantId, nombre: "Ventas", porDefecto: true, activo: true } });
  const etapa = (nombre: string, orden: number, tipo: string, activa = true) =>
    ctx.db.etapa.create({ data: { tenantId: ctx.tenantId, embudoId: embudo.id, nombre, orden, tipo, activa } });
  const propuesta = await etapa("Propuesta", 2, "abierta");
  const perdida = await etapa("Perdido", 9, "perdida");
  const tope = await etapa("Negociación", 5, "abierta");
  await ctx.db.motivoPerdida.create({ data: { tenantId: ctx.tenantId, codigo: "sin_respuesta", nombre: "Sin respuesta", activo: true } });
  const negocio = await ctx.db.negocio.create({
    data: { tenantId: ctx.tenantId, titulo: "N", estado: "abierto", etapaId: propuesta.id, embudoId: embudo.id },
  });
  const seg = { id: "s1", negocioId: negocio.id, planVersion: 3 };
  return { ctx, tabla, embudo, propuesta, perdida, tope, negocio, seg };
}
const config = (extra: object) => ({ alResponder: "pausar", alTerminar: "aplicar_cierre_propuesto", pasos: [], ...extra }) as never;
const notas = (tabla: (n: string) => Record<string, unknown>[]) => tabla("actividad").map((a) => String(a["titulo"]));

describe("cierre sin respuesta con una etapa «no cerrar desde» que ya no sirve", () => {
  it("con la etapa borrada no cierra, lo explica en una nota y no lanza error", async () => {
    const { ctx, tabla, negocio, seg } = await escenario();
    await expect(cerrarSinRespuesta(ctx, seg, config({ noCerrarDesdeEtapa: BORRADA }))).resolves.toBe(false);
    expect((await ctx.db.negocio.findUnique({ where: { id: negocio.id } }))?.estado).toBe("abierto");
    expect(notas(tabla)).toContain("OPAI automático no cerró el negocio");
  });

  it("con la etapa inactiva tampoco cierra", async () => {
    const { ctx, tabla, embudo, seg } = await escenario();
    const vieja = await ctx.db.etapa.create({ data: { tenantId: ctx.tenantId, embudoId: embudo.id, nombre: "Vieja", orden: 8, tipo: "abierta", activa: false } });
    await expect(cerrarSinRespuesta(ctx, seg, config({ noCerrarDesdeEtapa: vieja.id }))).resolves.toBe(false);
    expect(notas(tabla)).toContain("OPAI automático no cerró el negocio");
  });

  it("con la etapa vigente (más adelante que la del negocio) sigue cerrando como antes", async () => {
    const { ctx, tope, seg, negocio } = await escenario();
    await expect(cerrarSinRespuesta(ctx, seg, config({ noCerrarDesdeEtapa: tope.id }))).resolves.toBe(true);
    expect((await ctx.db.negocio.findUnique({ where: { id: negocio.id } }))?.estado).not.toBe("abierto");
  });
});

describe("respuesta del cliente con la etapa «al responder» borrada o inactiva", () => {
  it("pausa, avisa, deja una nota que explica por qué no se movió el negocio y no rompe", async () => {
    const { ctx, tabla, negocio, propuesta } = await escenario();
    const fila = await ctx.db.seguimiento.create({
      data: { tenantId: ctx.tenantId, negocioId: negocio.id, planId: "p1", planVersion: 1, estado: "activo", ancla: new Date(), token: "t-1" },
    });
    const r = await ctx.transaccion((tx) => aplicarRespuesta(ctx, tx, fila, config({ etapaAlResponder: BORRADA }), { titulo: "Respondió" }));
    expect(r).not.toBeNull();
    expect((await ctx.db.seguimiento.findUnique({ where: { id: fila.id } }))?.estado).toBe("pausado");
    expect((await ctx.db.negocio.findUnique({ where: { id: negocio.id } }))?.etapaId).toBe(propuesta.id);
    expect(tabla("evento").filter((e) => e["tipo"] === "comercial.seguimiento.cliente_respondio")).toHaveLength(1);
    expect(JSON.stringify(tabla("actividad"))).toContain("ya no existe o está inactiva");
  });
});

describe("lectura de planes: se marcan las etapas que ya no sirven", () => {
  it("etapasInvalidasDelPlan nombra el campo; el plan sano no lista nada", async () => {
    const { ctx, tope } = await escenario();
    expect(await etapasInvalidasDelPlan(ctx, config({ noCerrarDesdeEtapa: tope.id }))).toEqual([]);
    const malas = await etapasInvalidasDelPlan(ctx, config({ etapaAlResponder: BORRADA, noCerrarDesdeEtapa: tope.id }));
    expect(malas).toHaveLength(1);
    expect(malas[0]).toMatchObject({ campo: "etapaAlResponder" });
  });

  it("comercial.seguimiento_planes.list trae etapasInvalidas del plan guardado", async () => {
    const { ctx } = await escenario();
    const plan = await ctx.db.planSeguimiento.create({
      data: { tenantId: ctx.tenantId, nombre: "Plan", disparador: "manual", porDefecto: false, activo: true, versionActual: 1 },
    });
    await ctx.db.planSeguimientoVersion.create({
      data: { tenantId: ctx.tenantId, planId: plan.id, version: 1, config: { conteo: "habiles", desde: "inicio", hora: "10:00", ventana: { desde: "09:00", hasta: "18:00" }, alResponder: "pausar", alTerminar: "solo_avisar", pasos: [], noCerrarDesdeEtapa: BORRADA } },
    });
    const lista = (await seguimientoPlanesList.handler(ctx, {}, { dryRun: false })) as { etapasInvalidas: string[] }[];
    expect(lista[0]?.etapasInvalidas).toHaveLength(1);
    expect(lista[0]?.etapasInvalidas[0]).toMatch(/no cerrar desde/);
  });
});
