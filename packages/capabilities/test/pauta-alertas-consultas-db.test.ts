// CAR-161 (R3) · Las alertas de pauta leen por lote: el número de consultas no crece con los puestos.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

describe.skipIf(!urlPropietario)("Alertas de pauta: consultas constantes (CAR-161)", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  let tenantId = "";
  const hoy = new Date().toISOString().slice(0, 10);
  const medidor = { registrar: async () => undefined };

  async function instalacionConPuestos(n: number) {
    const cuenta = (await e.admin.cuenta.create({ data: { tenantId, nombre: `C${n}` } })).id;
    const inst = (await e.admin.instalacion.create({ data: { tenantId, cuentaId: cuenta, nombre: `I${n}` } })).id;
    const cargo = (await e.admin.cargo.create({ data: { tenantId, nombre: `G${n}` } })).id;
    const patron = (await e.admin.patronTurno.create({ data: { tenantId, nombre: `4x4-${n}`, diasTrabajo: 4, diasDescanso: 4 } })).id;
    for (let i = 0; i < n; i++) {
      const persona = (await e.admin.persona.create({ data: { tenantId, nombres: `P${i}`, apellidos: "X", rut: `${10 + i}.${n}00.000-0`, estado: "activa" } })).id;
      const puesto = (await e.admin.puesto.create({ data: { tenantId, instalacionId: inst, cargoId: cargo, nombre: `Pu${i}`, diasTrabajo: 4, diasDescanso: 4, horaInicio: "08:00", horaFin: "20:00" } })).id;
      await e.admin.seriePauta.create({
        data: { tenantId, puestoId: puesto, patronId: patron, inicioCiclo: new Date(`${hoy}T00:00:00Z`), titularPersonaId: persona, vigenteDesde: new Date(`${hoy}T00:00:00Z`) },
      });
    }
    return inst;
  }

  async function contarConsultas(instalacionId: string): Promise<number> {
    const ctx = mod.crearContexto({
      tenantId, actor: { tipo: "user", id: randomUUID() }, portal: "erp", portalesMembresia: ["erp"],
      rol: "owner", modulosActivos: ["pauta"], medidor,
    });
    let n = 0;
    const db = new Proxy(ctx.db, {
      get: (t, modelo) => {
        const m = Reflect.get(t, modelo);
        if (typeof m !== "object" || m === null) return m;
        return new Proxy(m, {
          get: (mt, op) => {
            const f = Reflect.get(mt, op);
            return typeof f === "function" ? (...a: unknown[]) => { n += 1; return f.apply(mt, a); } : f;
          },
        });
      },
    });
    const cap = mod.capacidadesPauta.find((c) => c.id === "pauta.alertas.listar");
    if (!cap) throw new Error("falta la capacidad");
    await cap.handler({ ...ctx, db }, { instalacionId }, { dryRun: false });
    return n;
  }

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    tenantId = (await e.admin.tenant.create({ data: { slug: `ala-${randomUUID().slice(0, 8)}`, nombre: "A", vertical: "seguridad" } })).id;
  });
  afterAll(async () => {
    await e?.cerrar();
  });

  it("las consultas son las mismas con 3 que con 30 puestos", async () => {
    const pocas = await contarConsultas(await instalacionConPuestos(3));
    const muchas = await contarConsultas(await instalacionConPuestos(30));
    expect(muchas).toBe(pocas);
    // 8 de la pauta + zona del tenant, tope legal con vigencia y ajustes de horas (ADR-056, ADR-021).
    expect(muchas).toBeLessThanOrEqual(12);
  });
});
