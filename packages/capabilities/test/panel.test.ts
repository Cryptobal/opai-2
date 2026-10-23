import { beforeEach, describe, expect, it } from "vitest";

import {
  capacidadesDelNucleo,
  executeCapability,
  limpiarRegistro,
  registrarCapacidades,
} from "../src";
import { contextoDePrueba } from "../src/testing";

beforeEach(() => {
  limpiarRegistro();
  registrarCapacidades(capacidadesDelNucleo);
});

const ok = <T>(r: { ok: boolean; data?: unknown }) => {
  if (!r.ok) throw new Error(JSON.stringify(r));
  return r.data as T;
};

type Actividad = { items: { accion: string; actor: { agente: boolean }; cambios: unknown[] }[] };

describe("pantallas de la sesión C: actividad, contadores y pendientes", () => {
  it("la actividad de una cuenta incluye sus escrituras y las de sus contactos", async () => {
    const { ctx } = contextoDePrueba();
    const c = ok<{ id: string }>(
      await executeCapability(ctx, "core.cuentas.create", { nombre: "Logística Andina" }),
    );
    await executeCapability(ctx, "core.contactos.create", {
      cuentaId: c.id,
      nombres: "Paula",
      apellidos: "Riquelme",
      email: "paula@logandina.cl",
    });
    await executeCapability(ctx, "core.cuentas.create", { nombre: "Otra cuenta" });
    const a = ok<Actividad>(
      await executeCapability(ctx, "core.actividad.list", {
        entidad: { tipo: "cuenta", id: c.id },
      }),
    );
    expect(a.items.map((i) => i.accion)).toEqual([
      "creó el contacto Paula Riquelme",
      "creó la cuenta Logística Andina",
    ]);
    expect(a.items[0]?.actor.agente).toBe(false);
  });

  it("la actividad de toda la empresa exige permiso de auditoría", async () => {
    const { ctx } = contextoDePrueba({ rol: "supervisor" });
    const r = await executeCapability(ctx, "core.actividad.list", {});
    expect(r).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
  });

  it("los contadores devuelven null donde no hay permiso", async () => {
    const { ctx } = contextoDePrueba({ rol: "supervisor" });
    const n = ok<Record<string, number | null>>(
      await executeCapability(ctx, "core.resumen.contadores", {}),
    );
    expect(n["cuentas"]).toBe(0);
    expect(n["aprobacionesPendientes"]).toBeNull();
  });

  it("sin nada pendiente, Inicio no muestra decisiones", async () => {
    const { ctx } = contextoDePrueba();
    expect(ok<unknown[]>(await executeCapability(ctx, "core.inicio.pendientes", {}))).toEqual([]);
  });
});
