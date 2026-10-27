import { beforeEach, describe, expect, it, vi } from "vitest";

// H5: el proxy llama a `/api/existe` con un `fetch` interno que sale con la IP de Vercel. Para que el
// rate limit sea por persona y no un único cupo global, el proxy pasa la IP real en `x-opai-ip` y la
// ruta la prefiere. Se simula el limitador para comprobar con qué clave se consume.
const { permitir } = vi.hoisted(() => ({
  permitir: vi.fn<(c: string, m: number, v?: number) => Promise<boolean>>(),
}));

vi.mock("@/lib/rate-limit", () => ({
  permitir,
  ipDe: () => "ip-de-salida-vercel",
  LIMITES: { existe: { maximo: 120, ventanaMs: 60_000 } },
}));
vi.mock("@/lib/existe-ruta", () => ({ existeRuta: async () => true }));

import { GET } from "@/app/api/existe/route";

beforeEach(() => vi.clearAllMocks());

describe("/api/existe: cupo por la IP real del cliente (H5)", () => {
  it("usa la IP de x-opai-ip, no la del fetch interno de Vercel", async () => {
    permitir.mockResolvedValue(true);
    await GET(
      new Request("http://x/api/existe?ruta=/personas/1", { headers: { "x-opai-ip": "9.9.9.9" } }),
    );
    expect(permitir).toHaveBeenCalledWith("existe-ip:9.9.9.9", 120);
  });

  it("sin x-opai-ip cae a la IP de la petición", async () => {
    permitir.mockResolvedValue(true);
    await GET(new Request("http://x/api/existe?ruta=/personas/1"));
    expect(permitir).toHaveBeenCalledWith("existe-ip:ip-de-salida-vercel", 120);
  });

  it("responde 429 con el cupo agotado y no consulta la existencia", async () => {
    permitir.mockResolvedValue(false);
    const res = await GET(
      new Request("http://x/api/existe?ruta=/personas/1", { headers: { "x-opai-ip": "9.9.9.9" } }),
    );
    expect(res.status).toBe(429);
  });
});
