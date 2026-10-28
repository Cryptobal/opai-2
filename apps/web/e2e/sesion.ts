import { createOTP } from "@better-auth/utils/otp";
import { type Page } from "@playwright/test";

import { ocultarIndicadorDev } from "./indicador-dev";

// Login compartido de los e2e. Desde NÚCLEO-F el owner de e2e tiene segundo factor obligatorio
// (cuenta de plataforma), así que el login pasa por /mfa; el TOTP se genera aquí con el MISMO secreto
// crudo que siembra `packages/auth/scripts/seed-e2e-mfa.ts`. No es un secreto real.
export const E2E_EMAIL = process.env["E2E_EMAIL"] ?? "carlos.irigoyen@opai.cl";
export const E2E_PASSWORD = process.env["E2E_PASSWORD"] ?? process.env["SEED_OWNER_PASSWORD"];
const E2E_MFA_SECRET_RAW = "opai-e2e-mfa-secreto-fijo-000000";

/** Código TOTP actual del owner de e2e (segundo factor sembrado con secreto fijo). */
export const codigoTotp = () => createOTP(E2E_MFA_SECRET_RAW, { digits: 6, period: 30 }).totp();

/** Entra con el owner de e2e: contraseña y, como tiene segundo factor, el código TOTP. */
export async function entrar(page: Page, email = E2E_EMAIL): Promise<void> {
  await ocultarIndicadorDev(page.context());
  await page.goto("/login");
  await page.getByLabel("Correo").fill(email);
  await page.getByLabel("Contraseña", { exact: true }).fill(E2E_PASSWORD ?? "");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL((url) =>
    ["/mfa", "/", "/platform", "/elegir-empresa", "/supervisor"].includes(url.pathname),
  );
  if (new URL(page.url()).pathname === "/mfa") {
    await page.getByLabel(/Código/).fill(await codigoTotp());
    await page.getByRole("button", { name: "Verificar" }).click();
    await page.waitForURL((url) => url.pathname !== "/mfa");
  }
}
