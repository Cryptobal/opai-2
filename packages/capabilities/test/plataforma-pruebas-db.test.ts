// CAR-188 PR 2 contra Postgres real (RLS y FORCE): el trabajo diario de pruebas vence las de UNA
// empresa sin tocar las de otra; sin «pasa a cobro» el módulo queda en solo lectura y con él pasa a
// activo; abrir una prueba exige el RUT de la empresa.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { z } from "zod";

import { digitoVerificador } from "@opai/domain";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

describe.skipIf(!urlPropietario)("pruebas de módulos (base real)", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  const s = randomUUID().slice(0, 8);
  let plat = "";
  let x = "";
  let y = "";

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.limpiarModulos();
    mod.registrarCapacidades(mod.capacidadesDelNucleo);
    mod.registrarModulos([
      mod.defineModule({
        id: "crm",
        nombre: "CRM",
        version: "0.1.0",
        dependencias: [],
        permisos: [],
        navegacion: [],
        configuracion: z.object({}),
        eventos: [],
        capacidades: [],
      }),
    ]);
    plat = (
      await e.admin.user.create({
        data: {
          name: "plat",
          email: `plat-${s}@prueba.cl`,
          emailVerified: true,
          platformRole: "owner",
        },
      })
    ).id;
    const tenant = (slug: string) =>
      e.admin.tenant.create({ data: { slug, nombre: slug, vertical: "seguridad" } });
    x = (await tenant(`prb-x-${s}`)).id;
    y = (await tenant(`prb-y-${s}`)).id;
    for (const [t, pasa] of [
      [x, false],
      [y, true],
    ] as const) {
      await e.admin.tenantModule.create({
        data: { tenantId: t, moduloId: "crm", estado: "trial" },
      });
      await e.admin.cobroCondicion.create({
        data: {
          tenantId: t,
          moduloId: "crm",
          moneda: "UF",
          forma: "fijo",
          precioMensual: 25_000,
          pasaACobro: pasa,
          pruebaHasta: new Date("2026-10-31"),
        },
      });
    }
  });

  afterAll(async () => {
    await e?.cerrar();
  });

  const comoPlataforma = () =>
    mod.crearContexto({
      tenantId: null,
      actor: { tipo: "user", id: plat },
      rol: null,
      portal: "platform",
      portalesMembresia: [],
      usuario: { id: plat, nombre: "plat", email: `plat-${s}@prueba.cl`, platformRole: "owner" },
      medidor: { registrar: async () => undefined },
    });
  const deEmpresa = (tenantId: string) =>
    mod.crearContexto({
      tenantId,
      actor: { tipo: "user", id: plat },
      rol: "owner",
      portal: "erp",
      portalesMembresia: ["erp"],
      usuario: { id: plat, nombre: "Olivia", email: `plat-${s}@prueba.cl`, platformRole: null },
      medidor: { registrar: async () => undefined },
    });
  const estado = async (t: string) =>
    (await e.admin.tenantModule.findFirstOrThrow({ where: { tenantId: t, moduloId: "crm" } }))
      .estado;

  it("vence solo las pruebas de la empresa del trabajo: sin «pasa a cobro» solo lectura, con él activo", async () => {
    expect(
      await mod.trabajoCobrosPruebas.ejecutar(deEmpresa(x), { dia: "2026-11-05" }),
    ).toMatchObject({
      vencidas: [{ moduloId: "crm", estado: "solo_lectura" }],
    });
    expect(await estado(x)).toBe("solo_lectura");
    expect(await estado(y)).toBe("trial");
    expect(
      await mod.trabajoCobrosPruebas.ejecutar(deEmpresa(y), { dia: "2026-11-05" }),
    ).toMatchObject({
      vencidas: [{ moduloId: "crm", estado: "activo" }],
    });
    expect(await estado(y)).toBe("activo");
    // Idempotente: una prueba ya resuelta no se vuelve a tocar.
    expect(
      await mod.trabajoCobrosPruebas.ejecutar(deEmpresa(x), { dia: "2026-11-06" }),
    ).toMatchObject({
      vencidas: [],
    });
  });

  it("abrir una prueba exige el RUT de la empresa y deja el módulo en trial", async () => {
    const entrada = {
      tenantId: x,
      moduloId: "crm",
      pruebaHasta: new Date(Date.now() + 20 * 86_400_000).toISOString().slice(0, 10),
    };
    const sinRut = await mod.executeCapability(
      comoPlataforma(),
      "platform.cobros.prueba_abrir",
      entrada,
    );
    expect(sinRut).toMatchObject({ ok: false, error: { code: "UNPROCESSABLE" } });
    const cuerpo = String(10_000_000 + Math.floor(Math.random() * 80_000_000));
    await e.admin.perfilEmpresa.create({
      data: { tenantId: x, rut: `${cuerpo}-${digitoVerificador(cuerpo)}`, razonSocial: "X SpA" },
    });
    expect(
      await mod.executeCapability(comoPlataforma(), "platform.cobros.prueba_abrir", entrada),
    ).toMatchObject({ ok: true, data: { estadoAnterior: "solo_lectura", estado: "trial" } });
    expect(await estado(x)).toBe("trial");
    expect(await estado(y)).toBe("activo");
  });
});
