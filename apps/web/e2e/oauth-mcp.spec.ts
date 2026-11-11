import { createHash, randomBytes } from "node:crypto";

import { type APIRequestContext, expect, type Page, test } from "@playwright/test";

import { capturar, EN_PREVIEW } from "./preview";
import { codigoTotp, E2E_EMAIL, E2E_PASSWORD as password } from "./sesion";

// Entrar a OPAI desde una app como Claude con la cuenta propia (CAR-247, ADR-098): la app se registra
// sola, la persona entra, elige empresa y autoriza; la app recibe un código y lo cambia por tokens.
// El callback de la app es un origen falso que la prueba intercepta: nada sale de la máquina.
const CALLBACK = "https://app-de-prueba.invalid/oauth/callback";

const cabeceras = (): Record<string, string> => {
  const secreto = process.env["VERCEL_AUTOMATION_BYPASS_SECRET"];
  return EN_PREVIEW && secreto ? { "x-vercel-protection-bypass": secreto } : {};
};

async function registrarApp(request: APIRequestContext): Promise<string> {
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
  return ((await r.json()) as { client_id: string }).client_id;
}

/** Sigue el flujo en pantalla hasta el consentimiento, pasando por login, MFA y empresa si aparecen. */
async function hastaAutorizar(page: Page, url: string): Promise<void> {
  await page.goto(url);
  await page.waitForURL((u) => ["/login", "/elegir-empresa", "/autorizar"].includes(u.pathname));
  if (new URL(page.url()).pathname === "/login") {
    // Se llega por redirección del proveedor: se espera a que el formulario hidrate antes de escribir.
    await page.waitForLoadState("networkidle");
    await page.getByLabel("Correo").fill(E2E_EMAIL);
    await expect(page.getByLabel("Correo")).toHaveValue(E2E_EMAIL);
    await page.getByLabel("Contraseña", { exact: true }).fill(password ?? "");
    await page.getByRole("button", { name: "Entrar" }).click();
    await page.waitForURL((u) => u.pathname !== "/login");
  }
  if (new URL(page.url()).pathname === "/mfa") {
    await page.getByLabel(/Código/).fill(await codigoTotp());
    await page.getByRole("button", { name: "Verificar" }).click();
  }
  const enOAuth = (u: URL) =>
    u.pathname === "/autorizar" ||
    (u.pathname === "/elegir-empresa" && u.searchParams.get("oauth") === "1");
  await page.waitForURL(enOAuth);
  if (new URL(page.url()).pathname === "/elegir-empresa") {
    await expect(page.getByText("Elige con qué empresa entrará la app")).toBeVisible();
    await page
      .getByRole("button")
      .filter({ hasText: /qa|QA|Demo|Gard|Empresa/ })
      .first()
      .click();
    await page.waitForURL((u) => u.pathname === "/autorizar");
  }
}

test.describe("@preview OAuth del MCP", () => {
  test.skip(!password, "Falta E2E_PASSWORD o SEED_OWNER_PASSWORD");

  test("una app entra con la cuenta de la persona y recibe tokens", async ({
    page,
    request,
  }, info) => {
    const errores: string[] = [];
    page.on("pageerror", (e) => errores.push(e.name));
    const meta = await request.get("/.well-known/oauth-protected-resource/api/mcp", {
      headers: cabeceras(),
    });
    const { resource } = (await meta.json()) as { resource: string };
    const clientId = await registrarApp(request);
    const verificador = randomBytes(32).toString("base64url");
    const desafio = createHash("sha256").update(verificador).digest("base64url");
    const q = new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      redirect_uri: CALLBACK,
      scope: "mcp:leer mcp:escribir offline_access",
      state: "estado-de-prueba",
      code_challenge: desafio,
      code_challenge_method: "S256",
      resource,
    });
    await hastaAutorizar(page, `/api/auth/oauth2/authorize?${q.toString()}`);
    await expect(
      page.getByRole("heading", { name: "Conectar App de prueba con OPAI" }),
    ).toBeVisible();
    await expect(page.getByText("Ver lo que tú ves")).toBeVisible();
    await capturar(page, info, "oauth-autorizar");

    let vuelta = "";
    await page.route(`${CALLBACK}**`, async (ruta) => {
      vuelta = ruta.request().url();
      await ruta.fulfill({ status: 200, contentType: "text/plain", body: "ok" });
    });
    await page.getByRole("button", { name: "Permitir" }).click();
    await expect.poll(() => vuelta).not.toBe("");
    const respuesta = new URL(vuelta).searchParams;
    expect(respuesta.get("state")).toBe("estado-de-prueba");
    const codigo = respuesta.get("code") ?? "";
    expect(codigo).not.toBe("");

    // La app canjea el código desde su servidor, sin las cookies del navegador.
    const token = await request.post("/api/auth/oauth2/token", {
      headers: cabeceras(),
      form: {
        grant_type: "authorization_code",
        code: codigo,
        redirect_uri: CALLBACK,
        client_id: clientId,
        code_verifier: verificador,
        resource,
      },
    });
    expect(token.status(), await token.text()).toBe(200);
    const cuerpo = (await token.json()) as { access_token?: string; refresh_token?: string };
    expect(cuerpo.access_token).toBeTruthy();
    expect(cuerpo.refresh_token).toBeTruthy();
    expect(errores).toEqual([]);
  });
});
