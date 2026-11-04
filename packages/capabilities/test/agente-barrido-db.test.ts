// Barrido diario `agente.conversaciones.vencidas` (CAR-120) contra Postgres real y dos empresas:
// cada una se barre con su propia retención y el trabajo de una nunca toca las conversaciones de la
// otra. Verifica además la traza de auditoría (solo conteo, sin IDs ni contenido).
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { trabajoConversacionesVencidas } from "../../../modules/agente/conversaciones-barrido";
import { manifest } from "../../../modules/agente/manifest";
import { type Entorno, omitirSuiteDb, prepararEntorno } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

const DIA = 864e5;
const EDADES = [10, 45, 100, 250];

describe.skipIf(omitirSuiteDb())("Agente · barrido de conversaciones vencidas (db, dos empresas)", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  let tenantA = "";
  let tenantB = "";
  const usuario = randomUUID();

  const ctx = (tenantId: string) =>
    mod.crearContexto({
      tenantId,
      actor: { tipo: "system" },
      modulosActivos: ["agente"],
      medidor: { registrar: async () => undefined },
    });
  const sembrar = (tenantId: string) =>
    Promise.all(
      EDADES.map((edad) =>
        e.admin.agenteConversacion.create({
          data: {
            tenantId,
            userId: usuario,
            titulo: `secreto-${edad}`,
            mensajes: [{ rol: "usuario", texto: "contenido privado", fecha: "2026-01-01" }],
            ultimaActividad: new Date(Date.now() - edad * DIA),
          },
        }),
      ),
    );
  const edades = async (tenantId: string) =>
    (await e.admin.agenteConversacion.findMany({ where: { tenantId } }))
      .map((c) => Math.round((Date.now() - c.ultimaActividad.getTime()) / DIA))
      .sort((a, b) => a - b);
  const retencion = (tenantId: string, dias: number) =>
    e.admin.ajuste.create({
      data: {
        tenantId,
        ambito: "tenant",
        sujetoId: tenantId,
        modulo: "agente",
        clave: "retencionConversacionesDias",
        valor: dias,
      },
    });

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarModulos();
    mod.registrarModulos([manifest]);
    const s = randomUUID().slice(0, 8);
    const tenant = (slug: string) =>
      e.admin.tenant.create({ data: { slug, nombre: slug, vertical: "seguridad" } });
    tenantA = (await tenant(`bar-a-${s}`)).id;
    tenantB = (await tenant(`bar-b-${s}`)).id;
    await retencion(tenantA, 30);
    await retencion(tenantB, 200);
    await sembrar(tenantA);
    await sembrar(tenantB);
  });

  afterAll(async () => {
    await e?.cerrar();
  });

  it("barre una empresa con su propia retención y no toca a la otra", async () => {
    expect(await trabajoConversacionesVencidas.ejecutar(ctx(tenantA), {})).toEqual({ borradas: 3 });
    expect(await edades(tenantA)).toEqual([10]);
    // La retención de A (30 días) habría borrado las de 45 y 100 días de B: siguen intactas.
    expect(await edades(tenantB)).toEqual(EDADES);
  });

  it("la otra empresa se barre con 200 días y A queda como estaba", async () => {
    expect(await trabajoConversacionesVencidas.ejecutar(ctx(tenantB), {})).toEqual({ borradas: 1 });
    expect(await edades(tenantB)).toEqual([10, 45, 100]);
    expect(await edades(tenantA)).toEqual([10]);
  });

  it("repetir el barrido no borra más ni deja otra traza", async () => {
    expect(await trabajoConversacionesVencidas.ejecutar(ctx(tenantA), {})).toEqual({ borradas: 0 });
    expect(await trabajoConversacionesVencidas.ejecutar(ctx(tenantB), {})).toEqual({ borradas: 0 });
    const trazas = (tenantId: string) =>
      e.admin.auditEvent.findMany({
        where: { tenantId, capability: "agente.conversaciones.vencidas" },
      });
    const [a, b] = [await trazas(tenantA), await trazas(tenantB)];
    expect(a).toHaveLength(1);
    expect(b).toHaveLength(1);
    expect(a[0]?.payload).toMatchObject({ borradas: 3, origen: "barrido" });
    expect(b[0]?.payload).toMatchObject({ borradas: 1, origen: "barrido" });
  });

  it("la traza no copia títulos, mensajes ni IDs de conversaciones", async () => {
    const trazas = await e.admin.auditEvent.findMany({
      where: { tenantId: { in: [tenantA, tenantB] }, capability: "agente.conversaciones.vencidas" },
    });
    const texto = JSON.stringify(trazas.map((t) => t.payload));
    expect(texto).not.toMatch(/secreto-|contenido privado|titulo|mensajes/);
    for (const t of trazas) expect(t.entityId).toBeNull();
  });
});
