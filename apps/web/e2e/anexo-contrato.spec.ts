import { execFileSync } from "node:child_process";
import { expect, test } from "@playwright/test";
import { entrar, ocultarDev, password, sinDesborde, urlSiembra } from "./fixtures-puestos-car8";

const persona = "00000000-0000-7000-8000-000000000082";
const anexoId = "00000000-0000-7000-8000-0000000000a9";

function seed(script: string) {
  execFileSync("pnpm", ["--filter", "@opai/db", "exec", "tsx", `scripts/${script}`], {
    cwd: new URL("../../..", import.meta.url),
    env: { ...process.env, DATABASE_URL_MIGRATE: urlSiembra },
    stdio: "pipe",
  });
}

test.beforeAll(() => {
  if (
    !password ||
    !urlSiembra ||
    !["localhost", "127.0.0.1"].includes(new URL(urlSiembra).hostname)
  )
    throw new Error("Requiere e2e local");
  execFileSync(
    "pnpm",
    ["--filter", "@opai/auth", "exec", "tsx", "scripts/seed-nav-permisos-e2e.ts"],
    {
      cwd: new URL("../../..", import.meta.url),
      env: { ...process.env, DATABASE_URL_MIGRATE: urlSiembra, E2E_PASSWORD: password },
      stdio: "pipe",
    },
  );
  seed("seed-vinculo-jornada-e2e.ts");
  seed("seed-anexo-e2e.ts");
});

test("26-29: anexo en borrador, documento con antes/después y aprobación", async ({
  page,
}, info) => {
  test.setTimeout(180000);
  await entrar(page);
  await page.goto(`/personas/${persona}/anexos`);
  await ocultarDev(page);
  await expect(page.getByRole("link", { name: /Instalación o puesto/ })).toBeVisible();
  await expect(sinDesborde(page)).resolves.toBe(true);
  await page.screenshot({
    path: info.outputPath("26-lista-anexos.png"),
    fullPage: true,
    animations: "disabled",
  });
  await page.getByRole("link", { name: /Instalación o puesto/ }).click();
  await expect(page).toHaveURL(new RegExp(`/anexos/${anexoId}$`));
  await expect(page.getByText("Instalación navegación E2E")).toBeVisible();
  await expect(page.getByText("Destino vínculo E2E")).toBeVisible();
  await expect(sinDesborde(page)).resolves.toBe(true);
  await page.screenshot({
    path: info.outputPath("27-28-documento-borrador.png"),
    fullPage: true,
    animations: "disabled",
  });
  await page.evaluate(() => {
    document.documentElement.dataset["theme"] = "dark";
  });
  await page.screenshot({
    path: info.outputPath("27-documento-oscuro.png"),
    fullPage: true,
    animations: "disabled",
  });
  await page.evaluate(() => {
    document.documentElement.dataset["theme"] = "light";
  });
  // El almacenamiento (R2) no tiene credenciales en e2e local ni en CI (sin secretos en el
  // repositorio): aprobar falla con un mensaje claro en vez de generar el documento. El flujo
  // completo (documento final con SHA-256 y bitácora) ya se verifica contra Postgres real con
  // almacenamiento en memoria en `packages/capabilities/test/anexos-db.test.ts`.
  await page.getByRole("button", { name: "Aprobar", exact: true }).click();
  await expect(page.getByText("Almacenamiento no configurado en este entorno.")).toBeVisible();
  await page.screenshot({
    path: info.outputPath("29-aprobar-sin-almacenamiento.png"),
    fullPage: true,
    animations: "disabled",
  });
});

test("29: rechazar pide motivo obligatorio (D14)", async ({ page }, info) => {
  seed("seed-anexo-e2e.ts");
  await entrar(page);
  await page.goto(`/personas/${persona}/anexos/${anexoId}`);
  await ocultarDev(page);
  await page.getByRole("button", { name: "Rechazar", exact: true }).click();
  const dialogo = page.getByRole("dialog", { name: "Rechazar el anexo", exact: true });
  await expect(dialogo).toBeVisible();
  await expect(dialogo.getByRole("button", { name: "Rechazar", exact: true })).toBeDisabled();
  await dialogo.getByLabel("Motivo", { exact: true }).fill("No corresponde todavía");
  await page.screenshot({
    path: info.outputPath("29-rechazar-dialogo.png"),
    fullPage: true,
    animations: "disabled",
  });
  await dialogo.getByRole("button", { name: "Rechazar", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/personas/${persona}/anexos$`));
  await expect(page.getByText("rechazado")).toBeVisible();
});
