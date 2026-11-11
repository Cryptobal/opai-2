// CAR-279 · Los negocios de OPAI 1 se escriben de verdad: en su etapa equivalente, con el estado que
// deriva la base, sin duplicar en la segunda corrida, y la reversión los quita si nadie los usó.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { decision, indiceIds } from "../../scripts/importar-opai1/comun";
import { aplicarPorLotes, cerrarCorrida, iniciarCorrida } from "../../scripts/importar-opai1/corridas";
import { leerEstadoDestinoPorTenantId } from "../../scripts/importar-opai1/destino";
import type { DatosNegocio } from "../../scripts/importar-opai1/negocios-plan";
import { calcularPlan } from "../../scripts/importar-opai1/plan";
import { revertirCorrida } from "../../scripts/importar-opai1/revertir";
import { type Entorno, prepararEntorno, urlPropietario } from "../entorno";
import { fixture } from "./memoria";

describe.skipIf(!urlPropietario)("Negocios desde OPAI 1 (CAR-279)", () => {
  let e: Entorno;
  let tenantId = "";
  const etapa = { abierta: "", ganada: "", ajena: "" };

  beforeAll(async () => {
    e = await prepararEntorno();
    const sufijo = randomUUID().slice(0, 8);
    tenantId = (await e.admin.tenant.create({ data: { slug: `neg-${sufijo}`, nombre: "N", vertical: "seguridad" } })).id;
    const otro = (await e.admin.tenant.create({ data: { slug: `neg-o-${sufijo}`, nombre: "O", vertical: "seguridad" } })).id;
    const crearEtapas = async (t: string) => {
      const embudo = await e.admin.embudo.create({ data: { tenantId: t, nombre: "Ventas", porDefecto: true } });
      const a = await e.admin.etapa.create({ data: { tenantId: t, embudoId: embudo.id, nombre: "Propuesta", orden: 1 } });
      const g = await e.admin.etapa.create({ data: { tenantId: t, embudoId: embudo.id, nombre: "Ganado", orden: 2, tipo: "ganada" } });
      return { a: a.id, g: g.id };
    };
    const propias = await crearEtapas(tenantId);
    etapa.abierta = propias.a;
    etapa.ganada = propias.g;
    etapa.ajena = (await crearEtapas(otro)).a;
  });
  afterAll(async () => {
    await e?.cerrar();
  });

  const datos = (etapaId: string, titulo: string): DatosNegocio => ({
    cuentaId: "nueva:acc-a1", etapaId, titulo, montoEstimadoMensual: 1_500_000, probabilidad: 40,
    cierreEstimado: "2026-12-15", cotizacionEnviadaEn: null,
  });

  async function correr() {
    const estado = await leerEstadoDestinoPorTenantId(tenantId);
    const base = calcularPlan(fixture(), estado, { modulosActivos: [] });
    const ya = indiceIds(estado, "negocio").porExterno;
    const cuenta = base.cuentas.find((c) => c.idOpai1 === "acc-a1");
    const cuentaId = cuenta?.destinoId ?? "nueva:acc-a1";
    const una = (id: string, d: DatosNegocio) => {
      const destinoId = ya.get(id);
      const completo = { ...d, cuentaId };
      return destinoId ? decision("negocio", id, "sin_cambios", { destinoId, datos: completo }) : decision("negocio", id, "crear", { datos: completo });
    };
    const plan = {
      ...base,
      negocios: [
        una("d-abierto", datos(etapa.abierta, "Guardias bodega")),
        una("d-ganado", datos(etapa.ganada, "Servicio planta")),
        una("d-ajeno", datos(etapa.ajena, "Etapa de otra empresa")),
        decision<DatosNegocio>("negocio", "d-conflicto", "conflicto", { motivo: "etapa_sin_mapeo" }),
      ],
    };
    const id = await iniciarCorrida(tenantId, { modo: "aplicar", origen: "fixtures" });
    const r = await aplicarPorLotes(tenantId, id, plan, 2);
    await cerrarCorrida(tenantId, id, "completada", r.aplicadas);
    return { id, r };
  }

  it("crea los negocios en su etapa, no los duplica y la reversión los quita", async () => {
    const { id, r } = await correr();
    expect(r.aplicadas.negocios).toBe(2);
    const negocios = await e.admin.negocio.findMany({ where: { tenantId }, orderBy: { titulo: "asc" }, include: { historial: true } });
    expect(negocios.map((n) => [n.titulo, n.estado, n.montoEstimadoMensual, n.historial.length])).toEqual([
      ["Guardias bodega", "abierto", 1_500_000, 0],
      ["Servicio planta", "ganado", 1_500_000, 0],
    ]);
    // Ganado sin fecha de cierre: la carga histórica no la exige.
    expect(negocios[1]?.ganadoEn).toBeNull();
    const filas = await e.admin.importacionFila.findMany({ where: { importacionId: id, entidad: "negocio" }, orderBy: { id10: "asc" } });
    expect(filas.map((f) => [f.id10, f.accion, f.motivo])).toEqual([
      ["d-abierto", "creado", null],
      ["d-ajeno", "omitido", "etapa_no_existe_en_la_empresa"],
      ["d-conflicto", "omitido", "etapa_sin_mapeo"],
      ["d-ganado", "creado", null],
    ]);

    const segunda = await correr();
    expect(segunda.r.aplicadas.negocios).toBe(0);
    expect(await e.admin.negocio.count({ where: { tenantId } })).toBe(2);

    const rev = await revertirCorrida(tenantId, id, false);
    expect(rev.bloqueadas).toEqual([]);
    expect(rev.revertida).toBe(true);
    expect(await e.admin.negocio.count({ where: { tenantId } })).toBe(0);
    expect(await e.admin.idExterno.count({ where: { tenantId, entidadTipo: "negocio" } })).toBe(0);
  });
});
