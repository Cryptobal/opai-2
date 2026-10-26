// Brief 11 · Puestos PR 1 (revisión 5658390255): el script de división de dotación simula sin
// escribir, aplica N posiciones con la capa de sueldo de puesto copiada, es idempotente y no toca
// otros tenants.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { dividirDotacion } from "../scripts/dividir-dotacion-nucleo";
import { type Entorno, prepararEntorno, urlPropietario } from "./entorno";

describe.skipIf(!urlPropietario)("dividir-dotacion", () => {
  let e: Entorno;
  const sufijo = randomUUID().slice(0, 8);
  const t = { a: "", b: "", instA: "", puestoA: "", puestoB: "" };

  async function sembrar(tenantId: string, dotacion: number) {
    const cuenta = await e.admin.cuenta.create({ data: { tenantId, nombre: "C" } });
    const inst = await e.admin.instalacion.create({
      data: { tenantId, cuentaId: cuenta.id, nombre: "Planta" },
    });
    const cargo = await e.admin.cargo.create({ data: { tenantId, nombre: "Guardia" } });
    const puesto = await e.admin.puesto.create({
      data: {
        tenantId,
        instalacionId: inst.id,
        cargoId: cargo.id,
        nombre: "Día",
        diasTrabajo: 4,
        diasDescanso: 4,
        horaInicio: "08:00",
        horaFin: "20:00",
        dotacion,
      },
    });
    return { inst: inst.id, puesto: puesto.id };
  }

  beforeAll(async () => {
    e = await prepararEntorno();
    const nuevo = (slug: string) =>
      e.admin.tenant.create({ data: { slug, nombre: slug, vertical: "seguridad" } });
    t.a = (await nuevo(`dd-a-${sufijo}`)).id;
    t.b = (await nuevo(`dd-b-${sufijo}`)).id;
    const a = await sembrar(t.a, 3);
    t.instA = a.inst;
    t.puestoA = a.puesto;
    t.puestoB = (await sembrar(t.b, 2)).puesto;
    // Ya existe "Día (2)": la copia no debe chocar con el índice único.
    const { id: _id, ...original } = await e.admin.puesto.findUniqueOrThrow({
      where: { id: t.puestoA },
    });
    await e.admin.puesto.create({ data: { ...original, nombre: "Día (2)", dotacion: 1 } });
    await e.admin.estructuraSueldo.create({
      data: {
        tenantId: t.a,
        nivel: "puesto",
        puestoId: t.puestoA,
        sueldoBase: 650_000,
        vigenteDesde: new Date("2026-01-01"),
        items: { create: [{ tenantId: t.a, tipo: "bono_fijo", nombre: "Turno", monto: 30_000 }] },
      },
    });
  });

  afterAll(async () => {
    await e?.cerrar();
  });

  const puestosA = () =>
    e.admin.puesto.findMany({ where: { tenantId: t.a, instalacionId: t.instA } });

  it("simular no escribe nada", async () => {
    const r = await dividirDotacion(e.admin, { tenantId: t.a, aplicar: false });
    expect(r.puestos).toHaveLength(1);
    expect(r.puestos[0]?.copias.map((c) => c.nombre)).toEqual(["Día (3)", "Día (4)"]);
    expect(r.puestos[0]?.estructurasCopiadas).toBe(2);
    expect(await puestosA()).toHaveLength(2);
  });

  it("aplicar deja N posiciones con la capa de sueldo de puesto copiada, solo en ese tenant", async () => {
    const r = await dividirDotacion(e.admin, { tenantId: t.a, aplicar: true });
    const dividido = r.puestos[0];
    expect(dividido?.dotacionOriginal).toBe(3);
    expect(dividido?.copias).toHaveLength(2);
    const filas = await puestosA();
    expect(filas).toHaveLength(4);
    expect(filas.every((p) => p.dotacion === 1)).toBe(true);
    for (const copia of dividido?.copias ?? []) {
      const fila = filas.find((p) => p.id === copia.id);
      expect(fila).toMatchObject({ cobertura: "ppc", coberturaMotivo: "sin_asignar", diasTrabajo: 4 });
      const est = await e.admin.estructuraSueldo.findMany({
        where: { puestoId: copia.id },
        include: { items: true },
      });
      expect(est).toHaveLength(1);
      expect(est[0]).toMatchObject({ sueldoBase: 650_000, tenantId: t.a });
      expect(est[0]?.items.map((i) => i.monto)).toEqual([30_000]);
    }
    const otro = await e.admin.puesto.findUniqueOrThrow({ where: { id: t.puestoB } });
    expect(otro.dotacion).toBe(2);
  });

  it("una segunda corrida no cambia nada", async () => {
    const r = await dividirDotacion(e.admin, { tenantId: t.a, aplicar: true });
    expect(r.puestos).toEqual([]);
    expect(await puestosA()).toHaveLength(4);
  });

  it("dos corridas simultáneas no duplican posiciones", async () => {
    const [r1, r2] = await Promise.all([
      dividirDotacion(e.admin, { tenantId: t.b, aplicar: true }),
      dividirDotacion(e.admin, { tenantId: t.b, aplicar: true }),
    ]);
    expect(r1.puestos.length + r2.puestos.length).toBe(1);
    expect(await e.admin.puesto.count({ where: { tenantId: t.b } })).toBe(2);
  });

  it("respalda cada puesto dividido, con las copias y sus id (revisión 5659984187)", async () => {
    // Tenant propio para no chocar con los de arriba; dos puestos divisibles en una instalación.
    const tc = (
      await e.admin.tenant.create({ data: { slug: `dd-c-${sufijo}`, nombre: "c", vertical: "seguridad" } })
    ).id;
    const cuenta = await e.admin.cuenta.create({ data: { tenantId: tc, nombre: "C" } });
    const inst = await e.admin.instalacion.create({
      data: { tenantId: tc, cuentaId: cuenta.id, nombre: "Planta" },
    });
    const cargo = await e.admin.cargo.create({ data: { tenantId: tc, nombre: "Guardia" } });
    for (const [nombre, dotacion] of [["Día", 2], ["Noche", 3]] as const)
      await e.admin.puesto.create({
        data: {
          tenantId: tc,
          instalacionId: inst.id,
          cargoId: cargo.id,
          nombre,
          diasTrabajo: 4,
          diasDescanso: 4,
          horaInicio: "08:00",
          horaFin: "20:00",
          dotacion,
        },
      });
    const snapshots: { puestos: number; copiasConId: number }[] = [];
    await dividirDotacion(e.admin, {
      tenantId: tc,
      aplicar: true,
      // `alAplicar` corre dentro de la transacción de cada puesto (antes del commit): cada respaldo
      // ya trae la copia con su id, así el mapa para revertir es durable junto con los datos.
      alAplicar: (parcial) => {
        const ultimo = parcial.puestos.at(-1);
        snapshots.push({
          puestos: parcial.puestos.length,
          copiasConId: ultimo?.copias.filter((c) => c.id !== null).length ?? 0,
        });
      },
    });
    // Un respaldo por puesto dividido (no por saltado), creciendo 1→2, con las copias ya con id.
    expect(snapshots).toEqual([
      { puestos: 1, copiasConId: 1 },
      { puestos: 2, copiasConId: 2 },
    ]);
  });
});
