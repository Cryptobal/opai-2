import { beforeEach, describe, expect, it, vi } from "vitest";

const ejecutar = vi.fn();
vi.mock("@/lib/servidor", () => ({ ejecutarComoUsuario: (...a: unknown[]) => ejecutar(...a) }));

import { cuentasPaginadas } from "@/lib/cuentas-paginadas";

const fila = (id: string) => ({ id, nombre: id });

describe("cuentasPaginadas", () => {
  beforeEach(() => ejecutar.mockReset());

  it("nunca pide más de 100 por página (tope de core.cuentas.list) y sigue el cursor", async () => {
    ejecutar
      .mockResolvedValueOnce({ ok: true, data: { items: [fila("a")], siguiente: "c1" } })
      .mockResolvedValueOnce({ ok: true, data: { items: [fila("b")], siguiente: null } });
    const r = await cuentasPaginadas({ estado: "cliente_activo" });
    expect(r.ok && r.data.items.map((c) => c.id)).toEqual(["a", "b"]);
    expect(ejecutar.mock.calls[0]?.[2]).toEqual({ limite: 100, estado: "cliente_activo" });
    expect(ejecutar.mock.calls[1]?.[2]).toEqual({ limite: 100, estado: "cliente_activo", cursor: "c1" });
  });

  it("devuelve el error de la página que falla", async () => {
    ejecutar.mockResolvedValueOnce({ ok: false, error: { code: "INVALID_INPUT", message: "x" } });
    const r = await cuentasPaginadas({});
    expect(r.ok).toBe(false);
  });
});
