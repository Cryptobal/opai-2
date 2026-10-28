import { beforeEach, expect, it, vi } from "vitest";
const h = vi.hoisted(() => ({ ejecutar: vi.fn() }));
vi.mock("@/lib/servidor", () => ({ ejecutarComoUsuario: h.ejecutar }));
import { revisarFichasNav, validarFichasNav } from "@/app/_acciones/validar-fichas-nav";
const href = "/cuentas/0192f3a0-0000-7000-8000-000000000001";
beforeEach(() => h.ejecutar.mockReset());

for (const code of ["NOT_FOUND", "FORBIDDEN", "INTERNAL", "UNAUTHENTICATED"]) {
  it(`${code}: falla cerrado y solo limpia un rechazo definitivo`, async () => {
    h.ejecutar.mockResolvedValue({ ok: false, error: { code } });
    expect(await revisarFichasNav([href])).toEqual({ validas: [],
      invalidas: ["NOT_FOUND", "FORBIDDEN"].includes(code) ? [href] : [],
    });
    expect(await validarFichasNav([href])).toEqual([]);
  });
}
it("revalida mediante la capacidad y no sigue URLs arbitrarias", async () => {
  h.ejecutar.mockResolvedValue({ ok: true, data: {} });
  expect(await revisarFichasNav([href, href, "https://ejemplo.cl", "/cuentas/no-uuid"])).toEqual({
    validas: [href], invalidas: ["https://ejemplo.cl", "/cuentas/no-uuid"],
  });
  expect(h.ejecutar).toHaveBeenCalledExactlyOnceWith("erp", "core.cuentas.get", {
    id: "0192f3a0-0000-7000-8000-000000000001",
  });
});
