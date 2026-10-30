// La vista previa de `cpq.cotizaciones.ajustar` corre la ejecución real en una transacción que se
// revierte: contra Postgres real (si hay DATABASE_URL_TEST) no deja filas, revisión ni auditoría.
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";

import { empresa } from "./cpq-db-ayuda";

import type * as ModuloCapacidades from "../src";

describe.skipIf(!urlPropietario)("CPQ: la vista previa de ajustar se revierte en Postgres", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  let tenantId = "";
  let cargoId = "";
  let cotId = "";
  let seccionId = "";
  const ctx = () =>
    mod.crearContexto({
      tenantId,
      actor: { tipo: "system" },
      rol: "owner",
      modulosActivos: ["comercial", "cpq"],
      medidor: { registrar: async () => undefined },
    });

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades([
      ...mod.capacidadesDelNucleo,
      ...mod.capacidadesComercial,
      ...mod.capacidadesCpq,
    ]);
    const a = await empresa(e, "cpq-previa");
    [tenantId, cargoId] = [a.tenantId, a.cargoId];
    const c = await mod.executeCapability(ctx(), "cpq.cotizaciones.create", {
      negocioId: a.negocioId,
    });
    if (!c.ok) throw new Error(JSON.stringify(c.error));
    const d = c.data as { id: string; secciones: { id: string }[] };
    [cotId, seccionId] = [d.id, d.secciones[0]?.id ?? ""];
  });

  afterAll(async () => {
    await e?.cerrar();
  });

  it("devuelve el resultado del lote sin escribir nada", async () => {
    const auditoriaAntes = await e.forTenant(tenantId).auditEvent.count();
    const r = await mod.executeCapability(
      ctx(),
      "cpq.cotizaciones.ajustar",
      {
        id: cotId,
        operaciones: [
          { op: "cambiar_moneda", moneda: "CLP" },
          { op: "agregar_linea", seccionId, tipo: "puesto", nombre: "Guardia", cargoId },
        ],
      },
      { dryRun: true },
    );
    expect(r).toMatchObject({ ok: true, dryRun: true });
    const db = e.forTenant(tenantId);
    expect(await db.lineaCotizacion.count({ where: { seccionId } })).toBe(0);
    expect(await db.versionCotizacion.findFirst({ where: { cotizacionId: cotId } })).toMatchObject({
      revision: 0,
      moneda: "UF",
    });
    expect(await db.auditEvent.count()).toBe(auditoriaAntes);
  });
});
