import { beforeEach, describe, expect, it, vi } from "vitest";

// CAR-727: la vuelta a la app nativa debe ser un GET con redirect 303 al esquema, no Server Action.
const estado = vi.hoisted(() => ({
  reto: "reto-valido" as string | undefined,
  codigo: "codigo+1" as string | null,
  warn: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: () => (estado.reto ? { value: estado.reto } : undefined),
    delete: vi.fn(),
  }),
}));
vi.mock("@opai/auth", () => ({
  emitirCodigoApp: vi.fn(async () => estado.codigo),
}));

import { NextRequest } from "next/server";

import { GET } from "@/app/(auth)/app/volver/route";

beforeEach(() => {
  estado.reto = "reto-valido";
  estado.codigo = "codigo+1";
  estado.warn.mockReset();
  vi.stubGlobal("console", { ...console, warn: estado.warn });
});

describe("GET /app/volver", () => {
  it("con reto y código redirige 303 al esquema de la app", async () => {
    const url = "https://test.opai.cl/app/volver";
    const r = await GET(new NextRequest(url));
    expect(r.status).toBe(303);
    expect(r.headers.get("location")).toBe("cl.opai.app://canje?codigo=codigo%2B1");
  });

  it("sin cookie de reto vuelve a /app/listo con error y registra el motivo", async () => {
    estado.reto = undefined;
    const r = await GET(new NextRequest("https://test.opai.cl/app/volver"));
    expect(r.status).toBe(303);
    expect(r.headers.get("location")).toBe("https://test.opai.cl/app/listo?error=1");
    expect(estado.warn).toHaveBeenCalledWith("[app-nativa] volver_fallo", { motivo: "sin_reto" });
  });

  it("si emitir rechaza, vuelve a listo con error y registra el motivo", async () => {
    estado.codigo = null;
    const r = await GET(new NextRequest("https://test.opai.cl/app/volver"));
    expect(r.headers.get("location")).toBe("https://test.opai.cl/app/listo?error=1");
    expect(estado.warn).toHaveBeenCalledWith("[app-nativa] volver_fallo", {
      motivo: "emitir_rechazado",
    });
  });
});