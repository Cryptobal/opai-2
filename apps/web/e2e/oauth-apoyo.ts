import { createHash, randomBytes } from "node:crypto";

import { type APIRequestContext, expect, type Page } from "@playwright/test";

import { EN_PREVIEW } from "./preview";

// Apoyo de los e2e del OAuth del MCP (CAR-247). El callback de la app es un origen falso que la
// prueba intercepta: nada sale de la máquina.
export const CALLBACK = "https://app-de-prueba.invalid/oauth/callback";

export const cabeceras = (): Record<string, string> => {
  const secreto = process.env["VERCEL_AUTOMATION_BYPASS_SECRET"];
  return EN_PREVIEW && secreto ? { "x-vercel-protection-bypass": secreto } : {};
};

export type Pedido = { url: string; clientId: string; verificador: string; resource: string };

/** Registra una app nueva (DCR) y arma su pedido de autorización con PKCE. */
export async function pedirAutorizacion(request: APIRequestContext): Promise<Pedido> {
  const meta = await request.get("/.well-known/oauth-protected-resource/api/mcp", {
    headers: cabeceras(),
  });
  const { resource } = (await meta.json()) as { resource: string };
  const r = await request.post("/api/auth/oauth2/register", {
    headers: cabeceras(),
    data: {
      client_name: "App de prueba",
      redirect_uris: [CALLBACK],
      token_endpoint_auth_method: "none",
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
    },
  });
  expect(r.status()).toBe(201);
  const clientId = ((await r.json()) as { client_id: string }).client_id;
  const verificador = randomBytes(32).toString("base64url");
  const q = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: CALLBACK,
    scope: "mcp:leer mcp:escribir offline_access",
    state: "estado-de-prueba",
    code_challenge: createHash("sha256").update(verificador).digest("base64url"),
    code_challenge_method: "S256",
    resource,
  });
  return { url: `/api/auth/oauth2/authorize?${q.toString()}`, clientId, verificador, resource };
}

/** Pulsa «Permitir» y devuelve el código con que la app vuelve a su callback. */
export async function permitir(page: Page): Promise<string> {
  let vuelta = "";
  await page.route(`${CALLBACK}**`, async (ruta) => {
    vuelta = ruta.request().url();
    await ruta.fulfill({ status: 200, contentType: "text/plain", body: "ok" });
  });
  await page.getByRole("button", { name: "Permitir" }).click();
  await expect.poll(() => vuelta).not.toBe("");
  const respuesta = new URL(vuelta).searchParams;
  expect(respuesta.get("state")).toBe("estado-de-prueba");
  return respuesta.get("code") ?? "";
}

/** La app canjea el código desde su servidor, sin las cookies del navegador. */
export const canjear = (request: APIRequestContext, p: Pedido, codigo: string) =>
  request.post("/api/auth/oauth2/token", {
    headers: cabeceras(),
    form: {
      grant_type: "authorization_code",
      code: codigo,
      redirect_uri: CALLBACK,
      client_id: p.clientId,
      code_verifier: p.verificador,
      resource: p.resource,
    },
  });
