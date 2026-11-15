// CAR-247 PR 2: apps conectadas por OAuth en Mi cuenta. Solo las de la persona en la empresa actual,
// sin tokens; desconectar es de personas (una app no desconecta apps), con vista previa y rastro.
import { beforeEach, describe, expect, it } from "vitest";

import { capacidadesDelNucleo } from "../src/core";
import { executeCapability } from "../src/execute";
import { limpiarRegistro, registrarCapacidades } from "../src/registry";
import { contextoDePrueba, TENANT_DE_PRUEBA, USUARIO_DE_PRUEBA } from "../src/testing";
import { semillaTenant, U2 } from "./semilla";

beforeEach(() => {
  limpiarRegistro();
  registrarCapacidades(capacidadesDelNucleo);
});

const YO = USUARIO_DE_PRUEBA.id;
const OTRA = "0192f3a0-0000-7000-8000-0000000000ee";
const consentimiento = (clientId: string, userId: string, referenceId: string) => ({
  id: `${clientId}-${userId}-${referenceId}`,
  clientId,
  userId,
  referenceId,
  scopes: ["mcp:leer", "offline_access"],
  createdAt: new Date("2026-11-11T12:00:00Z"),
});

function semilla() {
  return {
    ...semillaTenant("viewer"),
    oauthClient: [
      { clientId: "claude", name: "Claude", uri: "https://claude.ai", disabled: false },
      { clientId: "otra", name: "Otra app", uri: null, disabled: false },
    ],
    oauthConsent: [
      consentimiento("claude", YO, TENANT_DE_PRUEBA),
      consentimiento("otra", YO, OTRA),
      consentimiento("otra", U2, TENANT_DE_PRUEBA),
    ],
    oauthAccessToken: [
      {
        clientId: "claude",
        userId: YO,
        referenceId: TENANT_DE_PRUEBA,
        token: "HASH-NO-SALE",
        createdAt: new Date("2026-11-11T13:00:00Z"),
        revoked: null,
      },
    ],
  };
}

describe("core.apps_conectadas.*", () => {
  it("lista solo mis apps en esta empresa, con su último uso y sin tokens", async () => {
    const { ctx } = contextoDePrueba({ semilla: semilla() });
    const r = await executeCapability(ctx, "core.apps_conectadas.list", {});
    expect(r).toMatchObject({
      ok: true,
      data: {
        apps: [
          {
            clientId: "claude",
            nombre: "Claude",
            puedeEscribir: false,
            sigueConectada: true,
            ultimoUso: "2026-11-11T13:00:00.000Z",
          },
        ],
      },
    });
    expect(JSON.stringify(r)).not.toContain("HASH-NO-SALE");
  });

  it("desconectar tiene vista previa, corta los accesos y deja rastro", async () => {
    const { ctx, tabla } = contextoDePrueba({ semilla: semilla() });
    const vista = await executeCapability(
      ctx,
      "core.apps_conectadas.desconectar",
      { clientId: "claude" },
      { dryRun: true },
    );
    expect(vista).toMatchObject({ ok: true, dryRun: true });
    expect(tabla("oauthConsent")).toHaveLength(3);
    const r = await executeCapability(ctx, "core.apps_conectadas.desconectar", {
      clientId: "claude",
    });
    expect(r).toMatchObject({ ok: true, data: { desconectada: true } });
    expect(tabla("oauthConsent")).toHaveLength(2);
    expect(tabla("oauthAccessToken")[0]?.["revoked"]).toBeInstanceOf(Date);
    expect(tabla("eventoSeguridad")).toMatchObject([{ tipo: "seguridad.oauth.desconexion" }]);
    const ajena = await executeCapability(ctx, "core.apps_conectadas.desconectar", {
      clientId: "otra",
    });
    expect(ajena).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
  });

  it("una app o agente no desconecta apps: es de personas", async () => {
    const { ctx } = contextoDePrueba({
      semilla: semilla(),
      actor: { tipo: "agent", id: "k-1", viaUserId: YO },
    });
    const r = await executeCapability(ctx, "core.apps_conectadas.desconectar", {
      clientId: "claude",
    });
    expect(r).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
  });
});
