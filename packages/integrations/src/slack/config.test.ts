import { describe, expect, it } from "vitest";

import { urlAutorizacionSlack } from "./api";
import { slackConfigEfectiva, slackConfigSchema } from "./config";
import { SLACK_SCOPES_BOT } from "./manifiesto/manifiesto";

describe("configuración por empresa", () => {
  it("por defecto es lo mínimo aprobado por Carlos (11-nov-2026)", () => {
    expect(slackConfigSchema.parse({})).toEqual({
      canales: { general: null, panico: null, resumen: null },
      avisos: {
        atraso: true,
        ausencia: true,
        fueraDeZona: false,
        sinRelevo: false,
        incidentes: false,
        mensajesGuardias: false,
      },
      margenAtrasoMin: 15,
      panico: {
        alCanal: true,
        mensajeDirectoSupervisor: false,
        escalar: false,
        escalarMinutos: 5,
        escalarAGrupoId: null,
      },
      resumen: { activo: false },
    });
  });

  it("una guardada inválida vuelve al defecto y no rompe", () => {
    expect(slackConfigEfectiva({ margenAtrasoMin: -3 }).margenAtrasoMin).toBe(15);
    expect(slackConfigEfectiva(null).avisos.atraso).toBe(true);
    expect(slackConfigSchema.safeParse({ otra: 1 }).success).toBe(false);
  });

  it("la URL de autorización pide exactamente los scopes del manifiesto", () => {
    const u = new URL(
      urlAutorizacionSlack({
        clientId: "1.2",
        redirectUri: "https://test.opai.cl/cb",
        estado: "e",
      }),
    );
    expect(u.origin + u.pathname).toBe("https://slack.com/oauth/v2/authorize");
    expect(u.searchParams.get("scope")?.split(",").sort()).toEqual([...SLACK_SCOPES_BOT].sort());
    expect(u.searchParams.get("state")).toBe("e");
  });
});
