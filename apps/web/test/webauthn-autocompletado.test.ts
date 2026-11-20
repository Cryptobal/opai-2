import { afterEach, describe, expect, it, vi } from "vitest";

import { soportaAutocompletado } from "@/app/_components/webauthn";

const { probe } = vi.hoisted(() => ({ probe: vi.fn<() => Promise<boolean>>() }));
vi.mock("@simplewebauthn/browser", () => ({ browserSupportsWebAuthnAutofill: probe }));

afterEach(() => {
  vi.unstubAllGlobals();
  probe.mockReset();
});

describe("sondeo de mediación condicional al montar el ingreso", () => {
  it("trata una API ausente o un getter problemático como no compatible", async () => {
    vi.stubGlobal("window", {});
    await expect(soportaAutocompletado()).resolves.toBe(false);
    vi.stubGlobal("window", {
      get PublicKeyCredential() {
        throw new Error("API inaccesible");
      },
    });
    await expect(soportaAutocompletado()).resolves.toBe(false);
    expect(probe).not.toHaveBeenCalled();
  });

  it("aísla tanto un lanzamiento síncrono como un rechazo de WKWebView", async () => {
    vi.stubGlobal("window", { PublicKeyCredential: function PublicKeyCredential() {} });
    probe.mockImplementationOnce(() => {
      throw new Error("API sin mediación");
    });
    probe.mockRejectedValueOnce(new Error("mediación rechazada"));
    probe.mockResolvedValueOnce(true);
    await expect(soportaAutocompletado()).resolves.toBe(false);
    await expect(soportaAutocompletado()).resolves.toBe(false);
    await expect(soportaAutocompletado()).resolves.toBe(true);
  });
});
