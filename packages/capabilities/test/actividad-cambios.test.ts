import { beforeEach, expect, it } from "vitest";

import {
  capacidadesDelNucleo,
  executeCapability,
  limpiarRegistro,
  registrarCapacidades,
} from "../src";
import { contextoDePrueba } from "../src/testing";

beforeEach(() => {
  limpiarRegistro();
  registrarCapacidades(capacidadesDelNucleo);
});

it.each(["persona", "agente"] as const)(
  "Inicio filtra lecturas antes del límite: %s",
  async (actor) => {
    const { ctx } = contextoDePrueba({
      ...(actor === "agente"
        ? {
            actor: {
              tipo: "agent",
              id: "0192f3a0-0000-7000-8000-0000000000b1",
              viaUserId: "0192f3a0-0000-7000-8000-0000000000a1",
            },
          }
        : {}),
    });
    const creada = await executeCapability(ctx, "core.cuentas.create", {
      nombre: "Cuenta ficticia",
    });
    expect(creada.ok).toBe(true);
    // Las propias lecturas auditadas son más recientes que la escritura.
    await executeCapability(ctx, "core.actividad.list", {});
    await executeCapability(ctx, "core.actividad.list", {});
    const feed = await executeCapability(ctx, "core.actividad.list", { actor, limite: 1 });
    expect(feed).toMatchObject({
      ok: true,
      data: {
        items: [{ capability: "core.cuentas.create", accion: "creó la cuenta Cuenta ficticia" }],
        siguiente: null,
      },
    });
    if (feed.ok) expect((feed.data as { items: unknown[] }).items).toHaveLength(1);
  },
);
