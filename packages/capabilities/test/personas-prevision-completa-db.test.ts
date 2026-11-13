// CAR-276: previsión completa (catálogos, pensión, cotiza, APV, cargas y discapacidad) con Postgres real. Datos ficticios.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, omitirSuiteDb, prepararEntorno } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

type R = { ok: boolean; data?: Record<string, unknown>; error?: { code: string; message: string } };

describe.skipIf(omitirSuiteDb())("Personas · previsión completa CAR-276 (db)", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  let tenant = "";
  let personaId = "";
  const uid = randomUUID();
  const ejecutar = async (id: string, input: Record<string, unknown>) =>
    (await mod.executeCapability(
      mod.crearContexto({
        tenantId: tenant, actor: { tipo: "user", id: uid },
        usuario: { id: uid, nombre: "RRHH", email: `${uid.slice(0, 6)}@c276.test`, platformRole: null },
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
    tenant = (await e.admin.tenant.create({ data: { slug: `qa-c276-${randomUUID().slice(0, 8)}`, nombre: "c276", vertical: "seguridad" } })).id;
    await e.admin.user.create({ data: { id: uid, name: "RRHH", email: `${uid.slice(0, 8)}@c276.test` } });
    await e.admin.membership.create({ data: { tenantId: tenant, userId: uid, rol: "owner", portales: ["erp"] } });
    personaId = (await e.admin.persona.create({ data: { tenantId: tenant, nombres: "Ana", apellidos: "Ficticia", rut: "11111111-1", estado: "activa" } })).id;
  });
  afterAll(async () => {
    await e?.cerrar();
  });

  it("guarda la previsión completa y normaliza los textos de catálogo", async () => {
    const r = await ejecutar("core.personas.prevision_actualizar", {
      id: personaId,
      afp: "AFP Habitat",
      regimen: "afp",
      sistemaSalud: "Isapre",
      isapreNombre: "Colmena",
      jubilado: true,
      tipoPension: "vejez",
      saludAdicionalPct: "2,1",
      cotizaAfc: false,
      apvInstitucion: "Principal",
      apvRegimen: "A",
      apvMonto: "1.5",
      apvMoneda: "uf",
      tramoAsignacion: "B",
      cargasSimples: 2,
      discapacidadInvalidez: "no",
    });
    expect(r.ok, JSON.stringify(r)).toBe(true);
    const v = await ejecutar("core.personas.prevision_ver", { id: personaId });
    expect(v.data).toMatchObject({
      afp: "habitat", regimen: "afp", sistemaSalud: "isapre", jubilado: true, tipoPension: "vejez",
      saludAdicionalPct: "2.1", cotizaAfp: true, cotizaAfc: false, cotizaSalud: true, apvInstitucion: "Principal",
      apvRegimen: "A", apvMonto: "1.5", apvMoneda: "uf", tramoAsignacion: "B", cargasSimples: 2,
      cargasMaternales: 0, cargasInvalidez: 0, discapacidadInvalidez: "no", sensiblesOcultos: false,
    });
    // Un cambio parcial no toca lo demás.
    expect((await ejecutar("core.personas.prevision_actualizar", { id: personaId, cargasSimples: 3 })).ok).toBe(true);
    const v2 = await ejecutar("core.personas.prevision_ver", { id: personaId });
    expect(v2.data).toMatchObject({ cargasSimples: 3, tramoAsignacion: "B", afp: "habitat" });
  });

  it("rechaza valores fuera del catálogo o del rango", async () => {
    for (const malo of [
      { afp: "Otra AFP" },
      { tramoAsignacion: "E" },
      { apvMoneda: "usd" },
      { cargasSimples: 21 },
      { saludAdicionalPct: "120" },
      { discapacidadInvalidez: "si" },
    ]) {
      const r = await ejecutar("core.personas.prevision_actualizar", { id: personaId, ...malo });
      expect(r.ok, JSON.stringify(malo)).toBe(false);
    }
  });
});
