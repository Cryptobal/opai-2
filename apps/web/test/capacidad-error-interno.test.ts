import { afterEach, describe, expect, it, vi } from "vitest";

// Si la sesión o la base fallan (pool de Neon agotado tras reanudar la instancia), la acción de
// servidor devuelve INTERNAL con referencia en vez de rechazar: la UI revierte y avisa.
const h = vi.hoisted(() => ({
  identidad: vi.fn(),
  ejecutar: vi.fn(),
  revalidar: vi.fn(),
  // Como `unstable_rethrow` de Next: relanza solo sus señales internas (redirect, notFound…).
  relanzar: vi.fn((e: unknown) => {
    if (e instanceof Error && e.message === "NEXT_REDIRECT") throw e;
  }),
}));

vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined, set: vi.fn() }) }));
vi.mock("next/cache", () => ({ revalidatePath: h.revalidar }));
vi.mock("next/navigation", () => ({ redirect: vi.fn(), unstable_rethrow: h.relanzar }));
vi.mock("@opai/capabilities", () => ({
  obtenerCapacidad: () => ({ interna: false, efecto: "escritura" }),
}));
vi.mock("@/lib/servidor", () => ({
  identidadActual: h.identidad,
  tieneAccesoAPortal: () => true,
  ejecutarComoUsuario: h.ejecutar,
}));

import { ejecutarCapacidad } from "@/app/_acciones/capacidad";

afterEach(() => vi.restoreAllMocks());

describe("ejecutarCapacidad nunca lanza", () => {
  it("si getSession falla, devuelve INTERNAL con ref y registra solo datos categóricos", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    h.identidad.mockRejectedValueOnce(
      new Error("[Better Auth] Connection terminated due to connection timeout"),
    );
    const r = await ejecutarCapacidad("erp", "core.config.set", { clave: "x", valor: "secreto" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe("INTERNAL");
    const { ref } = r.error.detalles as { ref: string };
    expect(ref).toMatch(/^[0-9a-f-]{36}$/);
    expect(r.error.message).toContain(`(ref: ${ref})`);
    expect(r.error.message).not.toMatch(/Better Auth|timeout/);
    expect(log).toHaveBeenCalledTimes(1);
    const datos = log.mock.calls[0]?.[1];
    expect(datos).toEqual({
      evento: "capacidad.error_interno",
      capacidad: "core.config.set",
      portal: "erp",
      code: "INTERNAL",
      errorName: "Error",
      correlacion: ref,
    });
    expect(JSON.stringify(log.mock.calls)).not.toMatch(/secreto|Better Auth/);
  });

  it("si la capacidad rechaza (conexión), también devuelve INTERNAL", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    h.identidad.mockResolvedValueOnce({ usuario: { id: "u1" } });
    h.ejecutar.mockRejectedValueOnce(new Error("timeout exceeded when trying to connect"));
    const r = await ejecutarCapacidad("erp", "core.config.set", {});
    expect(r).toMatchObject({ ok: false, error: { code: "INTERNAL" } });
  });

  it("una escritura guardada conserva su éxito aunque revalidatePath falle", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    h.identidad.mockResolvedValueOnce({ usuario: { id: "u1" } });
    h.ejecutar.mockResolvedValueOnce({ ok: true, data: { version: 3 }, dryRun: false });
    h.revalidar.mockImplementationOnce(() => {
      throw new Error("revalidar falló");
    });
    const r = await ejecutarCapacidad("erp", "core.config.set", {});
    expect(r).toEqual({ ok: true, data: { version: 3 }, dryRun: false });
    expect(h.revalidar).toHaveBeenCalledTimes(1);
  });

  it("las señales de Next (redirect, notFound) se propagan, no se vuelven INTERNAL", async () => {
    h.identidad.mockRejectedValueOnce(new Error("NEXT_REDIRECT"));
    await expect(ejecutarCapacidad("erp", "core.config.set", {})).rejects.toThrow("NEXT_REDIRECT");
  });
});
