import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";
import { PAGINA_PREVIRED } from "../../domain/src/remuneraciones/previred.fixture";

import type * as CapabilitiesModule from "../src";
import { capturarPrevisional } from "../src/core/remuneraciones/previsional-captura";

const hoy = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago", dateStyle: "short" }).format(new Date());

describe.skipIf(!urlPropietario)("captura previsional (Previred) en base real", () => {
  let e: Entorno;
  let mod: typeof CapabilitiesModule;
  const tenantId = randomUUID();
  const capturasAntes = new Set<string>();

  beforeAll(async () => {
    e = await prepararEntorno();
    await e.admin.tenant.create({
      data: { id: tenantId, slug: `prv-${randomUUID().slice(0, 6)}`, nombre: "Previsional", vertical: "seguridad" },
    });
    for (const c of await e.admin.capturaIndicador.findMany({ select: { id: true } })) capturasAntes.add(c.id);
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades(mod.capacidadesDelNucleo);
  });

  afterAll(async () => {
    if (!e) return;
    const nuevas = (await e.admin.capturaIndicador.findMany({ select: { id: true } })).filter((c) => !capturasAntes.has(c.id));
    await e.admin.capturaIndicador.deleteMany({ where: { id: { in: nuevas.map((c) => c.id) } } });
    await e.admin.valorPublicado.deleteMany({ where: { estado: { in: ["propuesto", "rechazado"] } } });
    await e.cerrar();
  });

  const ctx = () =>
    mod.crearContexto({
      tenantId,
      actor: { tipo: "system" },
      rol: "owner",
      medidor: { registrar: async () => undefined },
    });

  it("con la página al día renueva lo igual y propone solo el tope IPS ya verificado", async () => {
    const r = await capturarPrevisional(ctx(), { dia: hoy, consulta: async () => PAGINA_PREVIRED });
    expect(Object.fromEntries(r.map((x) => [x.clave, x.resultado]))).toEqual({
      imm: "ok", topes: "propuesto", afp: "ok", sis: "ok", cesantia: "ok",
    });
    const pendientes = await e.admin.valorPublicado.findMany({ where: { estado: "propuesto" }, include: { indicador: true } });
    expect(pendientes.map((p) => p.indicador.clave)).toEqual(["topes"]);
    expect(pendientes[0]?.valorJson).toEqual({ pensionSaludUf: 900000, ipsUf: 600000, cesantiaUf: 1352000, indemnizacionUf: 900000 });
  });

  it("si la fuente falla conserva los valores y deja un aviso por indicador", async () => {
    const antes = await e.admin.valorPublicado.count({ where: { estado: "vigente" } });
    const r = await capturarPrevisional(ctx(), {
      dia: hoy,
      consulta: async () => {
        throw new Error("sin red");
      },
    });
    expect(r.every((x) => x.resultado === "fallido" && x.motivo === "fuente_caida")).toBe(true);
    expect(await e.admin.valorPublicado.count({ where: { estado: "vigente" } })).toBe(antes);
    const avisos = await e.admin.capturaIndicador.findMany({
      where: { diferencia: "fuente_caida", alertaEmitida: true, id: { notIn: [...capturasAntes] } },
    });
    expect(avisos).toHaveLength(5);
  });

  it("un valor que se aleja de la banda no se propone", async () => {
    const absurda = PAGINA_PREVIRED.replace("$ 553.553", "$ 5.535.530");
    const r = await capturarPrevisional(ctx(), { dia: hoy, consulta: async () => absurda });
    expect(r.find((x) => x.clave === "imm")).toMatchObject({ resultado: "fallido", motivo: "fuera_de_banda" });
  });
});
