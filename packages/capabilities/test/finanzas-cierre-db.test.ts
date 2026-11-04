// F5 (CAR-167) · cierre de mes con Postgres real: tablero por etapa, seguimiento y emisión en lote todo o nada.
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { urlPropietario } from "../../db/test/entorno";

import { prepararVentasDb, type VentasDbSuite } from "./finanzas-ventas-db-helpers";

type Tablero = { etapas: { etapa: string; cantidad: number }[]; items: { documentoId: string; etapa: string }[] };
type Lote = { emitidos: number; omitidos: number; resultados: { documentoId: string; estado: string; motivo: string | null; folio: number | null }[] };

describe.skipIf(!urlPropietario)("Finanzas · cierre de mes (db)", () => {
  let s: VentasDbSuite;
  const ids: string[] = [];

  const etapaDe = async (id: string) =>
    (await s.dato<Tablero>("finanzas.cierre.tablero", { periodo: "2026-10" })).items.find((i) => i.documentoId === id)?.etapa;
  const cambiar = (documentoId: string, cambio: Record<string, unknown>, dryRun = false) =>
    s.dato("finanzas.cierre.actualizar", { documentoId, cambio }, { dryRun });

  beforeAll(async () => {
    s = await prepararVentasDb();
    const prog = await s.e.admin.ventasProgramacion.create({
      data: { tenantId: s.tenantId, cuentaId: s.cuentaId, nombre: "Torre Apoquindo", tipoDte: 33, diaGeneracion: 5, facturaTiming: "AL_EMITIR", facturaMesRelativo: "MES_SIGUIENTE" },
    });
    for (let i = 0; i < 3; i += 1) {
      const b = await s.dato<{ id: string }>("finanzas.ventas.crear_borrador", {
        cuentaId: s.cuentaId, tipoDte: 33, lineas: [{ glosa: `Servicio ${i}`, monto: 100_000 }],
      });
      ids.push(b.id);
      await s.e.admin.ventasProgramacionCorrida.create({
        data: { tenantId: s.tenantId, programacionId: prog.id, periodo: `2026-10-0${i + 1}`, documentoId: b.id },
      });
    }
  });

  afterAll(async () => {
    await s?.e.cerrar();
  });

  it("los borradores del mes arrancan «por enviar»", async () => {
    const t = await s.dato<Tablero>("finanzas.cierre.tablero", { periodo: "2026-10" });
    expect(t.items).toHaveLength(3);
    expect(t.etapas.find((e) => e.etapa === "por_enviar")?.cantidad).toBe(3);
    expect((await s.dato<Tablero>("finanzas.cierre.tablero", { periodo: "2026-09" })).items).toHaveLength(0);
  });

  it("recorre OC/HES → enviada → observada → OK, y la vista previa no escribe", async () => {
    const [a] = ids as [string];
    await cambiar(a, { accion: "registrar_oc_hes", requiereOcHes: true });
    expect(await etapaDe(a)).toBe("falta_oc_hes");
    await cambiar(a, { accion: "registrar_oc_hes", ordenCompra: "4500012871" });
    await cambiar(a, { accion: "marcar_enviada" }, true);
    expect(await etapaDe(a)).toBe("por_enviar");
    await cambiar(a, { accion: "marcar_enviada" });
    expect(await etapaDe(a)).toBe("esperando_ok");
    await cambiar(a, { accion: "observar", observacion: "El monto no coincide con la HES." });
    expect(await etapaDe(a)).toBe("observado");
    await cambiar(a, { accion: "marcar_ok" });
    expect(await etapaDe(a)).toBe("listo");
    const seg = await s.e.admin.ventasCierreSeguimiento.findUniqueOrThrow({ where: { documentoId: a } });
    expect(seg).toMatchObject({ estado: "ok", ordenCompra: "4500012871", observacion: null });
    expect(seg.enviadaEn).not.toBeNull();
    expect(seg.okEn).not.toBeNull();
  });

  it("el lote omite lo que no está listo y emite lo que tiene OK, una sola vez", async () => {
    const [a, b, c] = ids as [string, string, string];
    await cambiar(c, { accion: "marcar_ok" });
    const vista = await s.dato<Lote>("finanzas.cierre.emitir_lote", { documentoIds: [a, b, c] }, { dryRun: true });
    expect(vista).toMatchObject({ emitidos: 2, omitidos: 1 });
    expect(await s.e.admin.documentoEmitido.count({ where: { id: { in: ids }, folio: { not: null } } })).toBe(0);
    const r = await s.dato<Lote>("finanzas.cierre.emitir_lote", { documentoIds: [a, b, c] });
    expect(r).toMatchObject({ emitidos: 2, omitidos: 1 });
    expect(r.resultados.find((x) => x.documentoId === b)?.motivo).toContain("por enviar");
    expect(await etapaDe(a)).toBe("emitido");
    expect(await etapaDe(c)).toBe("emitido");
    expect(await etapaDe(b)).toBe("por_enviar");
    const folios = (await s.e.admin.documentoEmitido.findMany({ where: { id: { in: [a, c] } }, select: { folio: true } })).map((d) => d.folio);
    expect(new Set(folios).size).toBe(2);
    // Repetir el lote no vuelve a emitir.
    const otra = await s.dato<Lote>("finanzas.cierre.emitir_lote", { documentoIds: [a, c] });
    expect(otra).toMatchObject({ emitidos: 0, omitidos: 2 });
  });

  it("si una emisión del lote falla, no queda emitida ninguna (todo o nada)", async () => {
    const sinRut = await s.e.admin.cuenta.create({ data: { tenantId: s.tenantId, nombre: "Cliente sin RUT" } });
    const ok = await s.dato<{ id: string }>("finanzas.ventas.crear_borrador", { cuentaId: s.cuentaId, tipoDte: 33, lineas: [{ glosa: "A", monto: 10_000 }] });
    const mal = await s.dato<{ id: string }>("finanzas.ventas.crear_borrador", { cuentaId: sinRut.id, tipoDte: 33, lineas: [{ glosa: "B", monto: 10_000 }] });
    await cambiar(ok.id, { accion: "marcar_ok" });
    await cambiar(mal.id, { accion: "marcar_ok" });
    const r = await s.mod.executeCapability(s.ctx(), "finanzas.cierre.emitir_lote", { documentoIds: [ok.id, mal.id] });
    expect(r.ok).toBe(false);
    const filas = await s.e.admin.documentoEmitido.findMany({ where: { id: { in: [ok.id, mal.id] } }, select: { estadoDte: true, folio: true } });
    expect(filas).toEqual([{ estadoDte: "borrador", folio: null }, { estadoDte: "borrador", folio: null }]);
  });

  it("un documento emitido ya no admite seguimiento", async () => {
    const r = await s.mod.executeCapability(s.ctx(), "finanzas.cierre.actualizar", {
      documentoId: ids[0], cambio: { accion: "reabrir" },
    });
    expect(r.ok).toBe(false);
  });

  it("otra empresa no ve ni toca el cierre", async () => {
    const t = await s.mod.executeCapability(s.ctx(s.tenantB), "finanzas.cierre.tablero", { periodo: "2026-10" });
    expect(t.ok && (t.data as Tablero).items).toHaveLength(0);
    const r = await s.mod.executeCapability(s.ctx(s.tenantB), "finanzas.cierre.actualizar", {
      documentoId: ids[1], cambio: { accion: "marcar_ok" },
    });
    expect(r).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
  });
});
