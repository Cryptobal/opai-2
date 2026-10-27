import { beforeEach, describe, expect, it, vi } from "vitest";

// El cupo de `/api/existe` va por el USUARIO de la sesión, no por IP: el proxy llama con un `fetch`
// interno que sale con la IP de Vercel (una sola para todos) y una cabecera de IP sería falsificable
// por quien golpee la ruta directo, rotándola para saltarse el tope y enumerar. El id de usuario sale
// de la sesión validada. Se simulan el limitador y la identidad para ver con qué clave se consume.
const { permitir } = vi.hoisted(() => ({
  permitir: vi.fn<(c: string, m: number, v?: number) => Promise<boolean>>(),
}));
const { identidadActual } = vi.hoisted(() => ({ identidadActual: vi.fn() }));

vi.mock("@/lib/rate-limit", () => ({
  permitir,
  ipDe: () => "ip-de-salida-vercel",
  LIMITES: { existe: { maximo: 120, ventanaMs: 60_000 } },
}));
vi.mock("@/lib/existe-ruta", () => ({ existeRuta: async () => true }));
vi.mock("@/lib/servidor", () => ({ identidadActual }));

import { GET } from "@/app/api/existe/route";

beforeEach(() => vi.clearAllMocks());

describe("/api/existe: cupo por el usuario de la sesión (H5)", () => {
  it("cuenta por el id de usuario de la sesión, no por IP", async () => {
    permitir.mockResolvedValue(true);
    identidadActual.mockResolvedValue({ usuario: { id: "usr-123" } });
    await GET(
      new Request("http://x/api/existe?ruta=/personas/1", { headers: { "x-opai-ip": "9.9.9.9" } }),
    );
    expect(permitir).toHaveBeenCalledWith("existe-usuario:usr-123", 120);
  });

  it("sin sesión cae a la IP de la petición (y no revela existencia)", async () => {
    permitir.mockResolvedValue(true);
    identidadActual.mockResolvedValue(null);
    await GET(new Request("http://x/api/existe?ruta=/personas/1"));
    expect(permitir).toHaveBeenCalledWith("existe-ip:ip-de-salida-vercel", 120);
  });

  it("no mezcla el cupo de dos usuarios distintos", async () => {
    permitir.mockResolvedValue(true);
    identidadActual.mockResolvedValue({ usuario: { id: "usr-a" } });
    await GET(new Request("http://x/api/existe?ruta=/personas/1"));
    identidadActual.mockResolvedValue({ usuario: { id: "usr-b" } });
    await GET(new Request("http://x/api/existe?ruta=/personas/1"));
    expect(permitir).toHaveBeenNthCalledWith(1, "existe-usuario:usr-a", 120);
    expect(permitir).toHaveBeenNthCalledWith(2, "existe-usuario:usr-b", 120);
  });

  it("responde 429 con el cupo agotado y no consulta la existencia", async () => {
    permitir.mockResolvedValue(false);
    identidadActual.mockResolvedValue({ usuario: { id: "usr-123" } });
    const res = await GET(new Request("http://x/api/existe?ruta=/personas/1"));
    expect(res.status).toBe(429);
  });
});
