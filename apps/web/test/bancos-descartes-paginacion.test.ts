import { beforeEach, describe, expect, it, vi } from "vitest";

const ejecutar = vi.fn();
vi.mock("@/lib/servidor", () => ({
  ejecutarComoUsuario: (...args: unknown[]) => ejecutar(...args),
  requerirIdentidad: async () => ({}),
}));
vi.mock("@/lib/permisos-ui", () => ({ puedeDeIdentidad: () => () => true }));

import { cargarImportaciones } from "@/app/(erp)/finanzas/bancos/importaciones/_componentes/datos";

const cuentaId = "00000000-0000-4000-8000-000000000001";
const cursor = "00000000-0000-4000-8000-000000000020";
const filas = Array.from({ length: 21 }, (_, i) => ({ id: String(i + 1), restauradoEn: null }));
const ok = (items: unknown[], siguiente: string | null = null) => ({ ok: true, data: { items, siguiente } });

describe("Bancos: navegación de los descartes más allá del vigésimo", () => {
  beforeEach(() => {
    ejecutar.mockReset();
    ejecutar.mockImplementation((_portal, capacidad, input) => {
      if (capacidad === "finanzas.bancos.listar") return ok([{ id: cuentaId }]);
      if (capacidad === "finanzas.cartolas.listar") return ok([]);
      return input.cursor === cursor ? ok(filas.slice(20)) : ok(filas.slice(0, 20), cursor);
    });
  });

  it("conserva el cursor de la capacidad y permite llegar al descarte 21 y volver al inicio", async () => {
    const primera = await cargarImportaciones(Promise.resolve({ cuenta: cuentaId }));
    expect(primera.descartes).toHaveLength(20);
    expect(primera.descartesInicioHref).toBeNull();
    const href = new URL(primera.descartesSiguienteHref!, "https://ficticio.test");
    expect(href.searchParams.get("cuenta")).toBe(cuentaId);
    expect(href.searchParams.get("cursorDescartes")).toBe(cursor);
    const segunda = await cargarImportaciones(Promise.resolve(Object.fromEntries(href.searchParams)));
    expect(segunda.descartes).toEqual([filas[20]]);
    expect(segunda.descartesSiguienteHref).toBeNull();
    expect(segunda.descartesInicioHref).toBe(`/finanzas/bancos/importaciones?cuenta=${cuentaId}`);
    expect(ejecutar).toHaveBeenCalledWith("erp", "finanzas.descartes_bancarios.list", { cuentaId, limite: 20, cursor });
  });

  it("no convierte un fallo de descartes en una lista vacía exitosa", async () => {
    ejecutar.mockImplementation((_portal, capacidad) => capacidad === "finanzas.descartes_bancarios.list"
      ? { ok: false, error: { code: "INTERNAL_ERROR" } }
      : ok(capacidad === "finanzas.bancos.listar" ? [{ id: cuentaId }] : []));
    expect((await cargarImportaciones(Promise.resolve({ cuenta: cuentaId }))).state).toBe("error");
  });
});
