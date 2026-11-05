import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { enTransaccion, listarInstalaciones, registrarObservadorConsultas } from "@opai/db";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";
import { sembrarLecturas, type FixtureLecturas } from "./lecturas-sensibles-fixture";

describe.skipIf(!urlPropietario)(
  "instalaciones: página y agregados en una consulta contada",
  () => {
    let e: Entorno, a: FixtureLecturas, b: FixtureLecturas, segunda: string;
    beforeAll(async () => {
      e = await prepararEntorno();
      a = await sembrarLecturas(e);
      b = await sembrarLecturas(e);
      segunda = (
        await e.admin.instalacion.create({
          data: {
            tenantId: a.tenantId,
            cuentaId: a.cuentaId,
            nombre: "Zeta %_ literal",
            estado: "activa",
          },
        })
      ).id;
      const { cargoId } = await e.admin.vinculoLaboral.findUniqueOrThrow({
        where: { id: a.vinculoId },
      });
      const base = {
        cargoId,
        diasTrabajo: 5,
        diasDescanso: 2,
        horaInicio: "08:00",
        horaFin: "18:00",
      };
      await e.admin.puesto.createMany({
        data: [
          {
            tenantId: a.tenantId,
            instalacionId: a.instalacionId,
            nombre: "Uno",
            dotacion: 2,
            estado: "activo",
          },
          {
            tenantId: a.tenantId,
            instalacionId: a.instalacionId,
            nombre: "Dos",
            dotacion: 3,
            estado: "activo",
          },
          {
            tenantId: a.tenantId,
            instalacionId: a.instalacionId,
            nombre: "Inactivo",
            dotacion: 99,
            estado: "inactivo",
          },
        ].map((p) => ({ ...p, ...base })),
      });
    });
    afterAll(async () => {
      await e?.cerrar();
    });
    const listar = (f: Partial<Parameters<typeof listarInstalaciones>[1]> = {}) =>
      enTransaccion(a.tenantId, (tx) =>
        listarInstalaciones(tx, {
          tenantId: a.tenantId,
          alcance: null,
          incluirArchivadas: false,
          limite: 1,
          ...f,
        }),
      );
    it("página, cuenta y suma/count coinciden sin cargar los puestos, y cuentan una consulta", async () => {
      let consultas = 0;
      registrarObservadorConsultas(() => {
        consultas++;
      });
      try {
        const filas = await listar();
        expect(consultas).toBe(1);
        expect(filas).toHaveLength(2); // centinela; pagina() lo excluye antes de auditar.
        expect(filas[0]).toMatchObject({
          id: a.instalacionId,
          puestos: 3,
          dotacion: 3, // la dotación deprecada ya no se suma: se cuentan puestos (ADR-078)
          cuentaNombre: "Lectura cuenta",
        });
        expect(filas[1]).toMatchObject({ id: segunda, puestos: 0, dotacion: 0 });
      } finally {
        registrarObservadorConsultas(null);
      }
      expect((await listar({ cursor: a.instalacionId })).map((i) => i.id)).toEqual([segunda]);
    });
    it("filtros literales y alcance se aplican antes de paginar/agregar; cursor ajeno no enumera", async () => {
      expect((await listar({ q: "%_" })).map((i) => i.id)).toEqual([segunda]);
      expect(await listar({ alcance: [] })).toEqual([]);
      expect(
        (await listar({ alcance: [a.instalacionId, b.instalacionId] })).map((i) => i.id),
      ).toEqual([a.instalacionId]);
      expect(await listar({ tenantId: b.tenantId })).toEqual([]);
      expect(await listar({ cuentaId: b.cuentaId })).toEqual([]);
      for (const cursor of [b.instalacionId, randomUUID(), segunda])
        expect(await listar({ alcance: [a.instalacionId], cursor })).toEqual([]);
      expect((await listar({ estado: "activa" })).map((i) => i.id)).toEqual([segunda]);
    });
  },
);
