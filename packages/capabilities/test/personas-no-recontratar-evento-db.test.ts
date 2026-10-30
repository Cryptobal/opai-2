// El evento de «No recontratar» no lleva el motivo: core.eventos lo guarda en claro y sobrevive a
// Quitar, al vencimiento y a la anonimización (Ley 21.719).
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

type Capacidades = typeof ModuloCapacidades;

const MOTIVO = "Abandono de turno sin aviso";

describe.skipIf(!urlPropietario)("eventos de «No recontratar» en base real", () => {
  let e: Entorno;
  let tenantId = "";
  let mod: Capacidades;

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades(mod.capacidadesDelNucleo);
    const t = await e.admin.tenant.create({
      data: { slug: `nrc-${randomUUID().slice(0, 8)}`, nombre: "N", vertical: "seguridad" },
    });
    tenantId = t.id;
  });

  afterAll(async () => {
    await e?.cerrar();
  });

  const ctx = () =>
    mod.crearContexto({
      tenantId,
      actor: { tipo: "system" },
      rol: "owner",
      medidor: { registrar: async () => undefined },
    });

  async function dato<T>(id: string, input: unknown): Promise<T> {
    const r = await mod.executeCapability(ctx(), id, input);
    if (!r.ok) throw new Error(`${id}: ${JSON.stringify(r.error)}`);
    return r.data as T;
  }

  it("marcar y quitar emiten el evento sin motivo ni otro dato", async () => {
    const { id } = await dato<{ id: string }>("core.personas.create", {
      nombres: "María Fernanda",
      apellidos: "Soto",
      rut: "16.234.567-2",
    });
    await dato("core.personas.marcar_no_recontratar", { id, motivo: MOTIVO, venceEn: "2030-01-01" });
    await dato("core.personas.quitar_no_recontratar", { id, motivo: "Error de registro" });

    const eventos = await e.admin.evento.findMany({
      where: { tenantId, tipo: { startsWith: "core.persona.no_recontratar" } },
    });
    expect(eventos.map((x) => x.tipo).sort()).toEqual([
      "core.persona.no_recontratar_marcada",
      "core.persona.no_recontratar_quitada",
    ]);
    for (const ev of eventos) {
      expect(ev.payload).toEqual({});
      expect(JSON.stringify(ev)).not.toContain("Abandono");
      expect(JSON.stringify(ev)).not.toContain("Error de registro");
    }
  });
});
