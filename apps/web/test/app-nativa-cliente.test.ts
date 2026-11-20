import { webcrypto } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";

import { escucharVueltaApp, iniciarGoogleEnApp, tomarVerificador } from "@/lib/app-nativa-cliente";

afterEach(() => vi.unstubAllGlobals());

function puente(Plugins: object) {
  vi.stubGlobal("window", { Capacitor: { Plugins } });
}

describe("puente nativo opcional al ingresar", () => {
  it("aísla fallos síncronos y rechazos al pedir el enlace inicial y suscribirse", async () => {
    const navegar = vi.fn();
    const getLaunchUrl = vi.fn(() => {
      throw new Error("sin App");
    });
    const addListener = vi.fn().mockRejectedValue(new Error("sin permisos"));
    puente({ App: { getLaunchUrl, addListener } });

    const limpiar = escucharVueltaApp(navegar);
    limpiar();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(getLaunchUrl).toHaveBeenCalledOnce();
    expect(addListener).toHaveBeenCalledOnce();
    expect(navegar).not.toHaveBeenCalled();
  });

  it("aísla un rechazo inicial y permite un retorno válido aunque falle cerrar Browser", async () => {
    const navegar = vi.fn();
    const close = vi.fn(() => {
      throw new Error("sin Browser");
    });
    const remove = vi.fn().mockRejectedValue(new Error("ya removido"));
    let abrir: ((e: { url: string }) => void) | undefined;
    puente({
      Browser: { close },
      App: {
        getLaunchUrl: vi.fn().mockRejectedValue(new Error("sin lanzamiento")),
        addListener: (_: string, callback: (e: { url: string }) => void) => {
          abrir = callback;
          return Promise.resolve({ remove });
        },
      },
    });

    const limpiar = escucharVueltaApp(navegar);
    abrir?.({ url: "cl.opai.app://canje.ejemplo.test?codigo=falso" });
    expect(navegar).not.toHaveBeenCalled();
    abrir?.({ url: "cl.opai.app://canje?codigo=ficticio%26otro%3D1" });
    expect(navegar).toHaveBeenCalledExactlyOnceWith("/app/canje?codigo=ficticio%26otro%3D1");
    expect(close).toHaveBeenCalledOnce();
    limpiar();
    abrir?.({ url: "cl.opai.app://canje?codigo=tardio" });
    await vi.waitFor(() => expect(remove).toHaveBeenCalledOnce());
    expect(navegar).toHaveBeenCalledOnce();
  });

  it("devuelve un fallo recuperable y descarta únicamente el verificador de la apertura rechazada", async () => {
    const valores = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      setItem: (k: string, v: string) => valores.set(k, v),
      getItem: (k: string) => valores.get(k) ?? null,
      removeItem: (k: string) => valores.delete(k),
    });
    vi.stubGlobal("crypto", webcrypto);
    vi.stubGlobal("location", { origin: "https://test.opai.cl" });
    const open = vi
      .fn()
      .mockRejectedValueOnce(new Error("sin Browser"))
      .mockResolvedValueOnce(undefined);
    puente({ Browser: { open } });

    await expect(iniciarGoogleEnApp()).resolves.toBe(false);
    expect(valores.size).toBe(0);
    await expect(iniciarGoogleEnApp()).resolves.toBe(true);
    const verificador = tomarVerificador();
    expect(verificador).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(tomarVerificador()).toBeNull();
    const hash = await webcrypto.subtle.digest("SHA-256", new TextEncoder().encode(verificador!));
    const reto = Buffer.from(hash).toString("base64url");
    expect(open).toHaveBeenLastCalledWith({ url: `https://test.opai.cl/app/google?reto=${reto}` });
  });
});
