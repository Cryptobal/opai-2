// CAR-344 · El flujo de caja lee las remuneraciones proyectadas de Nómina con la misma capacidad, permiso y módulo:
// la planilla funciona con Nómina activa (lectura anidada dentro de la del flujo) y sin ella no aparecen las filas.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { manifest } from "../../../modules/finanzas/manifest";
import { FILA_ANTICIPO, FILA_PREVIRED, FILA_SUELDOS } from "../../../modules/finanzas/capacidades/filas-virtuales";
import { lunesHoy } from "../../../modules/finanzas/capacidades/util";
import { type Entorno, omitirSuiteDb, prepararEntorno } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

type Planilla = {
  celdas: { filaId: string; semana: string; monto: number; nota: string | null }[];
  filas: { id: string; etiqueta: string }[];
};

const FILAS = [FILA_SUELDOS, FILA_ANTICIPO, FILA_PREVIRED];

describe.skipIf(omitirSuiteDb())("flujo · remuneraciones desde Nómina (db)", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  let tenant = "";
  const usuario = randomUUID();

  const ctx = (modulos: string[]) =>
    mod.crearContexto({
      tenantId: tenant,
      actor: { tipo: "user", id: usuario },
      usuario: { id: usuario, nombre: "u", email: "u@rem.test", platformRole: null },
      portal: "erp",
      portalesMembresia: ["erp"],
      rol: "owner",
      modulosActivos: modulos,
      medidor: { registrar: async () => undefined },
    });
  const planilla = async (modulos: string[]) => {
    const r = await mod.executeCapability(ctx(modulos), "finanzas.planilla.obtener", { desde: lunesHoy(), semanas: 12 });
    if (!r.ok) throw new Error(JSON.stringify(r.error));
    return r.data as Planilla;
  };

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.limpiarModulos();
    mod.registrarModulos([manifest]);
    mod.registrarCapacidades([...mod.capacidadesDelNucleo, ...mod.capacidadesNomina]);
    tenant = (await e.admin.tenant.create({ data: { slug: `rem-${randomUUID().slice(0, 8)}`, nombre: "R", vertical: "seguridad" } })).id;
    await e.admin.user.create({ data: { id: usuario, email: `u-${randomUUID().slice(0, 8)}@rem.test`, name: "u" } });
    const cargo = (await e.admin.cargo.create({ data: { tenantId: tenant, nombre: "Guardia" } })).id;
    for (let i = 0; i < 2; i++) {
      const personaId = (await e.admin.persona.create({ data: { tenantId: tenant, nombres: "P", apellidos: `${i}`, rut: `2${i}.222.222-2`, estado: "activa" } })).id;
      await e.admin.vinculoLaboral.create({ data: { tenantId: tenant, personaId, cargoId: cargo, tipo: "indefinido", inicio: new Date("2026-01-01"), estado: "vigente" } });
      await e.admin.estructuraSueldo.create({
        data: { tenantId: tenant, nivel: "persona", personaId, sueldoBase: 600_000, colacion: 0, movilizacion: 0, gratificacion: "legal_25", vigenteDesde: new Date("2026-01-01"), motivo: "prueba" },
      });
    }
  }, 120_000);

  afterAll(async () => {
    await e?.cerrar();
  });

  it("con Nómina activa la planilla se arma y las remuneraciones solo caen desde hoy, como egresos", async () => {
    const p = await planilla(["finanzas", "nomina"]);
    const rem = p.celdas.filter((c) => FILAS.includes(c.filaId));
    // Con valores legales del año en la base, las dos personas con contrato se proyectan.
    expect(rem.some((c) => c.filaId === FILA_SUELDOS && /2 personas/.test(c.nota ?? ""))).toBe(true);
    for (const c of rem) {
      expect(c.monto).toBeGreaterThan(0);
      expect(c.semana >= lunesHoy()).toBe(true);
      expect(c.nota ?? "").not.toMatch(/\d{1,2}\.\d{3}\.\d{3}-/); // nunca un RUT en el detalle
    }
    const etiquetas = p.filas.filter((f) => FILAS.includes(f.id)).map((f) => f.etiqueta);
    expect(etiquetas.length).toBe(new Set(rem.map((c) => c.filaId)).size);
  });

  it("sin el módulo de Nómina no aparecen filas de remuneraciones", async () => {
    const p = await planilla(["finanzas"]);
    expect(p.celdas.filter((c) => FILAS.includes(c.filaId))).toEqual([]);
    expect(p.filas.filter((f) => FILAS.includes(f.id))).toEqual([]);
  });
});
