import { beforeEach, describe, expect, it, vi } from "vitest";

// CAR-516: el canje de la app nativa tiene tope con fallo cerrado y un solo error genérico.
const estado = vi.hoisted(() => ({
  permitido: true,
  canje: true,
  reto: "r" as string | undefined,
}));

vi.mock("next/headers", () => ({
  headers: async () => new Headers(),
  cookies: async () => ({
    get: () => (estado.reto ? { value: estado.reto } : undefined),
    delete: vi.fn(),
  }),
}));
vi.mock("next/navigation", () => ({
  redirect: (destino: string) => {
    throw new Error(`REDIRECT:${destino}`);
  },
}));
vi.mock("@/lib/rate-limit", () => ({
  ipDeCabeceras: () => "10.0.0.1",
  permitir: vi.fn(async () => estado.permitido),
}));
vi.mock("@opai/auth", () => ({
  canjearCodigoApp: vi.fn(async () => estado.canje),
  emitirCodigoApp: vi.fn(async (reto: string) => (reto === "r" ? "codigo+1" : null)),
}));

import { accionCanjearApp, accionVolverALaApp } from "@/app/_acciones/app-nativa";
import { permitir } from "@/lib/rate-limit";

const destino = (p: Promise<unknown>) =>
  p.then(() => "sin redirect").catch((e: Error) => e.message);

describe("canje de la app nativa", () => {
  beforeEach(() => {
    estado.permitido = true;
    estado.canje = true;
    estado.reto = "r";
  });

  it("con código y verificador correctos entra por /entrar", async () => {
    expect(await destino(accionCanjearApp("c", "v"))).toBe("REDIRECT:/entrar");
    expect(permitir).toHaveBeenCalledWith("app-canje:10.0.0.1", 10, 900_000, {
      fallarCerrado: true,
    });
  });

  it("un canje rechazado devuelve el error genérico, sin sesión", async () => {
    estado.canje = false;
    expect(await accionCanjearApp("c", "v")).toEqual({ error: true });
  });

  it("con el tope agotado (o la base caída) no intenta canjear", async () => {
    estado.permitido = false;
    expect(await accionCanjearApp("c", "v")).toEqual({ error: true });
  });

  it("volver a la app lleva el código por el esquema de la app", async () => {
    expect(await destino(accionVolverALaApp())).toBe(
      "REDIRECT:cl.opai.app://canje?codigo=codigo%2B1",
    );
  });

  it("sin el reto de la app no emite código", async () => {
    estado.reto = undefined;
    expect(await destino(accionVolverALaApp())).toBe("REDIRECT:/app/listo?error=1");
  });
});
