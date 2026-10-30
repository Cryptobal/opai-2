// Brief 10 · CPQ PR 10.1: `cpq:costos.ver` aplicado en el servidor (R59, CA15) por capacidad, por
// la API HTTP (/api/v1) y por el MCP, más permisos por rol (§7) y tests negativos de escritura.
import { beforeEach, describe, expect, it } from "vitest";

import { executeCapability } from "../src";
import { manejarCapacidadHttp } from "../src/http";
import { ejecutarHerramienta, herramientasMcp } from "../src/mcp";
import { USUARIO_DE_PRUEBA } from "../src/testing";
import { CARGO, N1, ctxCpq, registrarCpq, semillaCpq } from "./cpq-ayuda";

beforeEach(registrarCpq);

const SIN_COSTOS = ["cpq:cotizaciones.read", "cpq:cotizaciones.manage"];
const COSTO = [
  "costoMensual",
  "margenEfectivo",
  "margenObjetivo",
  "modoMargen",
  "sueldoBruto",
  "costoUnitario",
  "margenPropio",
  "motivoPersonas",
];
const agente = { tipo: "agent" as const, id: "k1", viaUserId: USUARIO_DE_PRUEBA.id };

/** Claves de costo presentes en cualquier nivel de la salida. */
function clavesDeCosto(x: unknown): string[] {
  if (Array.isArray(x)) return x.flatMap(clavesDeCosto);
  if (!x || typeof x !== "object") return [];
  return Object.entries(x).flatMap(([k, v]) => [
    ...(COSTO.includes(k) ? [k] : []),
    ...clavesDeCosto(v),
  ]);
}

/** Siembra una cotización con una línea con sueldo, creada por el owner sobre la misma semilla. */
async function sembrada() {
  const { ctx, tabla } = ctxCpq();
  const c = await executeCapability(ctx, "cpq.cotizaciones.create", { negocioId: N1 });
  const d = c.ok
    ? (c.data as { id: string; secciones: { id: string }[] })
    : { id: "", secciones: [] };
  await executeCapability(ctx, "cpq.cotizaciones.ajustar", {
    id: d.id,
    operaciones: [
      {
        op: "agregar_linea",
        seccionId: d.secciones[0]?.id,
        tipo: "puesto",
        nombre: "Guardia",
        cargoId: CARGO,
        sueldoBruto: 650_000,
      },
    ],
  });
  // Cada contexto falso clona su semilla: la del segundo contexto lleva las filas ya creadas.
  const semilla = {
    ...semillaCpq(),
    cotizacion: tabla("cotizacion"),
    versionCotizacion: tabla("versionCotizacion"),
    seccionCotizacion: tabla("seccionCotizacion"),
    lineaCotizacion: tabla("lineaCotizacion"),
  };
  return { semilla, id: d.id };
}

describe("R59: sin cpq:costos.ver el servidor no devuelve costo, margen ni sueldos", () => {
  it("con el permiso (owner) sí los devuelve (control)", async () => {
    const { semilla, id } = await sembrada();
    const r = await executeCapability(ctxCpq({ semilla }).ctx, "cpq.cotizaciones.get", { id });
    expect(clavesDeCosto(r.ok && r.data)).toEqual(
      expect.arrayContaining(["margenObjetivo", "sueldoBruto"]),
    );
  });

  it("por capacidad: get y list sin el permiso no traen ninguna clave de costo", async () => {
    const { semilla, id } = await sembrada();
    const { ctx } = ctxCpq({ semilla, permisos: ["cpq:cotizaciones.read"] });
    const g = await executeCapability(ctx, "cpq.cotizaciones.get", { id });
    const l = await executeCapability(ctx, "cpq.cotizaciones.list", {});
    expect(g.ok && l.ok).toBe(true);
    expect(clavesDeCosto(g.ok && g.data)).toEqual([]);
    expect(clavesDeCosto(l.ok && l.data)).toEqual([]);
  });

  it("por la API /api/v1: la ficha sin el permiso no trae claves de costo", async () => {
    const { semilla, id } = await sembrada();
    const fabrica = async () => ctxCpq({ semilla, permisos: ["cpq:cotizaciones.read"] }).ctx;
    const q = encodeURIComponent(JSON.stringify({ id }));
    const res = await manejarCapacidadHttp(
      new Request(`http://x/api/v1/cpq/cotizaciones/get?input=${q}`),
      ["cpq", "cotizaciones", "get"],
      fabrica,
    );
    expect(res.status).toBe(200);
    expect(clavesDeCosto(await res.json())).toEqual([]);
  });

  it("por el MCP: el agente sin el permiso recibe la ficha sin claves de costo", async () => {
    const { semilla, id } = await sembrada();
    const { ctx } = ctxCpq({ semilla, permisos: SIN_COSTOS });
    const ctxAgente = { ...ctx, actor: agente, scopes: ["cpq"] };
    const h = herramientasMcp(ctxAgente).find((x) => x.nombre === "cpq_cotizaciones_get");
    if (!h) throw new Error("falta la herramienta cpq_cotizaciones_get");
    const r = await ejecutarHerramienta(ctxAgente, h, { id });
    expect(r.ok).toBe(true);
    expect(clavesDeCosto(r.ok && r.data)).toEqual([]);
  });

  it("por el MCP: sin el permiso, ni preview_ ni la escritura fijan un sueldo o un margen", async () => {
    const { semilla, id } = await sembrada();
    const { ctx } = ctxCpq({ semilla, permisos: SIN_COSTOS });
    const ctxAgente = { ...ctx, actor: agente, scopes: ["cpq"] };
    const nombres = herramientasMcp(ctxAgente).map((x) => x.nombre);
    expect(nombres).toEqual(
      expect.arrayContaining([
        "preview_cpq_cotizaciones_ajustar",
        "preview_cpq_cotizaciones_create",
      ]),
    );
    for (const nombre of ["preview_cpq_cotizaciones_ajustar", "cpq_cotizaciones_ajustar"]) {
      const h = herramientasMcp(ctxAgente).find((x) => x.nombre === nombre);
      if (!h) throw new Error(nombre);
      const r = await ejecutarHerramienta(ctxAgente, h, {
        id,
        operaciones: [{ op: "fijar_margen", margenObjetivo: 150_000 }],
      });
      expect(r).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
    }
  });

  it("con manage y sin costos: crear con margen o fijar sueldo es FORBIDDEN; lo demás sí, sin devolver costos", async () => {
    const { semilla, id } = await sembrada();
    const { ctx } = ctxCpq({ semilla, permisos: SIN_COSTOS });
    const crear = await executeCapability(ctx, "cpq.cotizaciones.create", {
      negocioId: N1,
      margenObjetivo: 200_000,
    });
    expect(crear).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
    const linea = await executeCapability(ctx, "cpq.cotizaciones.ajustar", {
      id,
      operaciones: [{ op: "agregar_comun" }],
    });
    expect(linea.ok).toBe(true);
    expect(clavesDeCosto(linea.ok && linea.data)).toEqual([]);
  });
});
