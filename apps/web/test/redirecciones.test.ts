import { describe, expect, it } from "vitest";

import config from "../next.config";

describe("redirecciones de altas abiertas a mano", () => {
  it("/personas/nueva lleva al formulario de la lista, no a una ficha con id «nueva»", async () => {
    const reglas = (await config.redirects?.()) ?? [];
    const de = (origen: string) => reglas.find((r) => r.source === origen);
    expect(de("/personas/nueva")).toMatchObject({
      destination: "/personas?nueva=1",
      permanent: false,
    });
    expect(de("/cuentas/nueva")?.destination).toBe("/cuentas?nueva=1");
    expect(de("/cargos/nuevo")?.destination).toBe("/cargos?nuevo=1");
  });
});
