import { describe, expect, it } from "vitest";

import { consultaDe, destinoContinuarOAuth, esContinuarOAuth } from "@/app/(auth)/oauth-consulta";

describe("consulta OAuth en las pantallas de acceso", () => {
  it("rearma la consulta firmada conservando claves repetidas y sin las propias de la pantalla", () => {
    const q = consultaDe(
      { client_id: "c1", ba_param: ["client_id", "exp"], sig: "s", oauth: "1" },
      ["oauth"],
    );
    expect(q).toBe("client_id=c1&ba_param=client_id&ba_param=exp&sig=s");
  });

  it("solo arma el destino de reanudar cuando la consulta trae firma", () => {
    expect(destinoContinuarOAuth({ next: "/inicio" })).toBeNull();
    expect(destinoContinuarOAuth({ client_id: "c1", sig: "s" })).toBe(
      "/autorizar/continuar?client_id=c1&sig=s",
    );
  });

  it("reconoce el destino de reanudar y nada más", () => {
    expect(esContinuarOAuth("/autorizar/continuar?client_id=c1&sig=s")).toBe(true);
    expect(esContinuarOAuth("/autorizar/continuarx")).toBe(false);
    expect(esContinuarOAuth("/inicio")).toBe(false);
  });
});
