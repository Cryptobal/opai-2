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

  it("guarda tallas, medidas, código interno, movilización y los términos de plazo fijo", async () => {
    const r = await ejecutar("core.personas.laboral_actualizar", {
      id: personaId,
      uniforme: { tallaPolera: "M", tallaGeologo: "L", tallaPolar: "XL", estaturaCm: 172, pesoKg: 80 },
      jornadaDt: { resolucionVigenteHasta: "2027-06-30", terminosPlazoFijo: ["2026-09-30", "2026-03-31"] },
      contacto: { codigoInterno: "G-0042", movilizacion: "Bus de acercamiento" },
    });
    expect(r.ok, JSON.stringify(r)).toBe(true);
    const v = await ejecutar("core.personas.laboral_ver", { id: personaId });
    expect(v.ok, JSON.stringify(v)).toBe(true);
    expect(v.data).toMatchObject({
      uniforme: { tallaPolera: "M", tallaGeologo: "L", tallaPolar: "XL", estaturaCm: 172, pesoKg: 80 },
      jornadaDt: {
        resolucionVigenteHasta: "2027-06-30",
        terminosPlazoFijo: ["2026-03-31", "2026-09-30"],
        // El período y el término vigente se derivan de la lista (avisos de vencimiento).
        plazoFijoPeriodo: 2,
        terminoPlazoFijo: "2026-09-30",
      },
      contacto: { codigoInterno: "G-0042", movilizacion: "Bus de acercamiento" },
    });
  });

  it("rechaza medidas fuera de rango y más de tres períodos", async () => {
    expect((await ejecutar("core.personas.laboral_actualizar", { id: personaId, uniforme: { estaturaCm: 20 } })).ok).toBe(false);
    const cuatro = ["2026-01-31", "2026-02-28", "2026-03-31", "2026-04-30"];
    expect((await ejecutar("core.personas.laboral_actualizar", { id: personaId, jornadaDt: { terminosPlazoFijo: cuatro } })).ok).toBe(false);
  });

  it("conserva el período de un registro antiguo y no deja la lista desfasada", async () => {
    // Solo los campos antiguos (como un cliente de API): la lista queda vacía.
    const antiguo = await ejecutar("core.personas.laboral_actualizar", {
      id: personaId, jornadaDt: { terminoPlazoFijo: "2026-08-31", plazoFijoPeriodo: 2 },
    });
    expect(antiguo.ok, JSON.stringify(antiguo)).toBe(true);
    let v = await ejecutar("core.personas.laboral_ver", { id: personaId });
    expect(v.data).toMatchObject({ jornadaDt: { terminosPlazoFijo: [], plazoFijoPeriodo: 2, terminoPlazoFijo: "2026-08-31" } });
    // Lo que envía el formulario al guardar sin tocar el plazo: el término en su casilla y el período.
    const form = await ejecutar("core.personas.laboral_actualizar", {
      id: personaId, jornadaDt: { resolucion: "R-1", terminosPlazoFijo: ["2026-08-31"], plazoFijoPeriodo: 2 },
    });
    expect(form.ok, JSON.stringify(form)).toBe(true);
    v = await ejecutar("core.personas.laboral_ver", { id: personaId });
    expect(v.data).toMatchObject({ jornadaDt: { plazoFijoPeriodo: 2, terminoPlazoFijo: "2026-08-31" } });
  });

  it("rechaza términos de plazo fijo repetidos", async () => {
    const r = await ejecutar("core.personas.laboral_actualizar", {
      id: personaId, jornadaDt: { terminosPlazoFijo: ["2026-03-31", "2026-03-31"] },
    });
    expect(r.ok).toBe(false);
  });
});
