import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prepararEntorno, type Entorno } from "../../db/test/entorno";
import * as mod from "../src";

describe("persona: referencias históricas a cargos retirados", () => {
  let e: Entorno;
  let tenantId: string;
  let otroId: string;
  let personaId: string;
  let cargoId: string;
  let vinculoId: string;
  const ctx = (id = tenantId) =>
    mod.crearContexto({ tenantId: id, rol: "owner", actor: { tipo: "system" } });
  beforeAll(async () => {
    e = await prepararEntorno();
    mod.limpiarRegistro();
    mod.registrarCapacidades(mod.capacidadesDelNucleo);
    const nuevo = () =>
      e.admin.tenant.create({
        data: { slug: `hist-cargo-${randomUUID()}`, nombre: "Prueba", vertical: "seguridad" },
      });
    tenantId = (await nuevo()).id;
    otroId = (await nuevo()).id;
    cargoId = (await e.admin.cargo.create({ data: { tenantId, nombre: "Cargo anterior" } })).id;
    personaId = (
      await e.admin.persona.create({
        data: { tenantId, nombres: "Ana", apellidos: "Prueba", rut: "12345678-5" },
      })
    ).id;
    vinculoId = (
      await e.admin.vinculoLaboral.create({
        data: {
          tenantId,
          cargoId,
          personaId,
          tipo: "indefinido",
          estado: "terminado",
          inicio: new Date("2024-01-01"),
          termino: new Date("2024-12-31"),
          motivoTermino: "Prueba",
        },
      })
    ).id;
  });
  afterAll(async () => {
    await e?.cerrar();
  });
  it("sin vínculo vigente conserva el cargo y las fechas reales del vínculo, sin montos", async () => {
    const r = await mod.executeCapability(ctx(), "core.estructuras.panel", {
      tipo: "persona",
      id: personaId,
    });
    expect(r).toMatchObject({
      ok: true,
      data: {
        persona: { vinculoVigente: null },
        cargosRetirados: [
          {
            vinculoId,
            cargoId,
            cargo: "Cargo anterior",
            inicio: "2024-01-01",
            termino: "2024-12-31",
          },
        ],
        efectiva: { estado: "sin_capa", capa: null },
      },
    });
    const auditoria = await e.admin.auditEvent.findFirst({
      where: { tenantId, capability: "core.estructuras.panel" },
    });
    expect(auditoria?.payload).toMatchObject({
      ids: expect.arrayContaining([personaId, cargoId, vinculoId]),
    });
  });
  it("no revela el historial de otra empresa, fuera de alcance o sin personas.read", async () => {
    const c = ctx();
    for (const contexto of [ctx(otroId), { ...c, alcance: { instalaciones: [] } }]) {
      expect(
        await mod.executeCapability(contexto, "core.estructuras.panel", {
          tipo: "persona",
          id: personaId,
        }),
      ).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
    }
    expect(
      await mod.executeCapability(
        { ...c, autorizar: (p) => p !== "core:personas.read" },
        "core.estructuras.panel",
        { tipo: "persona", id: personaId },
      ),
    ).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
  });
});
