import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Identidad } from "@/lib/actor";

// La acción de servidor que invoca la UI (`ejecutarCapacidad`) debe exigir acceso al portal, no solo
// ocultar la búsqueda en el cliente: un usuario sin acceso al ERP no puede obtener datos del ERP.
const estado = vi.hoisted(() => ({
  identidad: null as Identidad | null,
  acceso: true,
  ejecutado: [] as string[],
}));

vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined, set: vi.fn() }) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@opai/capabilities", () => ({
  obtenerCapacidad: (id: string) =>
    id === "core.oculta"
      ? { interna: true, efecto: "lectura" }
      : id.startsWith("core.")
        ? { interna: false, efecto: "lectura" }
        : null,
}));
vi.mock("@/lib/servidor", () => ({
  identidadActual: async () => estado.identidad,
  tieneAccesoAPortal: (_i: Identidad, portal: string) => estado.acceso && portal === "erp",
  ejecutarComoUsuario: async (_p: string, id: string) => {
    estado.ejecutado.push(id);
    return { ok: true as const, data: { cuentas: [{ id: "c1" }] } };
  },
}));

import { ejecutarCapacidad } from "@/app/_acciones/capacidad";

function identidad(): Identidad {
  return {
    mfaActiva: false,
    usuario: { id: "u1", nombre: "Prueba", email: "prueba@example.test", platformRole: null },
    actual: null,
    membresias: [],
    modulosActivos: [],
    acceso: { permisosRol: null, excepciones: [], instalaciones: null },
  };
}

describe("ejecutarCapacidad exige acceso al portal", () => {
  beforeEach(() => {
    estado.identidad = identidad();
    estado.acceso = true;
    estado.ejecutado = [];
  });

  it("sin acceso al ERP: FORBIDDEN y no ejecuta la capacidad (no hay fuga de datos)", async () => {
    estado.acceso = false;
    const r = await ejecutarCapacidad("erp", "core.buscar", { q: "a" });
    expect(r).toEqual({
      ok: false,
      error: { code: "FORBIDDEN", message: "No tienes acceso a este portal." },
    });
    expect(estado.ejecutado).toEqual([]);
  });

  it("con acceso al ERP: delega en la capacidad y devuelve sus datos", async () => {
    const r = await ejecutarCapacidad("erp", "core.buscar", { q: "a" });
    expect(r.ok).toBe(true);
    expect(estado.ejecutado).toEqual(["core.buscar"]);
  });

  it("sin sesión: UNAUTHENTICATED antes de tocar la capacidad", async () => {
    estado.identidad = null;
    const r = await ejecutarCapacidad("erp", "core.buscar", { q: "a" });
    expect(r).toEqual({ ok: false, error: { code: "UNAUTHENTICATED", message: "Inicia sesión." } });
    expect(estado.ejecutado).toEqual([]);
  });

  it("capacidad inexistente o interna: NOT_FOUND, sin revelar el acceso", async () => {
    estado.acceso = false;
    for (const id of ["core.oculta", "no.existe"]) {
      const r = await ejecutarCapacidad("erp", id, {});
      expect(r).toEqual({
        ok: false,
        error: { code: "NOT_FOUND", message: `Capacidad "${id}" no existe.` },
      });
    }
    expect(estado.ejecutado).toEqual([]);
  });
});
