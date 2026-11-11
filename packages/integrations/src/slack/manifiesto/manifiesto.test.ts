import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  SLACK_EVENTOS_BOT,
  SLACK_HOSTS,
  SLACK_RUTAS,
  SLACK_SCOPES_BOT,
  manifiestoSlackSchema,
  type ManifiestoSlack,
} from "./manifiesto";

const leer = (archivo: string) => readFileSync(join(import.meta.dirname, archivo), "utf8");

const CASOS = [
  { archivo: "opai.json", host: SLACK_HOSTS.produccion },
  { archivo: "opai-pruebas.json", host: SLACK_HOSTS.pruebas },
] as const;

/** Lo que no puede cambiar entre la app distribuida y la de pruebas. */
const sinIdentidad = (m: ManifiestoSlack) => ({
  scopes: m.oauth_config.scopes,
  eventos: m.settings.event_subscriptions.bot_events,
  appHome: m.features.app_home,
  ajustes: {
    ...m.settings,
    event_subscriptions: undefined,
    interactivity: m.settings.interactivity.is_enabled,
  },
});

describe.each(CASOS)("manifiesto de Slack $archivo (ADR-093)", ({ archivo, host }) => {
  const texto = leer(archivo);
  const m = manifiestoSlackSchema.parse(JSON.parse(texto));

  it("pide exactamente los scopes mínimos del bot, sin scopes de usuario", () => {
    expect([...m.oauth_config.scopes.bot].sort()).toEqual([...SLACK_SCOPES_BOT].sort());
    expect(m.oauth_config.scopes.bot).not.toContain("chat:write.public");
  });

  it("se suscribe solo a los eventos previstos", () => {
    expect([...m.settings.event_subscriptions.bot_events].sort()).toEqual(
      [...SLACK_EVENTOS_BOT].sort(),
    );
  });

  it("apunta solo a las rutas de OPAI de su host, por HTTPS", () => {
    const base = `https://${host}`;
    expect(m.oauth_config.redirect_urls).toEqual([base + SLACK_RUTAS.oauth]);
    expect(m.settings.event_subscriptions.request_url).toBe(base + SLACK_RUTAS.eventos);
    expect(m.settings.interactivity.request_url).toBe(base + SLACK_RUTAS.acciones);
  });

  it("no contiene secretos ni identificadores de un espacio de Slack", () => {
    expect(texto).not.toMatch(
      /xox[abposr]-|xapp-|client_secret|signing_secret|verification_token/i,
    );
    expect(texto).not.toMatch(/\bT0[A-Z0-9]{8,}\b/);
  });
});

describe("app distribuida y app de pruebas", () => {
  it("solo difieren en el nombre y las URLs", () => {
    const [prod, pruebas] = CASOS.map(({ archivo }) =>
      manifiestoSlackSchema.parse(JSON.parse(leer(archivo))),
    );
    expect(sinIdentidad(pruebas!)).toEqual(sinIdentidad(prod!));
  });
});
