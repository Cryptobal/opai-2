// Búsqueda por título de `agente.conversaciones.list` (CAR-120) contra Postgres real: comodines
// LIKE literales, sin distinguir mayúsculas y aislada por empresa y por persona.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { manifest } from "../../../modules/agente/manifest";
import { type Entorno, omitirSuiteDb, prepararEntorno } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

describe.skipIf(omitirSuiteDb())("Agente · búsqueda de conversaciones (db)", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  let tenantA = "";
  let tenantB = "";
  const ana = randomUUID();
  const luis = randomUUID();

  const ctx = (tenantId: string, userId: string) =>
    mod.crearContexto({
      tenantId,
      rol: "owner",
      actor: { tipo: "user", id: userId },
      portal: "erp",
      portalesMembresia: ["erp"],
      usuario: { id: userId, nombre: "X", email: "x@y.cl", platformRole: null },
      modulosActivos: ["agente"],
      medidor: { registrar: async () => undefined },
    });
  const titulos = async (tenantId: string, userId: string, input: Record<string, unknown>) => {
    const r = await mod.executeCapability(
      ctx(tenantId, userId),
      "agente.conversaciones.list",
      input,
    );
    if (!r.ok) throw new Error(r.error.code);
    return (r.data as { titulo: string }[]).map((c) => c.titulo).sort();
  };
  const sembrar = (tenantId: string, userId: string, titulo: string, archivada = false) =>
    e.admin.agenteConversacion.create({
      data: {
        tenantId,
        userId,
        titulo,
        mensajes: [],
        ultimaActividad: new Date(),
        archivadaEn: archivada ? new Date() : null,
      },
    });

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarModulos();
    mod.registrarModulos([manifest]);
    const s = randomUUID().slice(0, 8);
    const t = (slug: string) =>
      e.admin.tenant.create({ data: { slug, nombre: slug, vertical: "seguridad" } });
    tenantA = (await t(`bus-a-${s}`)).id;
    tenantB = (await t(`bus-b-${s}`)).id;
    for (const titulo of [
      "Turnos de Enero",
      "Descuento 50% guardias",
      "ruta_norte",
      "Ruta Sur",
      "a\\b",
    ])
      await sembrar(tenantA, ana, titulo);
    await sembrar(tenantA, ana, "Turnos archivados", true);
    await sembrar(tenantA, luis, "Turnos de Luis");
    await sembrar(tenantB, ana, "Turnos de otra empresa");
  });

  afterAll(async () => {
    await e?.cerrar();
  });

  it("busca por título sin distinguir mayúsculas y respeta archivadas", async () => {
    expect(await titulos(tenantA, ana, { q: "TURNOS" })).toEqual(["Turnos de Enero"]);
    expect(await titulos(tenantA, ana, { q: "turnos", archivadas: true })).toEqual([
      "Turnos archivados",
    ]);
  });

  it("recorta el texto y sin texto devuelve todo", async () => {
    expect(await titulos(tenantA, ana, { q: "  ruta  " })).toEqual(["Ruta Sur", "ruta_norte"]);
    expect(await titulos(tenantA, ana, { q: "   " })).toHaveLength(5);
  });

  it("%, _ y \\ son literales y no actúan como comodines", async () => {
    expect(await titulos(tenantA, ana, { q: "50%" })).toEqual(["Descuento 50% guardias"]);
    expect(await titulos(tenantA, ana, { q: "%%" })).toEqual([]);
    expect(await titulos(tenantA, ana, { q: "__" })).toEqual([]);
    expect(await titulos(tenantA, ana, { q: "ruta_n" })).toEqual(["ruta_norte"]);
    expect(await titulos(tenantA, ana, { q: "a\\b" })).toEqual(["a\\b"]);
  });

  it("nunca cruza personas ni empresas", async () => {
    expect(await titulos(tenantA, luis, { q: "turnos" })).toEqual(["Turnos de Luis"]);
    expect(await titulos(tenantB, ana, { q: "turnos" })).toEqual(["Turnos de otra empresa"]);
    expect(await titulos(tenantB, luis, { q: "turnos" })).toEqual([]);
  });

  it("respeta el límite junto con el filtro", async () => {
    expect(await titulos(tenantA, ana, { q: "ru", limite: 1 })).toHaveLength(1);
  });
});
