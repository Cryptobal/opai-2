// CAR-326 · Las cotizaciones de OPAI 1 se guardan de verdad: cuelgan de su negocio, no se duplican en
// la segunda corrida, respetan el aislamiento por empresa y la reversión las quita (o se niega si ya
// hay trabajo hecho encima en 2.0).
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Decision, decision, indiceIds } from "../../scripts/importar-opai1/comun";
import { aplicarPorLotes, cerrarCorrida, iniciarCorrida } from "../../scripts/importar-opai1/corridas";
import { leerEstadoDestinoPorTenantId } from "../../scripts/importar-opai1/destino";
import type { DatosCotizacion } from "../../scripts/importar-opai1/cotizaciones-tipos";
import type { DatosNegocio } from "../../scripts/importar-opai1/negocios-plan";
import { calcularPlan } from "../../scripts/importar-opai1/plan";
import { revertirCorrida } from "../../scripts/importar-opai1/revertir";
import { type Entorno, prepararEntorno, urlPropietario } from "../entorno";
import { fixture } from "./memoria";

describe.skipIf(!urlPropietario)("Cotizaciones desde OPAI 1 (CAR-326)", () => {
  let e: Entorno;
  let tenantId = "";
  let otroTenant = "";
  let usuario = "";
  let etapa = "";

  beforeAll(async () => {
    e = await prepararEntorno();
    const sufijo = randomUUID().slice(0, 8);
    usuario = randomUUID();
    await e.admin.user.create({
      data: { id: usuario, name: "Responsable ficticio", email: `${usuario}@prueba.invalid`, emailVerified: true },
    });
    tenantId = (await e.admin.tenant.create({ data: { slug: `cot-${sufijo}`, nombre: "C", vertical: "seguridad" } })).id;
    otroTenant = (await e.admin.tenant.create({ data: { slug: `cot-o-${sufijo}`, nombre: "O", vertical: "seguridad" } })).id;
    const embudo = await e.admin.embudo.create({ data: { tenantId, nombre: "Ventas", porDefecto: true } });
    etapa = (await e.admin.etapa.create({ data: { tenantId, embudoId: embudo.id, nombre: "Propuesta", orden: 1 } })).id;
  });
  afterAll(async () => {
    await e?.cerrar();
  });

  const negocio = (cuentaId: string): DatosNegocio => ({
    cuentaId, etapaId: etapa, titulo: "Guardias bodega", montoEstimadoMensual: 1_500_000, probabilidad: 40,
    cierreEstimado: "2026-12-15", cotizacionEnviadaEn: null,
  });

  const cotizacion = (codigo: string, vigente: boolean): DatosCotizacion => ({
    codigo, negocioIdOpai1: "d-1", titulo: `Oferta ${codigo}`, estado: "enviada", moneda: "UF",
    validaHasta: "2026-12-31", enviadaEn: "2026-03-01T12:00:00.000Z", ventaMensualClp: 1_250_000,
    margenModo: "margen_sobre_venta", meses: 12, instalacionIdOpai1: null, creadaEn: "2026-03-01T12:00:00.000Z",
    vigente,
    lineas: [
      { nombre: "Guardia noche", grupo: "Guardia", posiciones: 2, orden: 0, horaInicio: "21:00", horaFin: "07:00",
        diasSemana: [1, 2, 3], sueldoBaseClp: 600_000, afp: null, saludTipo: "fonasa" },
    ],
  });

  async function correr(creadoPor: string | null, tenant = tenantId) {
    const estado = await leerEstadoDestinoPorTenantId(tenant);
    const base = calcularPlan(fixture(), estado, { modulosActivos: [] });
    const cuentaId = base.cuentas.find((c) => c.idOpai1 === "acc-a1")?.destinoId ?? "nueva:acc-a1";
    const yaNeg = indiceIds(estado, "negocio").porExterno.get("d-1");
    const yaCot = indiceIds(estado, "cotizacion").porExterno;
    const cot = (id: string, d: DatosCotizacion): Decision<DatosCotizacion> =>
      yaCot.has(id)
        ? decision("cotizacion", id, "sin_cambios", { destinoId: yaCot.get(id)! })
        : decision("cotizacion", id, "crear", { datos: d });
    const plan = {
      ...base,
      negocios: [
        yaNeg
          ? decision("negocio", "d-1", "sin_cambios", { destinoId: yaNeg, datos: negocio(cuentaId) })
          : decision("negocio", "d-1", "crear", { datos: negocio(cuentaId) }),
      ],
      cotizaciones: [cot("q1", cotizacion("CPQ-2026-001", true)), cot("q2", cotizacion("CPQ-2026-002", true))],
    };
    const id = await iniciarCorrida(tenant, { modo: "aplicar", origen: "fixtures" });
    const r = await aplicarPorLotes(tenant, id, plan, 2, undefined, creadoPor);
    await cerrarCorrida(tenant, id, "completada", r.aplicadas);
    return { id, r };
  }

  it("sin responsable no crea nada y lo deja anotado", async () => {
    const { id, r } = await correr(null);
    expect(r.aplicadas.cotizaciones).toBe(0);
    const filas = await e.admin.importacionFila.findMany({ where: { importacionId: id, entidad: "cotizacion" } });
    expect(filas.map((f) => f.motivo)).toEqual(["sin_responsable", "sin_responsable"]);
    expect(await e.admin.cpqCotizacion.count({ where: { tenantId } })).toBe(0);
    await revertirCorrida(tenantId, id, false);
  });

  it("guarda versión, sección y líneas, deja una sola vigente, no duplica y se revierte", async () => {
    const { id, r } = await correr(usuario);
    expect(r.aplicadas.cotizaciones).toBe(2);
    const cots = await e.admin.cpqCotizacion.findMany({
      where: { tenantId },
      orderBy: { codigo: "asc" },
      include: { versiones: { include: { secciones: { include: { lineas: true } } } } },
    });
    expect(cots.map((c) => [c.codigo, c.vigente])).toEqual([["CPQ-2026-001", true], ["CPQ-2026-002", false]]);
    const v = cots[0]!.versiones[0]!;
    expect([v.numero, v.estado, v.moneda, v.ventaMensualClp, v.mesesContrato]).toEqual([1, "enviada", "UF", 1_250_000, 12]);
    expect(v.secciones[0]!.nombre).toBe("Común");
    expect(v.secciones[0]!.lineas[0]).toMatchObject({ nombre: "Guardia noche", posiciones: 2, diasSemana: [1, 2, 3], saludTipo: "fonasa" });
    expect(await e.admin.cpqCotizacion.count({ where: { tenantId: otroTenant } })).toBe(0);

    const segunda = await correr(usuario);
    expect(segunda.r.aplicadas.cotizaciones).toBe(0);
    expect(await e.admin.cpqCotizacion.count({ where: { tenantId } })).toBe(2);

    const rev = await revertirCorrida(tenantId, id, false);
    expect(rev.bloqueadas).toEqual([]);
    expect(rev.revertida).toBe(true);
    expect(await e.admin.cpqCotizacion.count({ where: { tenantId } })).toBe(0);
    expect(await e.admin.negocio.count({ where: { tenantId } })).toBe(0);
    expect(await e.admin.idExterno.count({ where: { tenantId, entidadTipo: "cotizacion" } })).toBe(0);
  });

  it("se niega a revertir si alguien creó una versión nueva encima", async () => {
    const { id } = await correr(usuario);
    const c = await e.admin.cpqCotizacion.findFirstOrThrow({ where: { tenantId, codigo: "CPQ-2026-001" } });
    await e.admin.cpqVersion.create({
      data: { tenantId, cotizacionId: c.id, numero: 2, estado: "borrador", moneda: "UF", creadoPorId: usuario },
    });
    const rev = await revertirCorrida(tenantId, id, false);
    expect(rev.revertida).toBe(false);
    expect(rev.bloqueadas.length).toBeGreaterThan(0);
    expect(await e.admin.cpqCotizacion.count({ where: { tenantId } })).toBe(2);
  });
});
