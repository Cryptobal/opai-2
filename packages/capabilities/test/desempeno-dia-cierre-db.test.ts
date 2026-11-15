import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { prepararEntorno, type Entorno, urlPropietario } from "../../db/test/entorno";
import { manifest } from "../../../modules/desempeno/manifest";
import * as mod from "../src";
import { dato } from "./maestros-ayuda";

// Día de cierre configurable (ADR-094, adenda CAR-322; pendiente «probar un día distinto de 5 con el registro de
// ajustes cargado»): con el manifiesto registrado, el ajuste de la empresa manda sobre el de fábrica.
describe.skipIf(!urlPropietario)("desempeño: día de cierre de la empresa (Postgres real)", () => {
  let e: Entorno;
  let a = "";
  let dueno = "";
  const sufijo = randomUUID().slice(0, 8);
  const ctx = (modulos: string[]) =>
    mod.crearContexto({
      tenantId: a,
      rol: "owner",
      actor: { tipo: "user", id: dueno },
      usuario: {
        id: dueno,
        nombre: "dueño",
        email: `dueno-${sufijo}@prueba.cl`,
        platformRole: null,
      },
      portal: "erp",
      portalesMembresia: ["erp"],
      modulosActivos: modulos,
    });

  beforeAll(async () => {
    e = await prepararEntorno();
    mod.limpiarRegistro();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo]);
    mod.registrarModulos([manifest]);
    a = (
      await e.admin.tenant.create({
        data: {
          slug: `dia-${sufijo}`,
          nombre: "dia",
          vertical: "seguridad",
          timezone: "America/Santiago",
        },
      })
    ).id;
    dueno = (
      await e.admin.user.create({
        data: { name: "dueño", email: `dueno-${sufijo}@prueba.cl`, emailVerified: true },
      })
    ).id;
    await e.admin.membership.create({
      data: { tenantId: a, userId: dueno, rol: "owner", portales: ["erp"] },
    });
    await e.admin.tenantModule.create({ data: { tenantId: a, moduloId: "desempeno" } });
  });
  afterAll(async () => {
    await e?.cerrar();
  });

  it("con el día de cierre en 10, el 5 no cierra y el 10 sí", async () => {
    await dato(ctx(["desempeno"]), "core.config.set", {
      modulo: "desempeno",
      clave: "dia_cierre",
      valor: 10,
    });
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-12-10T15:00:00Z"));
    const trabajo = mod.trabajosDesempeno[0];
    const sistema = ctx([]);
    expect(await trabajo?.ejecutar(sistema, { dia: "2026-12-05" })).toEqual({ cerrado: null });
    expect(await trabajo?.ejecutar(sistema, { dia: "2026-12-09" })).toEqual({ cerrado: null });
    expect(await trabajo?.ejecutar(sistema, { dia: "2026-12-10" })).toEqual({
      cerrado: "2026-11",
      personas: 0,
    });
    vi.useRealTimers();
  });
});
