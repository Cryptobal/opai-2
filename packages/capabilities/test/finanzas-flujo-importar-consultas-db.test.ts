// CAR-161 (R3) · La importación CSV del flujo escribe por lote: las consultas no crecen con las filas.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { capacidades } from "../../../modules/finanzas/capacidades";
import { lunesDe, sumarSemanas } from "../../../modules/finanzas/domain";
import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

describe.skipIf(!urlPropietario)("importación CSV del flujo: consultas constantes (CAR-161)", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  let tenantId = "";
  const usuario = randomUUID();
  const medidor = { registrar: async () => undefined };
  const futura = sumarSemanas(lunesDe(new Date().toISOString().slice(0, 10)), 3);

  const contado = <T extends object>(obj: T, contar: () => void): T =>
    new Proxy(obj, {
      get: (t, modelo) => {
        const m = Reflect.get(t, modelo);
        if (typeof m !== "object" || m === null) return m;
        return new Proxy(m, {
          get: (mt, op) => {
            const f = Reflect.get(mt, op);
            return typeof f === "function" ? (...a: unknown[]) => { contar(); return f.apply(mt, a); } : f;
          },
        });
      },
    });

  async function importar(n: number, prefijo: string, dryRun: boolean) {
    const base = mod.crearContexto({
      tenantId, actor: { tipo: "user", id: usuario },
      usuario: { id: usuario, nombre: "u", email: "u@flujo.test", platformRole: null },
      portal: "erp", portalesMembresia: ["erp"], rol: "owner", modulosActivos: ["finanzas"], medidor,
    });
    let consultas = 0;
    const contar = () => { consultas += 1; };
    const ctx = {
      ...base,
      db: contado(base.db, contar),
      transaccion: <R>(fn: Parameters<typeof base.transaccion>[0]) =>
        base.transaccion((tx) => fn(contado(tx, contar))) as Promise<R>,
    };
    const csv = ["seccion,etiqueta,semana,monto", ...Array.from({ length: n }, (_, i) => `egreso,${prefijo}${i},${futura},${1000 + i}`)].join("\n");
    const cap = capacidades.find((c) => c.id === "finanzas.flujo.importar");
    if (!cap) throw new Error("falta la capacidad");
    const r = (await cap.handler(ctx as never, { formato: "csv", contenido: csv }, { dryRun })) as { aplicadas: number };
    return { consultas, aplicadas: r.aplicadas };
  }

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    tenantId = (await e.admin.tenant.create({ data: { slug: `imp-${randomUUID().slice(0, 8)}`, nombre: "I", vertical: "seguridad" } })).id;
    await e.admin.user.create({ data: { id: usuario, email: `u-${randomUUID().slice(0, 8)}@flujo.test`, name: "u" } });
  });
  afterAll(async () => {
    await e?.cerrar();
  });

  it("10 y 500 filas hacen las mismas consultas, en vista previa y al aplicar", async () => {
    for (const dryRun of [true, false]) {
      const pocas = await importar(10, `a${dryRun}-`, dryRun);
      const muchas = await importar(500, `b${dryRun}-`, dryRun);
      expect(muchas.aplicadas).toBe(500);
      expect(muchas.consultas).toBe(pocas.consultas);
      expect(muchas.consultas).toBeLessThanOrEqual(dryRun ? 3 : 16);
    }
    expect(await e.admin.flujoCelda.count({ where: { tenantId } })).toBe(510);
  });
});
