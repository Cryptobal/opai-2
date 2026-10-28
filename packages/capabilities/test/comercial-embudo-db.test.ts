import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { sembrarComercial } from "@opai/db";

import { prepararEntorno, type Entorno } from "../../db/test/entorno";
import * as mod from "../src";
import { capacidadesComercial } from "../src/comercial";

// Brief 07 · PR 1b: el reordenamiento y la etapa nueva respetan el único (tenant, embudo, orden), que
// no es diferible, renumerando en dos fases dentro de la transacción (sin migración).
describe("comercial · embudo contra Postgres real", () => {
  let e: Entorno;
  let tenantId: string;
  const ctx = () =>
    mod.crearContexto({
      tenantId,
      rol: "owner",
      actor: { tipo: "system" },
      modulosActivos: ["comercial"],
    });
  const etapas = () =>
    e.admin.etapa.findMany({ where: { tenantId }, orderBy: { orden: "asc" } });

  beforeAll(async () => {
    e = await prepararEntorno();
    mod.limpiarRegistro();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo, ...capacidadesComercial]);
    tenantId = (
      await e.admin.tenant.create({
        data: { slug: `embudo-${randomUUID()}`, nombre: "Prueba", vertical: "seguridad" },
      })
    ).id;
    await sembrarComercial(e.admin.$extends({}), tenantId);
  });
  afterAll(async () => {
    await e?.cerrar();
  });

  it("reordena todas las abiertas de una vez sin chocar con el único", async () => {
    const antes = await etapas();
    const abiertas = antes.filter((x) => x.tipo === "abierta").map((x) => x.id);
    const cerradas = antes.filter((x) => x.tipo !== "abierta").map((x) => x.id);
    const ids = [...abiertas].reverse().concat(cerradas);
    const r = await mod.executeCapability(ctx(), "comercial.config.reordenar_etapas", { ids });
    expect(r.ok).toBe(true);
    const despues = await etapas();
    expect(despues.map((x) => x.id)).toEqual(ids);
    expect(despues.map((x) => x.orden)).toEqual(ids.map((_, i) => i));
    const auditoria = await e.admin.auditEvent.findFirst({
      where: { tenantId, capability: "comercial.config.reordenar_etapas" },
    });
    expect(auditoria).not.toBeNull();
  });

  it("crea una etapa en medio y corre las siguientes", async () => {
    const r = await mod.executeCapability(ctx(), "comercial.config.crear_etapa", {
      nombre: "Reunión de cierre",
      probabilidad: 60,
      posicion: 2,
    });
    expect(r.ok).toBe(true);
    const despues = await etapas();
    expect(despues[2]?.nombre).toBe("Reunión de cierre");
    expect(despues.map((x) => x.orden)).toEqual(despues.map((_, i) => i));
    expect(despues.slice(-2).map((x) => x.tipo)).toEqual(["ganada", "perdida"]);
  });
});
