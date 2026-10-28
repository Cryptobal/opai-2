import { afterEach, describe, expect, it, vi } from "vitest";

import { detalleDeCuerpo, sanear } from "./error-proveedor";
import { ErrorIa } from "./http";
import { proveedorIa } from "./proveedores";

afterEach(() => vi.unstubAllGlobals());

const KEY = "sk-ant-api03-SECRETA-de-prueba-0123456789";
const cuerpoAnthropic = (mensaje: string) =>
  JSON.stringify({
    type: "error",
    error: { type: "invalid_request_error", message: mensaje },
    request_id: "req_011",
  });

describe("detalle del error del proveedor", () => {
  it("Anthropic 400: muestra tipo y mensaje del proveedor, sin la key", async () => {
    const fetch = vi.fn(
      async (_url: string, _init: RequestInit) =>
        new Response(
          cuerpoAnthropic("Your credit balance is too low to access the Anthropic API."),
          {
            status: 400,
          },
        ),
    );
    vi.stubGlobal("fetch", fetch);
    const promesa = proveedorIa("ia_anthropic", KEY).completar("claude-haiku-5-5", { prompt: "x" });
    await expect(promesa).rejects.toThrow(
      "Anthropic respondió 400: invalid_request_error · Your credit balance is too low to access the Anthropic API.",
    );
    const error = await promesa.catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ErrorIa);
    expect((error as ErrorIa).estado).toBe(400);
    expect((error as ErrorIa).reintentable).toBe(false);
    // El request de prueba sigue el contrato vigente de /v1/messages.
    const [url, init] = fetch.mock.calls[0] ?? ["", {}];
    expect(url).toBe("https://api.anthropic.com/v1/messages");
    expect(init.headers).toMatchObject({ "anthropic-version": "2023-06-01", "x-api-key": KEY });
    const enviado = JSON.parse(String(init.body)) as Record<string, unknown>;
    expect(enviado).toMatchObject({ model: "claude-haiku-5-5", stream: false });
    expect(enviado).not.toHaveProperty("temperature");
  });

  it("si el proveedor repite la key o algo con forma de credencial, se reemplaza", () => {
    const detalle = detalleDeCuerpo(
      cuerpoAnthropic(
        `invalid x-api-key: ${KEY} (otra sk-proj-abcdefghijklmnopqrstu, Bearer abc.def)`,
      ),
      KEY,
    );
    expect(detalle).toBe(
      "invalid_request_error · invalid x-api-key: [clave] (otra [clave], [clave])",
    );
    expect(sanear(`a\n\tb ${"x".repeat(400)}`)).toHaveLength(300);
  });

  it("OpenAI y Google: lee su forma de error; un cuerpo que no es JSON no se muestra", () => {
    expect(
      detalleDeCuerpo(JSON.stringify({ error: { message: "Incorrect API key", type: "auth" } })),
    ).toBe("auth · Incorrect API key");
    expect(
      detalleDeCuerpo(
        JSON.stringify({
          error: { code: 400, message: "API key not valid", status: "INVALID_ARGUMENT" },
        }),
      ),
    ).toBe("INVALID_ARGUMENT · API key not valid");
    expect(detalleDeCuerpo("<html>502 Bad Gateway</html>")).toBeUndefined();
    expect(detalleDeCuerpo(JSON.stringify({ ok: false }))).toBeUndefined();
  });
});
