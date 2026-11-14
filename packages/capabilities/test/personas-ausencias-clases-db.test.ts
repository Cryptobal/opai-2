// CAR-393 parte 3: el catálogo propio de clases de ausencia de una empresa no se filtra a otra, la escritura valida
// contra el catálogo de su propia empresa y la clase queda guardada. Empresas qa-*, datos ficticios.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, omitirSuiteDb, prepararEntorno } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

type R = { ok: boolean; data?: Record<string, unknown>; error?: { code: string } };
type Clase = { nombre: string; tipo: string };

describe.skipIf(omitirSuiteDb())("Personas · catálogo propio de clases de ausencia (db)", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  let propia = "";
  let otra = "";
  let persona = "";
  let personaOtra = "";
  const ctx = (tenantId: string) =>
    mod.crearContexto({
      tenantId,
      actor: { tipo: "user", id: randomUUID() },
      portal: "erp",
      portalesMembresia: ["erp"],
      rol: "owner",
      modulosActivos: [],
      medidor: { registrar: async () => undefined },
    });
  const run = async (tenantId: string, id: string, input: unknown) =>
    (await mod.executeCapability(ctx(tenantId), id, input)) as R;
  const clases = async (tenantId: string) => {
    const r = await run(tenantId, "core.ausencias.clases", {});
    expect(r.ok, JSON.stringify(r)).toBe(true);
    return (r.data?.items ?? []) as Clase[];
  };

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo]);
    const t = async (n: string) =>
      (
        await e.admin.tenant.create({
          data: { slug: `qa-${n}-${randomUUID().slice(0, 8)}`, nombre: n, vertical: "aseo" },
        })
      ).id;
    const p = async (tenantId: string) =>
      (
        await e.admin.persona.create({
          data: {
            tenantId,
            nombres: "Persona",
            apellidos: "Ficticia",
            rut: "11111111-1",
            estado: "activa",
          },
        })
      ).id;
    propia = await t("c393cl");
    otra = await t("c393clb");
    persona = await p(propia);
    personaOtra = await p(otra);
    const set = await run(propia, "core.config.set", {
      modulo: "core",
      clave: "personas_clases_ausencia",
      valor: [
        { nombre: "Día de cumpleaños", tipo: "permiso" },
        { nombre: "Licencia médica", tipo: "licencia" },
      ],
    });
    expect(set.ok, JSON.stringify(set)).toBe(true);
  });
  afterAll(async () => {
    await e?.cerrar();
  });

  it("cada empresa ve su catálogo: el propio no aparece en la otra, que sigue con el de su rubro", async () => {
    expect(await clases(propia)).toEqual([
      { nombre: "Día de cumpleaños", tipo: "permiso" },
      { nombre: "Licencia médica", tipo: "licencia" },
    ]);
    const deLaOtra = await clases(otra);
    expect(deLaOtra.length).toBeGreaterThan(2);
    expect(deLaOtra.map((c) => c.nombre)).not.toContain("Día de cumpleaños");
  });

  it("la escritura valida contra el catálogo de la propia empresa y guarda la clase", async () => {
    const ok = await run(propia, "core.ausencias.registrar", {
      personaId: persona,
      tipo: "permiso",
      clase: "Día de cumpleaños",
      motivo: "Cumpleaños",
      desde: "2026-12-10",
      hasta: "2026-12-10",
    });
    expect(ok.ok, JSON.stringify(ok)).toBe(true);
    const fila = await e.admin.ausencia.findFirst({
      where: { tenantId: propia, personaId: persona },
      select: { clase: true },
    });
    expect(fila?.clase).toBe("Día de cumpleaños");

    const ajena = await run(otra, "core.ausencias.registrar", {
      personaId: personaOtra,
      tipo: "permiso",
      clase: "Día de cumpleaños",
      motivo: "Cumpleaños",
      desde: "2026-12-10",
      hasta: "2026-12-10",
    });
    expect(ajena).toMatchObject({ ok: false, error: { code: "UNPROCESSABLE" } });
    expect(await e.admin.ausencia.count({ where: { tenantId: otra } })).toBe(0);
  });

  it("una clase de otro tipo base se rechaza aunque exista en el catálogo", async () => {
    const r = await run(propia, "core.ausencias.registrar", {
      personaId: persona,
      tipo: "vacaciones",
      clase: "Día de cumpleaños",
      motivo: "Cruce",
      desde: "2026-12-15",
      hasta: "2026-12-15",
    });
    expect(r).toMatchObject({ ok: false, error: { code: "UNPROCESSABLE" } });
  });
});
