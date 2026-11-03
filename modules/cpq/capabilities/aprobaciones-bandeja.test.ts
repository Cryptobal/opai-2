import { executeCapability, registrarCapacidades, registrarConsumidores } from "@opai/capabilities";
import { contextoDePrueba } from "@opai/capabilities/testing";
import { consumidorCpqBandeja } from "../consumidor-bandeja";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { idBandejaCpq } from "../persistencia/aprobaciones-bandeja-id";
import { mockMotorLegal } from "../persistencia/mock-motor-legal";
import { ACTIVOS, NEGOCIO_1, semilla } from "./fixtures";
import { capacidades } from "./index";

const USUARIO_ADMIN = {
  id: "0192f3a0-0000-7000-8000-0000000000b2",
  nombre: "Beto Admin",
  email: "admin@prueba.cl",
  platformRole: null,
};

beforeAll(() => {
  registrarCapacidades(capacidades);
  registrarConsumidores([consumidorCpqBandeja]);
});

async function cotizacionMargenBajo(ctx: ReturnType<typeof contextoDePrueba>["ctx"]) {
  const c = await executeCapability(ctx, "cpq.cotizaciones.create", {
    negocioId: NEGOCIO_1,
    titulo: "Bandeja",
  });
  if (!c.ok) throw new Error("fixture");
  const id = (c.data as { id: string }).id;
  mockMotorLegal();
  const f = await executeCapability(ctx, "cpq.cotizaciones.ficha", { id });
  if (!f.ok) throw new Error("ficha");
  const sec = (f.data as { secciones: { id: string }[] }).secciones[0]!;
  await executeCapability(ctx, "cpq.lineas.crear", {
    seccionId: sec.id,
    tipo: "puesto",
    nombre: "Turno",
    sueldoBaseClp: 400_000,
  });
  await executeCapability(ctx, "cpq.cotizaciones.calcular", { id });
  await executeCapability(ctx, "cpq.cotizaciones.solicitar_aprobacion", { id });
  return { id, bandejaId: idBandejaCpq("margen", id) };
}

describe("cpq.aprobaciones bandeja (CAR-141)", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("lista pendientes con cotización y cliente", async () => {
    const { ctx } = contextoDePrueba({ semilla: semilla(), modulosActivos: ACTIVOS, rol: "owner" });
    await cotizacionMargenBajo(ctx);
    const r = await executeCapability(ctx, "cpq.aprobaciones.list", {});
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const items = r.data as { resumen: string; cuentaNombre: string; codigo: string }[];
    expect(items.length).toBeGreaterThan(0);
    expect(items[0]!.cuentaNombre).toBeTruthy();
    expect(items[0]!.codigo).toMatch(/^CPQ-/);
  });

  it("dryRun aprobar margen respeta N6 vía cpq.cotizaciones.aprobar", async () => {
    const { ctx } = contextoDePrueba({
      semilla: semilla(),
      modulosActivos: ACTIVOS,
      rol: "admin",
      usuario: USUARIO_ADMIN,
    });
    const { id } = await cotizacionMargenBajo(ctx);
    const r = await executeCapability(
      { ...ctx, actor: { tipo: "user", id: USUARIO_ADMIN.id }, usuario: USUARIO_ADMIN },
      "cpq.cotizaciones.aprobar",
      { id },
      { dryRun: true },
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe("FORBIDDEN");
  });

  it("owner aprueba margen con cpq.cotizaciones.aprobar", async () => {
    const owner = contextoDePrueba({ semilla: semilla(), modulosActivos: ACTIVOS, rol: "owner" });
    const { id } = await cotizacionMargenBajo(owner.ctx);
    const apr = await executeCapability(owner.ctx, "cpq.cotizaciones.aprobar", { id });
    expect(apr.ok).toBe(true);
  });

  it("gerente sin cpq:aprobar no lista", async () => {
    const { ctx } = contextoDePrueba({ semilla: semilla(), modulosActivos: ACTIVOS, rol: "gerente" });
    const r = await executeCapability(ctx, "cpq.aprobaciones.list", {});
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe("FORBIDDEN");
  });
});
