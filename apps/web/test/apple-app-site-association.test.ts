import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { describe, expect, it } from "vitest";

import { GET } from "../app/.well-known/apple-app-site-association/route";
import { config } from "../proxy";

const ruta = "/.well-known/apple-app-site-association";

describe("asociación de credenciales de OPAI en iOS", () => {
  it("sirve el JSON exacto y ningún destino de redirección", async () => {
    const respuesta = GET();
    expect(respuesta.status).toBe(200);
    expect(respuesta.headers.get("content-type")).toBe("application/json");
    expect(respuesta.headers.get("location")).toBeNull();
    expect(await respuesta.text()).toBe('{"webcredentials":{"apps":["PRG52N5SNA.cl.opai.app"]}}');
  });

  it("deja el archivo público sin abrir el portal al proxy", () => {
    expect(unstable_doesMiddlewareMatch({ config, nextConfig: {}, url: ruta })).toBe(false);
    expect(unstable_doesMiddlewareMatch({ config, nextConfig: {}, url: "/trabajador/marcar" })).toBe(true);
  });
});
