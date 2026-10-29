// Brief 14 · Rondas PR 1: validación, autorización por rol y alcance (ADR-022), auditoría, dryRun e
// idempotencia de las capacidades de configuración. El aislamiento entre dos tenants se prueba con
// Postgres real en packages/db (rls-dos-empresas) y aquí se cubre el alcance por filas.
import { beforeEach, describe, expect, it } from "vitest";

import {
  capacidadesDelNucleo,
  capacidadesRondas,
  executeCapability,
  limpiarModulos,
  limpiarRegistro,
  registrarCapacidades,
} from "../src";
import { TENANT_DE_PRUEBA, contextoDePrueba } from "../src/testing";
import { semillaTenant } from "./semilla";

const INST = "0192f3a0-0000-7000-8000-00000000c101";
const INST2 = "0192f3a0-0000-7000-8000-00000000c102";

function semilla() {
  return {
    ...semillaTenant(),
    instalacion: [
      { id: INST, tenantId: TENANT_DE_PRUEBA, nombre: "Planta Quilicura" },
      { id: INST2, tenantId: TENANT_DE_PRUEBA, nombre: "Bodega Lampa" },
    ],
  };
}

const owner = () =>
  contextoDePrueba({ rol: "owner", portal: "erp", modulosActivos: ["rondas"], semilla: semilla() });

const puntoQrGps = { instalacionId: INST, nombre: "Portón norte", modo: "qr_gps", latitud: -33.45, longitud: -70.66 };

beforeEach(() => {
  limpiarRegistro();
  limpiarModulos();
  registrarCapacidades([...capacidadesDelNucleo, ...capacidadesRondas]);
});

describe("rondas.puntos.crear", () => {
  it("crea un punto QR + GPS, genera su etiqueta opaca y lo audita", async () => {
    const { ctx, tabla, eventos } = owner();
    const r = await executeCapability(ctx, "rondas.puntos.crear", puntoQrGps);
    expect(r.ok).toBe(true);
    expect(tabla("puntoControl")).toHaveLength(1);
    const fila = tabla("puntoControl")[0] as { etiquetaQr: string; modo: string };
    expect(fila.etiquetaQr).toMatch(/^RQR-/);
    expect(eventos.some((e) => e.capability === "rondas.puntos.crear")).toBe(true);
  });

  it("dryRun no persiste", async () => {
    const { ctx, tabla } = owner();
    const r = await executeCapability(ctx, "rondas.puntos.crear", puntoQrGps, { dryRun: true });
    expect(r.ok).toBe(true);
    expect(tabla("puntoControl")).toHaveLength(0);
  });

  it("un punto con GPS sin coordenadas se rechaza (R2/R3)", async () => {
    const { ctx } = owner();
    const r = await executeCapability(ctx, "rondas.puntos.crear", {
      instalacionId: INST,
      nombre: "Sin coords",
      modo: "gps",
    });
    expect(r).toMatchObject({ ok: false, error: { code: "UNPROCESSABLE" } });
  });

  it("sin permiso de configurar devuelve FORBIDDEN", async () => {
    const { ctx } = contextoDePrueba({
      permisos: ["rondas:read"],
      portal: "erp",
      modulosActivos: ["rondas"],
      semilla: semilla(),
    });
    const r = await executeCapability(ctx, "rondas.puntos.crear", puntoQrGps);
    expect(r).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
  });

  it("idempotencia: dos ejecuciones con la misma clave no duplican", async () => {
    const { ctx, tabla } = owner();
    const a = await executeCapability(ctx, "rondas.puntos.crear", puntoQrGps, { idempotencyKey: "p1" });
    const b = await executeCapability(ctx, "rondas.puntos.crear", puntoQrGps, { idempotencyKey: "p1" });
    expect(a.ok && b.ok).toBe(true);
    expect(tabla("puntoControl")).toHaveLength(1);
  });
});

describe("alcance por filas (ADR-022, R29)", () => {
  const supervisor = () =>
    contextoDePrueba({
      permisos: ["rondas:read", "rondas:configurar"],
      portal: "erp",
      modulosActivos: ["rondas"],
      alcance: { instalaciones: [INST] },
      semilla: semilla(),
    });

  it("crea en una instalación a cargo", async () => {
    const { ctx } = supervisor();
    const r = await executeCapability(ctx, "rondas.puntos.crear", puntoQrGps);
    expect(r.ok).toBe(true);
  });

  it("una instalación fuera del alcance responde «no existe», sin enumeración", async () => {
    const { ctx } = supervisor();
    const r = await executeCapability(ctx, "rondas.puntos.crear", { ...puntoQrGps, instalacionId: INST2 });
    expect(r).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
    const lista = await executeCapability(ctx, "rondas.puntos.listar", { instalacionId: INST2 });
    expect(lista).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
  });
});

describe("rondas.plantillas.crear", () => {
  async function conPunto() {
    const h = owner();
    const r = await executeCapability(h.ctx, "rondas.puntos.crear", puntoQrGps);
    const puntoId = (r.ok && (r.data as { id: string }).id) || "";
    return { ...h, puntoId };
  }

  it("arma una plantilla con un punto de la instalación", async () => {
    const { ctx, puntoId } = await conPunto();
    const r = await executeCapability(ctx, "rondas.plantillas.crear", {
      instalacionId: INST,
      nombre: "Ronda nocturna",
      tiempoMaxMin: 60,
      puntos: [{ puntoId, orden: 0, obligatorio: true }],
    });
    expect(r.ok).toBe(true);
    expect(r.ok && (r.data as { puntos: unknown[] }).puntos).toHaveLength(1);
  });

  it("un punto de otra instalación o inexistente se rechaza (NOT_FOUND)", async () => {
    const { ctx } = await conPunto();
    const r = await executeCapability(ctx, "rondas.plantillas.crear", {
      instalacionId: INST,
      nombre: "Ronda rota",
      tiempoMaxMin: 60,
      puntos: [{ puntoId: "0192f3a0-0000-7000-8000-0000000000ff", orden: 0, obligatorio: true }],
    });
    expect(r).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
  });

  it("el tiempo por tramo no puede ser mayor o igual que el total", async () => {
    const { ctx, puntoId } = await conPunto();
    const r = await executeCapability(ctx, "rondas.plantillas.crear", {
      instalacionId: INST,
      nombre: "Ronda mal medida",
      tiempoMaxMin: 30,
      tiempoMaxTramoMin: 30,
      puntos: [{ puntoId, orden: 0, obligatorio: true }],
    });
    expect(r).toMatchObject({ ok: false, error: { code: "UNPROCESSABLE" } });
  });
});

describe("rondas.incidentes_tipo", () => {
  it("crea un tipo con gravedad y lo lista", async () => {
    const { ctx } = owner();
    const c = await executeCapability(ctx, "rondas.incidentes_tipo.crear", {
      nombre: "Puerta forzada",
      gravedadDefecto: "alta",
    });
    expect(c.ok).toBe(true);
    const l = await executeCapability(ctx, "rondas.incidentes_tipo.listar", {});
    expect(l.ok && (l.data as unknown[]).length).toBe(1);
  });
});
