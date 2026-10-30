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
const CARGO = "0192f3a0-0000-7000-8000-00000000e101";
const PERSONA_INST = "0192f3a0-0000-7000-8000-00000000d101"; // vínculo vigente en INST
const PERSONA_INST2 = "0192f3a0-0000-7000-8000-00000000d102"; // vínculo vigente en INST2, no en INST

function semilla() {
  return {
    ...semillaTenant(),
    instalacion: [
      { id: INST, tenantId: TENANT_DE_PRUEBA, nombre: "Planta Quilicura" },
      { id: INST2, tenantId: TENANT_DE_PRUEBA, nombre: "Bodega Lampa" },
    ],
    persona: [
      { id: PERSONA_INST, tenantId: TENANT_DE_PRUEBA, nombres: "Uno", apellidos: "Guardia", rut: "11.111.111-1", estado: "activa" },
      { id: PERSONA_INST2, tenantId: TENANT_DE_PRUEBA, nombres: "Dos", apellidos: "Guardia", rut: "22.222.222-2", estado: "activa" },
    ],
    vinculoLaboral: [
      { id: "0192f3a0-0000-7000-8000-00000000f101", tenantId: TENANT_DE_PRUEBA, personaId: PERSONA_INST, cargoId: CARGO, instalacionId: INST, tipo: "indefinido", inicio: new Date("2026-01-01"), estado: "vigente" },
      { id: "0192f3a0-0000-7000-8000-00000000f102", tenantId: TENANT_DE_PRUEBA, personaId: PERSONA_INST2, cargoId: CARGO, instalacionId: INST2, tipo: "indefinido", inicio: new Date("2026-01-01"), estado: "vigente" },
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

// Revisión 5705574663 (bloqueo por datos): `...dondeInstalacionId(ctx)` spread DESPUÉS de
// `instalacionId` pisaba el filtro por la instalación pedida y dejaba que una plantilla/punto de otra
// instalación del alcance se colara. Con el actor viendo AMBAS instalaciones, el cruce debe fallar.
describe("fuga entre instalaciones del alcance (revisión 5705574663)", () => {
  const dosInst = () =>
    contextoDePrueba({
      permisos: ["rondas:read", "rondas:configurar"],
      portal: "erp",
      modulosActivos: ["rondas"],
      alcance: { instalaciones: [INST, INST2] },
      semilla: semilla(),
    });
  const id = (r: { ok: boolean; data?: unknown }) => (r.ok ? (r.data as { id: string }).id : "");

  it("una plantilla de INST no puede usar un punto de INST2, aunque ambas estén en el alcance (B2)", async () => {
    const { ctx } = dosInst();
    const p2 = await executeCapability(ctx, "rondas.puntos.crear", { ...puntoQrGps, instalacionId: INST2 });
    const r = await executeCapability(ctx, "rondas.plantillas.crear", {
      instalacionId: INST,
      nombre: "Ronda cruzada",
      tiempoMaxMin: 60,
      puntos: [{ puntoId: id(p2), orden: 0, obligatorio: true }],
    });
    expect(r).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
  });

  it("una programación de INST no puede usar una plantilla de INST2, aunque ambas estén en el alcance (B1)", async () => {
    const { ctx } = dosInst();
    const p2 = await executeCapability(ctx, "rondas.puntos.crear", { ...puntoQrGps, instalacionId: INST2 });
    const pl2 = await executeCapability(ctx, "rondas.plantillas.crear", {
      instalacionId: INST2,
      nombre: "Plantilla de Lampa",
      tiempoMaxMin: 60,
      puntos: [{ puntoId: id(p2), orden: 0, obligatorio: true }],
    });
    const r = await executeCapability(ctx, "rondas.programaciones.fijar", {
      instalacionId: INST,
      plantillaId: id(pl2),
      nombre: "Programación cruzada",
      horarios: ["08:00"],
    });
    expect(r).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
  });
});

// Revisión 5705574663 (bloqueo por datos, B3): responsables.personaIds se guardaba validando solo
// que fueran UUID. Ahora cada persona debe existir en el tenant y tener un vínculo vigente en la
// instalación; si no, NOT_FOUND (sin revelar si la persona existe en otra instalación).
describe("rondas.programaciones.fijar · responsables (B3)", () => {
  async function plantillaDeInst(ctx: ReturnType<typeof owner>["ctx"]) {
    const p = await executeCapability(ctx, "rondas.puntos.crear", puntoQrGps);
    const puntoId = p.ok ? (p.data as { id: string }).id : "";
    const pl = await executeCapability(ctx, "rondas.plantillas.crear", {
      instalacionId: INST,
      nombre: "Ronda con responsables",
      tiempoMaxMin: 60,
      puntos: [{ puntoId, orden: 0, obligatorio: true }],
    });
    return pl.ok ? (pl.data as { id: string }).id : "";
  }

  it("acepta una persona con vínculo vigente en la instalación", async () => {
    const { ctx } = owner();
    const plantillaId = await plantillaDeInst(ctx);
    const r = await executeCapability(ctx, "rondas.programaciones.fijar", {
      instalacionId: INST,
      plantillaId,
      nombre: "Con Uno",
      horarios: ["08:00"],
      responsables: { modo: "personas", personaIds: [PERSONA_INST] },
    });
    expect(r.ok).toBe(true);
  });

  it("rechaza una persona asignada a OTRA instalación (NOT_FOUND, sin enumeración)", async () => {
    const { ctx } = owner();
    const plantillaId = await plantillaDeInst(ctx);
    const r = await executeCapability(ctx, "rondas.programaciones.fijar", {
      instalacionId: INST,
      plantillaId,
      nombre: "Con Dos",
      horarios: ["08:00"],
      responsables: { modo: "personas", personaIds: [PERSONA_INST2] },
    });
    expect(r).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
  });

  it("rechaza una persona inexistente", async () => {
    const { ctx } = owner();
    const plantillaId = await plantillaDeInst(ctx);
    const r = await executeCapability(ctx, "rondas.programaciones.fijar", {
      instalacionId: INST,
      plantillaId,
      nombre: "Con fantasma",
      horarios: ["08:00"],
      responsables: { modo: "personas", personaIds: ["0192f3a0-0000-7000-8000-0000000000ff"] },
    });
    expect(r).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
  });
});

// Toda escritura de Rondas exige rondas:configurar; sin él, FORBIDDEN antes de tocar la base
// (la autorización corre antes del handler). `rondas.puntos.crear` ya tiene su caso arriba.
describe("sin permiso de configurar: las escrituras dan FORBIDDEN", () => {
  const lector = () =>
    contextoDePrueba({ permisos: ["rondas:read"], portal: "erp", modulosActivos: ["rondas"], semilla: semilla() });
  const ID = "0192f3a0-0000-7000-8000-0000000000aa";
  const casos: [string, Record<string, unknown>][] = [
    ["rondas.puntos.actualizar", { id: ID, nombre: "Otro nombre" }],
    ["rondas.puntos.archivar", { id: ID }],
    ["rondas.plantillas.crear", { instalacionId: INST, nombre: "Plantilla", tiempoMaxMin: 60, puntos: [{ puntoId: ID, orden: 0, obligatorio: true }] }],
    ["rondas.plantillas.actualizar", { id: ID, nombre: "Plantilla" }],
    ["rondas.programaciones.fijar", { instalacionId: INST, plantillaId: ID, nombre: "Programación", horarios: ["08:00"] }],
    ["rondas.programaciones.pausar", { id: ID, pausada: true }],
    ["rondas.incidentes_tipo.crear", { nombre: "Robo", gravedadDefecto: "alta" }],
    ["rondas.incidentes_tipo.actualizar", { id: ID, activo: false }],
    ["rondas.etiquetas.pdf", { instalacionId: INST }],
  ];
  it.each(casos)("%s sin rondas:configurar devuelve FORBIDDEN", async (cap, input) => {
    const { ctx } = lector();
    const r = await executeCapability(ctx, cap, input);
    expect(r).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
  });
});
