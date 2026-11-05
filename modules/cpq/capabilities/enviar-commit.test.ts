import { executeCapability, registrarCapacidades } from "@opai/capabilities";
import { contextoDePrueba } from "@opai/capabilities/testing";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { mockMotorLegal } from "../persistencia/mock-motor-legal";
import { reabrirParaEditar } from "../persistencia/reabrir";
import { leerVersionEsperada } from "../persistencia/version-esperada";
import type { ResultadoCalculo } from "../domain/motor";
import { commitEnviarCotizacion } from "./enviar-commit";
import { ACTIVOS, CON_COSTOS, GESTOR, NEGOCIO_1, semilla } from "./fixtures";
import { capacidades } from "./index";

const eliminar = vi.fn(async () => undefined);
vi.mock("../persistencia/registrar-pdf-propuesta", () => ({
  subirPdfPropuestaAlmacenamiento: async () => ({ storageKey: "k" }),
  registrarPdfPropuestaMetadatos: async () => "doc-1",
  eliminarPdfPropuestaAlmacenamiento: (...a: unknown[]) => eliminar(...(a as [])),
}));
vi.mock("../persistencia/enviar-negocio", () => ({ moverNegocioPropuestaEnviada: async () => undefined }));

beforeAll(() => {
  registrarCapacidades(capacidades);
});

async function listaConPuesto() {
  const { ctx } = contextoDePrueba({
    semilla: semilla(),
    modulosActivos: ACTIVOS,
    permisos: [...GESTOR, ...CON_COSTOS],
  });
  const c = await executeCapability(ctx, "cpq.cotizaciones.create", { negocioId: NEGOCIO_1, titulo: "Carrera" });
  if (!c.ok) throw new Error("fixture");
  const id = (c.data as { id: string }).id;
  const f0 = await executeCapability(ctx, "cpq.cotizaciones.ficha", { id });
  if (!f0.ok) throw new Error("ficha");
  const sec = (f0.data as { secciones: { id: string }[] }).secciones[0]!;
  await executeCapability(ctx, "cpq.lineas.crear", { seccionId: sec.id, tipo: "puesto", nombre: "Turno", sueldoBaseClp: 650_000 });
  const v = await ctx.db.cpqVersion.findFirst({ where: { cotizacionId: id } });
  await ctx.db.cpqVersion.updateMany({ where: { id: v!.id }, data: { estado: "lista" } });
  return { ctx, id, versionId: v!.id, seccionId: sec.id };
}

function pack(f: Awaited<ReturnType<typeof listaConPuesto>>, versionEsperada: { estado: string; huella: string }) {
  return {
    cotizacionId: f.id,
    codigo: "CPQ-1",
    negocioId: NEGOCIO_1,
    versionId: f.versionId,
    versionNumero: 1,
    versionEsperada,
    contactoId: null,
    enviarCorreo: false,
    pdf: new Uint8Array([1]),
    pdfPack: { marcaVersion: 1, plantillaId: "p", plantillaVersion: 1 },
    resultado: { ventaMensual: 1_000_000 } as unknown as ResultadoCalculo,
    neg: { id: NEGOCIO_1, etapaId: "e", estado: "abierto", createdAt: new Date(), embudoId: "m" },
    correoPreview: { para: null, datos: {} },
  };
}

describe("commitEnviarCotizacion: carrera entre reabrir y enviar (CAR-192)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    eliminar.mockClear();
    mockMotorLegal();
    vi.useFakeTimers({ toFake: ["Date"] });
  });
  afterEach(() => vi.useRealTimers());

  async function estado(f: { ctx: Awaited<ReturnType<typeof listaConPuesto>>["ctx"]; versionId: string }) {
    return (await f.ctx.db.cpqVersion.findFirst({ where: { id: f.versionId } }))!.estado;
  }

  it("marca enviada si nada cambió desde la validación", async () => {
    const f = await listaConPuesto();
    const esperada = (await leerVersionEsperada(f.ctx.db, f.versionId))!;
    await commitEnviarCotizacion(f.ctx, pack(f, esperada));
    expect(await estado(f)).toBe("enviada");
  });

  it("reabrir entre la preparación y la confirmación da conflicto y no deja nada enviado", async () => {
    const f = await listaConPuesto();
    const esperada = (await leerVersionEsperada(f.ctx.db, f.versionId))!;
    await reabrirParaEditar(f.ctx, f.versionId);
    await expect(commitEnviarCotizacion(f.ctx, pack(f, esperada))).rejects.toMatchObject({ code: "CONFLICT" });
    expect(await estado(f)).toBe("borrador");
    expect(eliminar).toHaveBeenCalledTimes(1);
  });

  it("reabrir → editar → volver a marcar lista también da conflicto", async () => {
    const f = await listaConPuesto();
    const esperada = (await leerVersionEsperada(f.ctx.db, f.versionId))!;
    vi.setSystemTime(Date.now() + 5_000);
    await reabrirParaEditar(f.ctx, f.versionId);
    vi.setSystemTime(Date.now() + 5_000);
    await f.ctx.db.cpqLinea.updateMany({ where: { seccionId: f.seccionId }, data: { sueldoBaseClp: 900_000 } });
    vi.setSystemTime(Date.now() + 5_000);
    await f.ctx.db.cpqVersion.updateMany({ where: { id: f.versionId }, data: { estado: "lista" } });
    expect(await estado(f)).toBe("lista");
    await expect(commitEnviarCotizacion(f.ctx, pack(f, esperada))).rejects.toMatchObject({ code: "CONFLICT" });
    expect(await estado(f)).toBe("lista");
  });

  it("editar un puesto en borrador mientras se arma el PDF también da conflicto", async () => {
    const f = await listaConPuesto();
    await f.ctx.db.cpqVersion.updateMany({ where: { id: f.versionId }, data: { estado: "borrador" } });
    const esperada = (await leerVersionEsperada(f.ctx.db, f.versionId))!;
    vi.setSystemTime(Date.now() + 5_000);
    await f.ctx.db.cpqLinea.updateMany({ where: { seccionId: f.seccionId }, data: { sueldoBaseClp: 900_000 } });
    await expect(commitEnviarCotizacion(f.ctx, pack(f, esperada))).rejects.toMatchObject({ code: "CONFLICT" });
    expect(await estado(f)).toBe("borrador");
  });
});
