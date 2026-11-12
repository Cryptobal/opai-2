import { expect, type Page, test } from "@playwright/test";

import { cabeceras, canjear, pedirAutorizacion, permitir } from "./oauth-apoyo";
import { capturar, pasarProteccionDeVercel } from "./preview";
import { codigoTotp, E2E_EMAIL, E2E_PASSWORD as password } from "./sesion";

// Entrar a OPAI desde una app como Claude con la cuenta propia (CAR-247, ADR-098): la app se registra
// sola, la persona entra, elige empresa y autoriza; la app recibe un código y lo cambia por tokens.

/** Sigue el flujo en pantalla hasta el consentimiento, pasando por login, MFA y empresa si aparecen. */
async function hastaAutorizar(page: Page, url: string): Promise<void> {
  // En la vista previa, el navegador también necesita pasar la protección de Vercel.
  await pasarProteccionDeVercel(page);
  await page.goto(url);
  await page.waitForURL((u) => ["/login", "/elegir-empresa", "/autorizar"].includes(u.pathname));
  if (new URL(page.url()).pathname === "/login") {
    // Se llega por redirección del proveedor: se espera a que el formulario hidrate antes de escribir.
    await page.waitForLoadState("networkidle");
    await page.getByLabel("Correo").fill(E2E_EMAIL);
    await expect(page.getByLabel("Correo")).toHaveValue(E2E_EMAIL);
    await page.getByLabel("Contraseña", { exact: true }).fill(password ?? "");
    await page.getByRole("button", { name: "Entrar", exact: true }).click();
    await page.waitForURL((u) => u.pathname !== "/login");
  }
  if (new URL(page.url()).pathname === "/mfa") {
    await page.getByLabel(/Código/).fill(await codigoTotp());
    await page.getByRole("button", { name: "Verificar" }).click();
  }
  const enOAuth = (u: URL) => u.pathname === "/autorizar" || u.pathname === "/autorizar/empresa";
  await page.waitForURL(enOAuth);
  if (new URL(page.url()).pathname === "/autorizar/empresa") {
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
    const pedido = await pedirAutorizacion(request);
    await hastaAutorizar(page, pedido.url);
    await expect(
      page.getByRole("heading", { name: "Conectar App de prueba con OPAI" }),
    ).toBeVisible();
    await expect(page.getByText("Ver lo que tú ves")).toBeVisible();
    await capturar(page, info, "oauth-autorizar");

    const codigo = await permitir(page);
    expect(codigo).not.toBe("");
    const token = await canjear(request, pedido, codigo);
    expect(token.status(), await token.text()).toBe(200);
    const cuerpo = (await token.json()) as { access_token?: string; refresh_token?: string };
    expect(cuerpo.access_token).toBeTruthy();
    expect(cuerpo.refresh_token).toBeTruthy();

    // Con el token, la app usa el MCP como la persona; sin token válido, se le indica cómo entrar.
    const mcp = (bearer: string, cuerpoRpc: object = { method: "tools/list", params: {} }) =>
      request.post("/api/mcp", {
        headers: {
          ...cabeceras(),
          authorization: `Bearer ${bearer}`,
          accept: "application/json, text/event-stream",
        },
        data: { jsonrpc: "2.0", id: 1, ...cuerpoRpc },
      });
    const lista = await mcp(cuerpo.access_token ?? "");
    expect(lista.status()).toBe(200);
    expect(await lista.text()).toContain("core_me");
    const yo = await mcp(cuerpo.access_token ?? "", {
      method: "tools/call",
      params: { name: "core_me", arguments: {} },
    });
    const textoYo = await yo.text();
    expect(textoYo).toContain("oauth:");
    expect(textoYo).not.toContain('"isError":true');
    const malo = await mcp("token-que-no-existe");
    expect(malo.status()).toBe(401);
    expect(malo.headers()["www-authenticate"]).toContain("resource_metadata=");

    // El refresh rota: la app sigue conectada sin volver a pedir la contraseña.
    const renovado = await request.post("/api/auth/oauth2/token", {
      headers: cabeceras(),
      form: {
        grant_type: "refresh_token",
        refresh_token: cuerpo.refresh_token ?? "",
        client_id: pedido.clientId,
        resource: pedido.resource,
      },
    });
    expect(renovado.status(), await renovado.text()).toBe(200);
    expect(errores).toEqual([]);
  });
});
