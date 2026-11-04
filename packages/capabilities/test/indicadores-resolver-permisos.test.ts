import { beforeEach, describe, expect, it } from "vitest";

import { capacidadesDelNucleo } from "../src/core";
import { executeCapability } from "../src/execute";
import { limpiarRegistro, registrarCapacidades } from "../src/registry";
import { contextoDePrueba, USUARIO_DE_PRUEBA } from "../src/testing";
import type { OpcionesPrueba } from "../src/testing/contexto";
import { semillaTenant } from "./semilla";

// CAR-183: aprobar un valor legal global solo lo hace una persona con platformRole owner.
// Soporte, owner de una empresa y keys (aunque su responsable sea owner de plataforma) quedan fuera.
const INPUT = { propuestaId: "0198a000-0000-7000-8000-000000000001", aprobar: true };
const OWNER = { ...USUARIO_DE_PRUEBA, platformRole: "owner" as const };

beforeEach(() => {
  limpiarRegistro();
  registrarCapacidades(capacidadesDelNucleo);
});

const ejecutar = (o: Partial<OpcionesPrueba>) =>
  executeCapability(
    contextoDePrueba({ semilla: semillaTenant(), ...o }).ctx,
    "platform.indicadores.resolver",
    INPUT,
  );

describe("platform.indicadores.resolver: quién puede aprobar", () => {
  it("el owner de una empresa sin platformRole no aprueba", async () => {
    expect(await ejecutar({ usuario: USUARIO_DE_PRUEBA })).toMatchObject({
      ok: false,
      error: { code: "FORBIDDEN" },
    });
  });

  it("soporte de plataforma no aprueba", async () => {
    const usuario = { ...USUARIO_DE_PRUEBA, platformRole: "support" as const };
    expect(await ejecutar({ usuario })).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
  });

  it("una key de agente no aprueba aunque su responsable sea owner de plataforma", async () => {
    const actor = { tipo: "agent" as const, id: "k-1", viaUserId: OWNER.id };
    const r = await ejecutar({
      actor,
      usuario: OWNER,
      scopes: ["*", "platform"],
      claveApi: { permisos: null, servicio: false, plataforma: true },
    });
    expect(r).toMatchObject({
      ok: false,
      error: { code: expect.stringMatching(/FORBIDDEN|APPROVAL_REQUIRED/) },
    });
  });
});
