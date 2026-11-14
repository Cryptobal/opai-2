import { describe, expect, it } from "vitest";

import { esAppNativa } from "@/lib/app-nativa";
import { mensajePush } from "@/app/(trabajador)/trabajador/_componentes/suscripcion-push";

// Brief 17: la web reconoce que está dentro de la app nativa por su user agent.
describe("esAppNativa", () => {
  it("reconoce las dos variantes", () => {
    expect(esAppNativa("Mozilla/5.0 (Linux; Android 15) Chrome/140 Mobile OPAIApp/opai")).toBe(
      true,
    );
    expect(
      esAppNativa("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0) Mobile/15E148 OPAIApp/terreno"),
    ).toBe(true);
  });

  it("un navegador normal no es la app", () => {
    expect(esAppNativa("Mozilla/5.0 (iPhone) Version/18.0 Mobile/15E148 Safari/604.1")).toBe(false);
    expect(esAppNativa("OPAIApp/")).toBe(false);
  });

  it("dentro de la app no pide agregar a la pantalla de inicio", () => {
    expect(mensajePush("app")).toMatch(/campana/);
    expect(mensajePush("app")).not.toMatch(/pantalla de inicio/);
  });
});
