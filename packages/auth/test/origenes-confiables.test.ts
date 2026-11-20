import { describe, expect, it } from "vitest";

import { origenesConfiables } from "../src/opciones";

describe("orígenes confiables del login", () => {
  it("admite producción y test por HTTPS aunque Better Auth tenga configurado test", () => {
    expect(
      origenesConfiables({ NODE_ENV: "production", BETTER_AUTH_URL: "https://test.opai.cl/" }),
    ).toEqual(["https://app.opai.cl", "https://test.opai.cl"]);
  });

  it("conserva el origen configurado para vistas previas y localhost solo en desarrollo", () => {
    expect(
      origenesConfiables({
        NODE_ENV: "development",
        BETTER_AUTH_URL: "https://preview.opai.cl:8443/api/auth",
      }),
    ).toEqual([
      "https://app.opai.cl",
      "https://test.opai.cl",
      "https://preview.opai.cl:8443",
      "http://localhost:3000",
    ]);
  });

  it.each(["https://*.opai.cl", "javascript:alert(1)", "no es una URL", undefined])(
    "no añade un patrón o una URL inválida a la lista de producción (%s)",
    (url) => {
      expect(origenesConfiables({ NODE_ENV: "production", BETTER_AUTH_URL: url })).toEqual([
        "https://app.opai.cl",
        "https://test.opai.cl",
      ]);
    },
  );
});
