import { afterEach, describe, expect, it, vi } from "vitest";

import { mailerConsola, mailerDelEntorno } from "./index";

describe("mailer", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("sin RESEND_API_KEY usa la consola y escribe el enlace en el log", async () => {
    const lineas: string[] = [];
    await mailerConsola((l) => lineas.push(l)).enviar({
      para: "a@b.cl",
      asunto: "Invitación",
      texto: "https://test.opai.cl/invitacion/gard/abc",
    });
    expect(mailerDelEntorno({}).nombre).toBe("consola");
    expect(lineas[0]).toContain("https://test.opai.cl/invitacion/gard/abc");
  });

  it("con RESEND_API_KEY llama a la API de Resend y falla si responde error", async () => {
    const fetch = vi.fn(async () => new Response("{}", { status: 422 }));
    vi.stubGlobal("fetch", fetch);
    const mailer = mailerDelEntorno({ RESEND_API_KEY: "re_x", EMAIL_FROM: "OPAI <a@opai.cl>" });
    expect(mailer.nombre).toBe("resend");
    await expect(mailer.enviar({ para: "a@b.cl", asunto: "x", texto: "y" })).rejects.toThrow(/422/);
    expect(fetch).toHaveBeenCalledWith("https://api.resend.com/emails", expect.anything());
  });
});
