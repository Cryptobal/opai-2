import { beforeEach, expect, it, vi } from "vitest";

const ejecutar = vi.fn();
vi.mock("@/lib/servidor", () => ({ ejecutarComoUsuario: (...a: unknown[]) => ejecutar(...a) }));
vi.mock("@/app/_components/etiquetas/opciones", () => ({
  cargarOpcionesEtiqueta: async () => [],
  filtroEtiquetaDe: () => ({}),
}));
import { cargarCuentas } from "@/app/(erp)/cuentas/_componentes/datos";

beforeEach(() => ejecutar.mockReset());

it("envía con instalaciones a la capacidad y conserva su página y cursor", async () => {
  const items = [{ id: "cuenta", nombre: "Cuenta", instalaciones: 1 }];
  ejecutar.mockResolvedValue({ ok: true, data: { items, siguiente: "siguiente" } });
  const r = await cargarCuentas({ con: "si", q: "Cuenta", estado: "prospecto", limite: "20" });
  expect(ejecutar).toHaveBeenCalledWith("erp", "core.cuentas.list", {
    conInstalaciones: true,
    q: "Cuenta",
    estado: "prospecto",
    limite: 20,
  });
  expect(r.items).toBe(items);
  expect(r.siguiente).toBe("siguiente");
});

it("no aplica el filtro cuando no está seleccionado", async () => {
  const items = [{ id: "cuenta", nombre: "Cuenta", instalaciones: 0 }];
  ejecutar.mockResolvedValue({ ok: true, data: { items, siguiente: null } });
  expect((await cargarCuentas({})).items).toBe(items);
  expect(ejecutar).toHaveBeenCalledWith("erp", "core.cuentas.list", { limite: 20 });
});
