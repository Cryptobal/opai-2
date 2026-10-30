// Brief 10 · CPQ PR 10.1 (autorrevisión): una cotización ya creada respeta el alcance del actor
// (ADR-022). Las secciones y líneas de instalaciones fuera de su alcance no se ven ni se tocan
// (NOT_FOUND, sin enumeración), como en la ficha del negocio; la Común sí. Y una repetición
// idempotente no entrega campos de costo a quien perdió `cpq:costos.ver` (R59).
import { beforeEach, describe, expect, it } from "vitest";

import { executeCapability } from "../src";
import { CARGO, I1, N1, ctxCpq, puesto, registrarCpq, semillaCpq } from "./cpq-ayuda";

beforeEach(registrarCpq);

/** El owner crea una cotización con I1 y la Común, una línea en cada una; devuelve la semilla. */
async function conDosSecciones() {
  const { ctx, tabla } = ctxCpq();
  const c = await executeCapability(ctx, "cpq.cotizaciones.create", { negocioId: N1, comun: true });
  const d = c.ok ? (c.data as { id: string; secciones: { id: string; tipo: string }[] }) : null;
  if (!d) throw new Error("no se creó");
  const [inst, comun] = [d.secciones[0]?.id ?? "", d.secciones[1]?.id ?? ""];
  await executeCapability(ctx, "cpq.cotizaciones.ajustar", {
    id: d.id,
    operaciones: [puesto(inst), { ...puesto(comun), nombre: "Supervisor", cargoId: CARGO }],
  });
  const semilla = {
    ...semillaCpq(),
    cotizacion: tabla("cotizacion"),
    versionCotizacion: tabla("versionCotizacion"),
    seccionCotizacion: tabla("seccionCotizacion"),
    lineaCotizacion: tabla("lineaCotizacion"),
  };
  const lineaI1 = (tabla("lineaCotizacion") as { id: string; seccionId: string }[]).find(
    (l) => l.seccionId === inst,
  )?.id;
  return { semilla, id: d.id, inst, lineaI1: lineaI1 ?? "" };
}

const acotado = (semilla: ReturnType<typeof semillaCpq>) =>
  ctxCpq({ semilla, alcance: { instalaciones: [] } }).ctx;

describe("alcance sobre secciones y líneas de una cotización existente", () => {
  it("get no muestra la sección de I1 ni sus líneas a quien no la tiene en su alcance", async () => {
    const { semilla, id } = await conDosSecciones();
    const r = await executeCapability(acotado(semilla), "cpq.cotizaciones.get", { id });
    const d = r.ok
      ? (r.data as {
          secciones: { tipo: string; instalacionId: string | null }[];
          lineas: { nombre: string }[];
        })
      : null;
    expect(d?.secciones.map((s) => s.tipo)).toEqual(["comun"]);
    expect(d?.secciones.some((s) => s.instalacionId === I1)).toBe(false);
    expect(d?.lineas.map((l) => l.nombre)).toEqual(["Supervisor"]);
  });

  it("no quita la sección de I1 ni edita su línea: NOT_FOUND", async () => {
    const { semilla, id, inst, lineaI1 } = await conDosSecciones();
    const ctx = acotado(semilla);
    const q = await executeCapability(ctx, "cpq.cotizaciones.ajustar", {
      id,
      operaciones: [{ op: "quitar_seccion", seccionId: inst }],
    });
    const l = await executeCapability(ctx, "cpq.cotizaciones.ajustar", {
      id,
      operaciones: [{ op: "quitar_linea", lineaId: lineaI1 }],
    });
    const a = await executeCapability(ctx, "cpq.cotizaciones.ajustar", {
      id,
      operaciones: [puesto(inst)],
    });
    expect(q).toMatchObject({
      ok: false,
      error: { code: "NOT_FOUND", message: "La sección no existe." },
    });
    expect(l).toMatchObject({
      ok: false,
      error: { code: "NOT_FOUND", message: "La línea no existe." },
    });
    expect(a).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
  });

  it("el owner (sin alcance acotado) sí ve las dos secciones (control)", async () => {
    const { semilla, id } = await conDosSecciones();
    const r = await executeCapability(ctxCpq({ semilla }).ctx, "cpq.cotizaciones.get", { id });
    expect(r.ok && (r.data as { secciones: unknown[] }).secciones).toHaveLength(2);
  });
});

describe("repetición idempotente y cpq:costos.ver (R59)", () => {
  it("la misma clave no entrega la salida con costos a quien ya no tiene el permiso", async () => {
    const semilla = semillaCpq();
    const owner = ctxCpq({ semilla });
    const o = { idempotencyKey: "cpq-rep-1" };
    expect(
      (await executeCapability(owner.ctx, "cpq.cotizaciones.create", { negocioId: N1 }, o)).ok,
    ).toBe(true);
    const sinCostos = { ...owner.ctx, autorizar: (p: string) => p !== "cpq:costos.ver" };
    const r = await executeCapability(sinCostos, "cpq.cotizaciones.create", { negocioId: N1 }, o);
    expect(r).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
  });
});
