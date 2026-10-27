import { afterEach, describe, expect, it, vi } from "vitest";

// `vi.hoisted` porque la fábrica de `vi.mock` se eleva sobre las declaraciones del archivo.
const { consumirRateLimit, purgarVentanasRateLimit } = vi.hoisted(() => ({
  consumirRateLimit: vi.fn(),
  purgarVentanasRateLimit: vi.fn(),
}));

// `@opai/db` solo se usa para la función central; se simula para probar el limitador aislado.
vi.mock("@opai/db", () => ({ consumirRateLimit, purgarVentanasRateLimit }));

import { limpiarVentanas, permitir } from "@/lib/rate-limit";

afterEach(() => {
  vi.clearAllMocks();
  limpiarVentanas();
});

describe("permitir (rate limit central)", () => {
  it("devuelve el veredicto de la base", async () => {
    consumirRateLimit.mockResolvedValue({ permitido: true, restantes: 5, reinicio: new Date() });
    expect(await permitir("v1-ip:1.2.3.4", 10)).toBe(true);
    consumirRateLimit.mockResolvedValue({ permitido: false, restantes: 0, reinicio: new Date() });
    expect(await permitir("v1-ip:1.2.3.4", 10)).toBe(false);
  });

  it("convierte la ventana a segundos al llamar a la base", async () => {
    consumirRateLimit.mockResolvedValue({ permitido: true, restantes: 1, reinicio: new Date() });
    await permitir("recuperar-ip:x", 10, 15 * 60_000);
    expect(consumirRateLimit).toHaveBeenCalledWith("recuperar-ip:x", 10, 900);
  });

  it("si la base falla, cae a memoria (fallo abierto) y avisa sin datos personales", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    consumirRateLimit.mockRejectedValue(new Error("base caída"));
    expect(await permitir("mcp-ip:9.9.9.9", 2)).toBe(true);
    expect(await permitir("mcp-ip:9.9.9.9", 2)).toBe(true);
    expect(await permitir("mcp-ip:9.9.9.9", 2)).toBe(false);
    expect(warn).toHaveBeenCalled();
    const avisos = warn.mock.calls.flat().join(" ");
    expect(avisos).toContain("mcp-ip"); // el ámbito sí
    expect(avisos).not.toContain("9.9.9.9"); // la IP no
    warn.mockRestore();
  });
});
