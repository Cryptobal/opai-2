// CAR-282 PR 2 · Importador de contratos vigentes contra Postgres real: persona por RUT, cargo e
// instalación por nombre, un solo contrato vigente por persona, reimportación sin duplicar, permisos
// (solo owner y admin), aislamiento entre empresas y reversión del lote. Datos sintéticos.
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { urlPropietario } from "../../db/test/entorno";

import { entornoImportar } from "./importar-entorno";

type Reversion = { revertido: boolean; aBorrar: number; bloqueadas: { registro: string; motivo: string }[] };
const base = { cargo: "Guardia", instalacion: "Bodega Norte", tipo: "indefinido", horas_semanales: 44, distribucion: "4x4 de 12 horas" };

describe.skipIf(!urlPropietario)("core · importador de contratos en base real", () => {
  let x: Awaited<ReturnType<typeof entornoImportar>>;
  let cargoId = "";
  beforeAll(async () => {
    x = await entornoImportar();
    const cuenta = await x.e.admin.cuenta.create({ data: { tenantId: x.t1, nombre: "Acme SpA" } });
    await x.e.admin.instalacion.create({ data: { tenantId: x.t1, cuentaId: cuenta.id, nombre: "Bodega Norte", estado: "activa" } });
    cargoId = (await x.e.admin.cargo.create({ data: { tenantId: x.t1, nombre: "Guardia" } })).id;
    await x.e.admin.cargo.create({ data: { tenantId: x.t1, nombre: "Supervisor" } });
    const personas = ["11.111.111-1", "22.222.222-2", "33.333.333-3", "44.444.444-4"].map((rut, i) => ({ nombres: `P${i}`, apellidos: "Prueba", rut }));
    await x.importar(x.t1, "personas", { filas: personas });
  });
  afterAll(async () => {
    await x?.e.cerrar();
  });
  const vinculos = (t: string) => x.e.admin.vinculoLaboral.findMany({ where: { tenantId: t }, include: { persona: true }, orderBy: [{ persona: { rut: "asc" } }, { inicio: "asc" }] });
  let lote = "";

  it("la simulación explica cada error y no guarda nada", async () => {
    const filas = [
      { ...base, persona_rut: "11.111.111-1", inicio: "01-03-2024" },
      { ...base, persona_rut: "99.999.999-9", inicio: "01-03-2024" },
      { ...base, persona_rut: "22.222.222-2", inicio: "01-03-2024", cargo: "Inexistente" },
      { ...base, persona_rut: "22.222.222-2", inicio: "01-03-2024", instalacion: "Sin nombre" },
      { ...base, persona_rut: "22.222.222-2", inicio: "01-03-2024", termino: "01-01-2024" },
      { ...base, persona_rut: "11.111.111-1", inicio: "01-06-2024" },
    ];
    const s = await x.importar(x.t1, "contratos", { filas }, true);
    expect(s.conteos).toEqual({ crear: 1, actualizar: 0, sin_cambio: 0, error: 5 });
    const mensaje = (fila: number) => s.filas.find((f) => f.fila === fila)?.mensajes.join(" ") ?? "";
    expect(mensaje(3)).toMatch(/No hay una persona con ese RUT/);
    expect(mensaje(4)).toMatch(/No existe el cargo «Inexistente»/);
    expect(mensaje(5)).toMatch(/No existe la instalación/);
    expect(mensaje(6)).toMatch(/término es anterior al inicio/);
    expect(mensaje(7)).toMatch(/solo puede haber uno/);
    expect(await vinculos(x.t1)).toHaveLength(0);
  });

  it("crea el contrato vigente y el histórico con su estado según el término", async () => {
    const filas = [
      { ...base, persona_rut: "11.111.111-1", inicio: "01-03-2024" },
      { ...base, persona_rut: "22.222.222-2", inicio: "01-03-2020", termino: "31-12-2021", tipo: "plazo fijo" },
      { ...base, persona_rut: "22.222.222-2", inicio: "01-02-2022", tipo: "indefinido" },
    ];
    const r = await x.importar(x.t1, "contratos", { filas });
    expect(r.conteos).toEqual({ crear: 3, actualizar: 0, sin_cambio: 0, error: 0 });
    lote = r.importacionId ?? "";
    const v = await vinculos(x.t1);
    expect(v.map((c) => [c.persona.rut, c.estado, c.tipo, c.horasSemanales, c.cargoId])).toEqual([
      ["11111111-1", "vigente", "indefinido", 44, cargoId],
      ["22222222-2", "terminado", "plazo_fijo", 44, cargoId],
      ["22222222-2", "vigente", "indefinido", 44, cargoId],
    ]);
    expect(await x.e.admin.evento.count({ where: { tenantId: x.t1, tipo: "core.vinculo.creado" } })).toBeGreaterThanOrEqual(3);
  });

  it("reimportar no duplica; sobrescribir cambia jornada y término, no cargo ni instalación", async () => {
    const igual = await x.importar(x.t1, "contratos", { filas: [{ ...base, persona_rut: "11.111.111-1", inicio: "01-03-2024" }] });
    expect(igual.conteos).toMatchObject({ crear: 0, sin_cambio: 1 });
    const r = await x.importar(x.t1, "contratos", {
      filas: [{ ...base, persona_rut: "11.111.111-1", inicio: "01-03-2024", horas_semanales: 40, cargo: "Supervisor" }],
      alExistir: "sobrescribir",
    }, true);
    expect(r.filas[0]?.cambios).toEqual(["horasSemanales"]);
    expect(r.filas[0]?.mensajes[0]).toMatch(/usa un anexo/);
    const real = await x.importar(x.t1, "contratos", { filas: [{ ...base, persona_rut: "11.111.111-1", inicio: "01-03-2024", horas_semanales: 40 }], alExistir: "sobrescribir" });
    expect(real.conteos.actualizar).toBe(1);
    expect((await vinculos(x.t1))[0]?.horasSemanales).toBe(40);
    expect(await vinculos(x.t1)).toHaveLength(3);
  });

  it("solo owner y admin; otra empresa no ve estos contratos", async () => {
    const g = await x.run<unknown>(x.t1, "core.importar.ejecutar", { importador: "contratos", filas: [{ ...base, persona_rut: "33.333.333-3", inicio: "01-03-2024" }] }, { rol: "gerente", dryRun: true });
    expect(g.ok).toBe(false);
    expect(await vinculos(x.t2)).toHaveLength(0);
    const otra = await x.importar(x.t2, "contratos", { filas: [{ ...base, persona_rut: "11.111.111-1", inicio: "01-03-2024" }] }, true);
    expect(otra.conteos.error).toBe(1);
  });

  it("revertir borra los contratos que creó el lote y no toca los demás", async () => {
    const nuevo = await x.importar(x.t1, "contratos", { filas: [{ ...base, persona_rut: "33.333.333-3", inicio: "01-03-2024" }] });
    expect(await vinculos(x.t1)).toHaveLength(4);
    const r = await x.run<Reversion>(x.t1, "core.importar.revertir", { importacionId: nuevo.importacionId ?? "" });
    expect(r.ok && r.data.revertido).toBe(true);
    expect(await vinculos(x.t1)).toHaveLength(3);
    expect(lote).not.toBe("");
  });
});
