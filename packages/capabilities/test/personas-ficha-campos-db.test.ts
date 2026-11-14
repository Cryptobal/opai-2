// CAR-277: campos nuevos de la ficha (uniforme, jornada DT y contacto) con Postgres real. Datos ficticios.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, omitirSuiteDb, prepararEntorno } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

type R = { ok: boolean; data?: Record<string, unknown>; error?: { code: string; message: string } };

describe.skipIf(omitirSuiteDb())("Personas · campos de la ficha CAR-277 (db)", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  let tenant = "";
  let personaId = "";
  const uid = randomUUID();
  const ejecutar = async (id: string, input: Record<string, unknown>) =>
    (await mod.executeCapability(
      mod.crearContexto({
        tenantId: tenant, actor: { tipo: "user", id: uid },
        usuario: { id: uid, nombre: "RRHH", email: `${uid.slice(0, 6)}@c277.test`, platformRole: null },
        portal: "erp", portalesMembresia: ["erp"], rol: "owner", modulosActivos: [],
        medidor: { registrar: async () => undefined },
      }),
      id, input, {},
    )) as R;

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo]);
    tenant = (await e.admin.tenant.create({ data: { slug: `qa-c277-${randomUUID().slice(0, 8)}`, nombre: "c277", vertical: "seguridad" } })).id;
    await e.admin.user.create({ data: { id: uid, name: "RRHH", email: `${uid.slice(0, 8)}@c277.test` } });
    await e.admin.membership.create({ data: { tenantId: tenant, userId: uid, rol: "owner", portales: ["erp"] } });
    personaId = (await e.admin.persona.create({ data: { tenantId: tenant, nombres: "Ana", apellidos: "Ficticia", rut: "11111111-1", estado: "activa" } })).id;
  });
  afterAll(async () => {
    await e?.cerrar();
  });

  it("guarda tallas, medidas, código interno y movilización", async () => {
    const r = await ejecutar("core.personas.laboral_actualizar", {
      id: personaId,
      uniforme: { tallaPolera: "M", tallaGeologo: "L", tallaPolar: "XL", estaturaCm: 172, pesoKg: 80 },
      jornadaDt: { resolucionVigenteHasta: "2027-06-30" },
      contacto: { codigoInterno: "G-0042", movilizacion: "Bus de acercamiento" },
    });
    expect(r.ok, JSON.stringify(r)).toBe(true);
    const v = await ejecutar("core.personas.laboral_ver", { id: personaId });
    expect(v.ok, JSON.stringify(v)).toBe(true);
    expect(v.data).toMatchObject({
      uniforme: { tallaPolera: "M", tallaGeologo: "L", tallaPolar: "XL", estaturaCm: 172, pesoKg: 80 },
      jornadaDt: { resolucionVigenteHasta: "2027-06-30" },
      contacto: { codigoInterno: "G-0042", movilizacion: "Bus de acercamiento" },
    });
  });

  it("rechaza medidas fuera de rango", async () => {
    expect((await ejecutar("core.personas.laboral_actualizar", { id: personaId, uniforme: { estaturaCm: 20 } })).ok).toBe(false);
  });
});
