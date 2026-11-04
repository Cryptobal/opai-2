import { afterEach, describe, expect, it, vi } from "vitest";

import { CorreoNoConfigurado, mailerConsola, mailerDelEntorno } from "./index";

const TOKEN = "Zx9aQ2bW7cE4dR1fT6gY3hU8";
const CORREO = {
  para: "ana.perez@empresa.cl",
  asunto: "Invitación",
  texto: `Entra en https://test.opai.cl/invitacion/gard/${TOKEN} o en https://test.opai.cl/api/auth/reset-password/${TOKEN}?callbackURL=%2Fnueva`,
};

describe("mailer", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("en desarrollo sin RESEND_API_KEY usa la consola sin el destinatario completo ni el token", async () => {
    const lineas: string[] = [];
    const info = vi.spyOn(console, "info").mockImplementation((l: string) => void lineas.push(l));
    const mailer = mailerDelEntorno({ NODE_ENV: "development" });
    expect(mailer.nombre).toBe("consola");
    await mailer.enviar(CORREO);
    info.mockRestore();
    expect(lineas).toHaveLength(1);
    expect(lineas[0]).toContain("a***@empresa.cl");
    expect(lineas[0]).toContain("https://test.opai.cl/invitacion/gard/[oculto]");
    expect(lineas[0]).toContain("/reset-password/[oculto]");
    expect(lineas[0]).not.toContain(TOKEN);
    expect(lineas[0]).not.toContain("ana.perez");
  });

  it.each([
    { VERCEL_ENV: "production" },
    { VERCEL_ENV: "preview" },
    { NODE_ENV: "production" },
  ])("en un entorno desplegado (%o) sin RESEND_API_KEY falla cerrado y no escribe nada", async (env) => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const mailer = mailerDelEntorno(env);
    expect(mailer.nombre).toBe("no-configurado");
    const error = await mailer.enviar(CORREO).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(CorreoNoConfigurado);
    expect(String(error)).toMatch(/RESEND_API_KEY/);
    expect(String(error)).not.toContain(TOKEN);
    expect(String(error)).not.toContain(CORREO.para);
    expect(info).not.toHaveBeenCalled();
    info.mockRestore();
  });

  it("la consola usada directamente tampoco escribe en un entorno desplegado", async () => {
    const lineas: string[] = [];
    const mailer = mailerConsola((l) => lineas.push(l), { VERCEL_ENV: "production" });
    await expect(mailer.enviar(CORREO)).rejects.toBeInstanceOf(CorreoNoConfigurado);
    expect(lineas).toHaveLength(0);
  });

  it("con RESEND_API_KEY llama a la API de Resend y falla si responde error", async () => {
    const fetch = vi.fn(async () => new Response("{}", { status: 422 }));
    vi.stubGlobal("fetch", fetch);
    const mailer = mailerDelEntorno({
      RESEND_API_KEY: "re_x",
      EMAIL_FROM: "OPAI <a@opai.cl>",
      VERCEL_ENV: "production",
    });
    expect(mailer.nombre).toBe("resend");
    await expect(mailer.enviar({ para: "a@b.cl", asunto: "x", texto: "y" })).rejects.toThrow(/422/);
    expect(fetch).toHaveBeenCalledWith("https://api.resend.com/emails", expect.anything());
  });

  it("Resend recibe los adjuntos en base64 y la copia a los demás contactos", async () => {
    const fetch = vi.fn(async (_url: string, _init: RequestInit) => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetch);
    const mailer = mailerDelEntorno({ RESEND_API_KEY: "re_x", EMAIL_FROM: "OPAI <a@opai.cl>" });
    await mailer.enviar({
      para: "a@b.cl",
      cc: ["c@d.cl"],
      asunto: "Factura 123",
      texto: "Adjuntamos la factura.",
      adjuntos: [{ nombre: "factura-123.pdf", contenidoBase64: "QUJD", mime: "application/pdf" }],
    });
    const cuerpo = JSON.parse(String(fetch.mock.calls[0]?.[1].body)) as Record<string, unknown>;
    expect(cuerpo["cc"]).toEqual(["c@d.cl"]);
    expect(cuerpo["attachments"]).toEqual([{ filename: "factura-123.pdf", content: "QUJD" }]);
  });
});
