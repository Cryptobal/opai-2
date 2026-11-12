import { describe, expect, it } from "vitest";

import { urlAutorizacionSlack } from "./api";
import {
  fusionarSlackConfig,
  SLACK_CONFIG_DEFECTO,
  slackConfigEfectiva,
  slackConfigParcialSchema,
  slackConfigSchema,
} from "./config";
import { SLACK_SCOPES_BOT } from "./manifiesto/manifiesto";

describe("configuración por empresa", () => {
  it("por defecto es lo mínimo aprobado por Carlos (11-nov-2026)", () => {
    expect(slackConfigEfectiva({})).toEqual({
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
    expect(slackConfigParcialSchema.safeParse({ token: "xoxb-1" }).success).toBe(false);
  });

  it("un cambio parcial solo toca lo que trae", () => {
    const base = fusionarSlackConfig(SLACK_CONFIG_DEFECTO, {
      canales: { general: { id: "C0ALERTAS1", nombre: "alertas" } },
    });
    const r = fusionarSlackConfig(base, { margenAtrasoMin: 20, panico: { escalar: true } });
    expect(r.canales.general?.id).toBe("C0ALERTAS1");
    expect(r.margenAtrasoMin).toBe(20);
    expect(r.panico).toMatchObject({ escalar: true, alCanal: true, escalarMinutos: 5 });
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
