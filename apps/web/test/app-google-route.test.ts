import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

// CAR-516: la cookie del reto debe ir en la respuesta del redirect a Google, no solo en cookies().
vi.mock("next/headers", () => ({
  cookies: async () => ({ set: vi.fn() }),
}));

const googleUrl = "https://accounts.google.com/o/oauth2/v2/auth?client_id=x";
vi.mock("@opai/auth", () => ({
  googleHabilitado: () => true,
  esRetoValido: (r: string) => /^[A-Za-z0-9_-]{43}$/.test(r),
  urlDeGoogle: async () => googleUrl,
}));

import { GET } from "@/app/(auth)/app/google/route";
import { cookies } from "next/headers";

const reto = "a".repeat(43);

describe("/app/google", () => {
  it("adjunta opai_app_reto al redirect hacia Google", async () => {
    const res = await GET(new NextRequest(`https://test.opai.cl/app/google?reto=${reto}`));
    expect(res.status).toBeGreaterThanOrEqual(300);
    expect(res.status).toBeLessThan(400);
    expect(res.headers.get("location")).toBe(googleUrl);
    const seteadas = res.headers.getSetCookie();
    expect(seteadas.some((c) => c.startsWith("opai_app_reto=") && c.includes(reto))).toBe(true);
    expect(seteadas.some((c) => c.includes("Path=/app"))).toBe(true);
    expect((await cookies()).set).not.toHaveBeenCalled();
  });

  it("reto inválido vuelve al login sin cookie", async () => {
    const res = await GET(new NextRequest("https://test.opai.cl/app/google?reto=corto"));
    expect(res.headers.get("location")).toContain("/login");
    expect(res.headers.getSetCookie()).toEqual([]);
  });
});