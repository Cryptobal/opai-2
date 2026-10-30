// Brief 14 · Rondas PR 1: validación, autorización por rol y alcance (ADR-022), auditoría, dryRun e
// idempotencia de las capacidades de configuración. El aislamiento entre dos tenants se prueba con
// Postgres real en packages/db (rls-dos-empresas) y aquí se cubre el alcance por filas.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  capacidadesDelNucleo,
  capacidadesRondas,
  executeCapability,
  limpiarModulos,
  limpiarRegistro,
  registrarCapacidades,
} from "../src";
import { TENANT_DE_PRUEBA, USUARIO_DE_PRUEBA, contextoDePrueba } from "../src/testing";
import type { AgenteContexto } from "../src/types";
import { semillaTenant } from "./semilla";

// Valor de prueba de RONDAS_ETIQUETA_SECRET (≥32 bytes), solo para este archivo de tests (R7,
// corrección de la review 5713377140 del PR #145: nunca un valor fijo en el código de producción).
const SECRETO_ETIQUETA_DE_PRUEBA = "secreto-de-prueba-de-al-menos-32-caracteres-rondas-etiqueta-qr";
vi.stubEnv("RONDAS_ETIQUETA_SECRET", SECRETO_ETIQUETA_DE_PRUEBA);
afterEach(() => {
  vi.unstubAllEnvs();
  vi.stubEnv("RONDAS_ETIQUETA_SECRET", SECRETO_ETIQUETA_DE_PRUEBA);
});

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
  it("crea un punto QR + GPS, genera su etiqueta opaca y firmada y la registra en el historial", async () => {
    const { ctx, tabla, eventos } = owner();
    const r = await executeCapability(ctx, "rondas.puntos.crear", puntoQrGps);
    expect(r.ok).toBe(true);
    expect(tabla("puntoControl")).toHaveLength(1);
    const fila = tabla("puntoControl")[0] as { id: string; etiquetaQr: string; modo: string };
    expect(fila.etiquetaQr).toMatch(/^R2\./);
    const etiquetas = tabla("etiquetaQr") as { puntoId: string; estado: string; codigo: string; firmada: boolean }[];
    expect(etiquetas).toHaveLength(1);
    expect(etiquetas[0]).toMatchObject({ puntoId: fila.id, estado: "vigente", codigo: fila.etiquetaQr, firmada: true });
    expect(eventos.some((e) => e.capability === "rondas.puntos.crear")).toBe(true);
  });

  it("un punto solo GPS no genera etiqueta QR", async () => {
    const { ctx, tabla } = owner();
    const r = await executeCapability(ctx, "rondas.puntos.crear", { ...puntoQrGps, modo: "gps" });
    expect(r.ok).toBe(true);
    expect((tabla("puntoControl")[0] as { etiquetaQr: string | null }).etiquetaQr).toBeNull();
    expect(tabla("etiquetaQr")).toHaveLength(0);
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

  // Corrección de la review 5713377140 del PR #145: sin RONDAS_ETIQUETA_SECRET no se crea ningún
  // punto QR ni etiqueta (falla cerrado, nada queda a medias).
  it("sin RONDAS_ETIQUETA_SECRET no crea el punto ni ninguna etiqueta (UNPROCESSABLE)", async () => {
    vi.stubEnv("RONDAS_ETIQUETA_SECRET", undefined);
    const { ctx, tabla } = owner();
    const r = await executeCapability(ctx, "rondas.puntos.crear", puntoQrGps);
    expect(r).toMatchObject({ ok: false, error: { code: "UNPROCESSABLE" } });
    expect(tabla("puntoControl")).toHaveLength(0);
    expect(tabla("etiquetaQr")).toHaveLength(0);
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

// El tiempo por tramo se valida contra lo que QUEDARÁ guardado: el total y el tramo nuevos si vienen
// en el input, o los actuales si no. `null` borra el tramo (deja de validarse). Cubre el camino de
// `actualizar`, que el caso de `crear` de arriba no toca.
describe("rondas.plantillas.actualizar · validación de tramo", () => {
  async function conPlantilla(tiempoMaxMin: number, tiempoMaxTramoMin: number | null) {
    const h = owner();
    const p = await executeCapability(h.ctx, "rondas.puntos.crear", puntoQrGps);
    const puntoId = p.ok ? (p.data as { id: string }).id : "";
    const pl = await executeCapability(h.ctx, "rondas.plantillas.crear", {
      instalacionId: INST,
      nombre: "Plantilla base",
      tiempoMaxMin,
      ...(tiempoMaxTramoMin != null ? { tiempoMaxTramoMin } : {}),
      puntos: [{ puntoId, orden: 0, obligatorio: true }],
    });
    return { ...h, plantillaId: pl.ok ? (pl.data as { id: string }).id : "" };
  }

  it("un tramo nuevo mayor o igual que el total guardado se rechaza", async () => {
    const { ctx, plantillaId } = await conPlantilla(60, null);
    const r = await executeCapability(ctx, "rondas.plantillas.actualizar", {
      id: plantillaId,
      tiempoMaxTramoMin: 60,
    });
    expect(r).toMatchObject({ ok: false, error: { code: "UNPROCESSABLE" } });
  });

  it("un total nuevo menor o igual que el tramo guardado se rechaza", async () => {
    const { ctx, plantillaId } = await conPlantilla(60, 30);
    const r = await executeCapability(ctx, "rondas.plantillas.actualizar", {
      id: plantillaId,
      tiempoMaxMin: 20,
    });
    expect(r).toMatchObject({ ok: false, error: { code: "UNPROCESSABLE" } });
  });

  it("borrar el tramo (null) no valida contra el total y pasa", async () => {
    const { ctx, plantillaId } = await conPlantilla(60, 30);
    const r = await executeCapability(ctx, "rondas.plantillas.actualizar", {
      id: plantillaId,
      tiempoMaxTramoMin: null,
    });
    expect(r.ok).toBe(true);
    expect(r.ok && (r.data as { tiempoMaxTramoMin: number | null }).tiempoMaxTramoMin).toBeNull();
  });

  it("total y tramo nuevos coherentes (tramo < total) pasan", async () => {
    const { ctx, plantillaId } = await conPlantilla(60, 30);
    const r = await executeCapability(ctx, "rondas.plantillas.actualizar", {
      id: plantillaId,
      tiempoMaxMin: 120,
      tiempoMaxTramoMin: 90,
    });
    expect(r.ok).toBe(true);
  });
});

// Corrección del #141 (revisión 5707863593, bloqueo por datos): al reescribir la secuencia de una
// plantilla, un punto que ya estaba en ella y se archivó debe conservarse (archivar no lo saca de las
// plantillas). Solo los puntos NUEVOS deben estar activos; los ya presentes se aceptan aunque estén
// archivados. Un punto archivado que NO estaba en la secuencia sí se rechaza.
describe("rondas.plantillas.actualizar · conserva puntos archivados de la secuencia (#141)", () => {
  const idDe = (r: { ok: boolean; data?: unknown }) => (r.ok ? (r.data as { id: string }).id : "");
  async function base() {
    const h = owner();
    const p1 = idDe(await executeCapability(h.ctx, "rondas.puntos.crear", puntoQrGps));
    const pl = idDe(
      await executeCapability(h.ctx, "rondas.plantillas.crear", {
        instalacionId: INST,
        nombre: "Ronda con archivado",
        tiempoMaxMin: 60,
        puntos: [{ puntoId: p1, orden: 0, obligatorio: true }],
      }),
    );
    return { ...h, p1, pl };
  }

  it("acepta re-guardar la secuencia con un punto ya presente que se archivó", async () => {
    const { ctx, p1, pl } = await base();
    await executeCapability(ctx, "rondas.puntos.archivar", { id: p1 });
    const r = await executeCapability(ctx, "rondas.plantillas.actualizar", {
      id: pl,
      puntos: [{ puntoId: p1, orden: 0, obligatorio: true }],
    });
    expect(r.ok).toBe(true);
    expect(r.ok && (r.data as { puntos: { puntoId: string }[] }).puntos.map((x) => x.puntoId)).toContain(p1);
  });

  it("rechaza agregar un punto archivado que NO estaba en la secuencia (NOT_FOUND)", async () => {
    const { ctx, p1, pl } = await base();
    const p2 = idDe(
      await executeCapability(ctx, "rondas.puntos.crear", { ...puntoQrGps, nombre: "Otro punto" }),
    );
    await executeCapability(ctx, "rondas.puntos.archivar", { id: p2 });
    const r = await executeCapability(ctx, "rondas.plantillas.actualizar", {
      id: pl,
      puntos: [
        { puntoId: p1, orden: 0, obligatorio: true },
        { puntoId: p2, orden: 1, obligatorio: true },
      ],
    });
    expect(r).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
  });
});

// Corrección del #141 (decisión de Carlos: radio menor a 20 m): el radio de geocerca va de 5 a 20 m.
describe("rondas.puntos: radio de geocerca 5–20 m (#141)", () => {
  it("acepta el techo de 20 m", async () => {
    const { ctx } = owner();
    const r = await executeCapability(ctx, "rondas.puntos.crear", { ...puntoQrGps, radioM: 20 });
    expect(r.ok).toBe(true);
  });

  it("rechaza un radio mayor que 20 m (antes el tope era 200)", async () => {
    const { ctx } = owner();
    const r = await executeCapability(ctx, "rondas.puntos.crear", { ...puntoQrGps, radioM: 21 });
    expect(r).toMatchObject({ ok: false, error: { code: "INVALID_INPUT" } });
    const r200 = await executeCapability(ctx, "rondas.puntos.crear", { ...puntoQrGps, radioM: 200 });
    expect(r200).toMatchObject({ ok: false, error: { code: "INVALID_INPUT" } });
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
    ["rondas.puntos.reemplazar_etiqueta", { id: ID, motivo: "sospecha de fotocopia" }],
  ];
  it.each(casos)("%s sin rondas:configurar devuelve FORBIDDEN", async (cap, input) => {
    const { ctx } = lector();
    const r = await executeCapability(ctx, cap, input);
    expect(r).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
  });
});

describe("rondas.puntos.reemplazar_etiqueta (R7, R34)", () => {
  async function conPunto(modo = "qr_gps") {
    const o = owner();
    const r = await executeCapability(o.ctx, "rondas.puntos.crear", { ...puntoQrGps, modo });
    if (!r.ok) throw new Error("no se pudo crear el punto");
    const punto = r.data as { id: string; etiquetaQr: string | null };
    return { ...o, punto };
  }

  it("invalida la etiqueta vigente, genera una firmada nueva y emite el evento", async () => {
    const { ctx, tabla, punto } = await conPunto();
    const original = punto.etiquetaQr as string;
    const r = await executeCapability(ctx, "rondas.puntos.reemplazar_etiqueta", {
      id: punto.id,
      motivo: "sospecha de fotocopia",
    });
    expect(r.ok).toBe(true);
    const data = (r as { data: { etiquetaAnterior: string; etiquetaNueva: string } }).data;
    expect(data.etiquetaAnterior).toBe(original);
    expect(data.etiquetaNueva).toMatch(/^R2\./);
    expect(data.etiquetaNueva).not.toBe(original);
    const etiquetas = tabla("etiquetaQr") as { codigo: string; estado: string }[];
    expect(etiquetas.find((e) => e.codigo === original)?.estado).toBe("reemplazada");
    expect(etiquetas.find((e) => e.codigo === data.etiquetaNueva)?.estado).toBe("vigente");
    const p = tabla("puntoControl")[0] as { etiquetaQr: string };
    expect(p.etiquetaQr).toBe(data.etiquetaNueva);
    expect(tabla("evento").some((e) => (e as { tipo: string }).tipo === "rondas.etiqueta.reemplazada")).toBe(true);
  });

  it("dryRun no persiste ni cambia la etiqueta del punto", async () => {
    const { ctx, tabla, punto } = await conPunto();
    const original = punto.etiquetaQr as string;
    const r = await executeCapability(
      ctx,
      "rondas.puntos.reemplazar_etiqueta",
      { id: punto.id, motivo: "solo vista previa" },
      { dryRun: true },
    );
    expect(r.ok).toBe(true);
    expect((tabla("puntoControl")[0] as { etiquetaQr: string }).etiquetaQr).toBe(original);
    expect(tabla("etiquetaQr")).toHaveLength(1);
    expect((tabla("etiquetaQr")[0] as { estado: string }).estado).toBe("vigente");
  });

  it("un punto solo GPS no tiene etiqueta que reemplazar (UNPROCESSABLE)", async () => {
    const { ctx, punto } = await conPunto("gps");
    const r = await executeCapability(ctx, "rondas.puntos.reemplazar_etiqueta", {
      id: punto.id,
      motivo: "no debería dejar",
    });
    expect(r).toMatchObject({ ok: false, error: { code: "UNPROCESSABLE" } });
  });

  it("un supervisor no puede reemplazar una etiqueta, aunque tenga rondas:configurar (rondas.md §7)", async () => {
    const { punto } = await conPunto();
    const sup = contextoDePrueba({
      rol: "supervisor",
      portal: "erp",
      modulosActivos: ["rondas"],
      alcance: { instalaciones: [INST] },
      semilla: semilla(),
    });
    const r = await executeCapability(sup.ctx, "rondas.puntos.reemplazar_etiqueta", {
      id: punto.id,
      motivo: "fuera de su alcance de acción",
    });
    expect(r).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
  });

  it("un agente recibe APPROVAL_REQUIRED por ser irreversible (R34)", async () => {
    const { punto } = await conPunto();
    const KEY = "0192f3a0-0000-7000-8000-00000000cafe";
    const agente: AgenteContexto = {
      apiKeyId: KEY,
      nombre: "Agente Rondas",
      presupuestoMensualMicro: null,
      autonomia: {},
    };
    const ag = contextoDePrueba({
      portal: "erp",
      modulosActivos: ["rondas"],
      actor: { tipo: "agent", id: KEY, viaUserId: USUARIO_DE_PRUEBA.id },
      agente,
      scopes: ["rondas"],
      semilla: {
        ...semilla(),
        apiKey: [{ id: KEY, nombre: "Agente Rondas", userId: USUARIO_DE_PRUEBA.id, scopes: ["rondas"] }],
      },
    });
    const r = await executeCapability(ag.ctx, "rondas.puntos.reemplazar_etiqueta", {
      id: punto.id,
      motivo: "el agente propone reemplazar",
    });
    expect(r).toMatchObject({ ok: false, error: { code: "APPROVAL_REQUIRED" } });
  });
});
