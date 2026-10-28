import { execFileSync } from "node:child_process";
import { expect, test } from "@playwright/test";
import { hidratado } from "./hidratacion";
import { entrar, ocultarDev, password, sinDesborde, urlPropietario } from "./fixtures-puestos-car8";

const persona = "00000000-0000-7000-8000-000000000082";
const anexoId = "00000000-0000-7000-8000-0000000000a9";

// El rechazo es la única escritura: cada proyecto rechaza su propio anexo (si los proyectos corren
// en paralelo, uno no deja al otro sin el borrador que espera).
const anexoRechazo: Record<string, string> = {
  telefono: "00000000-0000-7000-8000-0000000000aa",
  ipad: "00000000-0000-7000-8000-0000000000ab",
  desktop: "00000000-0000-7000-8000-0000000000ac",
};

function seed(script: string, anexo?: string) {
  execFileSync("pnpm", ["--filter", "@opai/db", "exec", "tsx", `scripts/${script}`], {
    cwd: new URL("../../..", import.meta.url),
    env: {
      ...process.env,
      DATABASE_URL_MIGRATE: urlPropietario,
      ...(anexo ? { ANEXO_E2E_ID: anexo } : {}),
    },
    stdio: "pipe",
  });
}

test.beforeAll(() => {
  if (
    !password ||
    !urlPropietario ||
    !["localhost", "127.0.0.1"].includes(new URL(urlPropietario).hostname)
  )
    throw new Error("Requiere e2e local");
  execFileSync(
    "pnpm",
    ["--filter", "@opai/auth", "exec", "tsx", "scripts/seed-nav-permisos-e2e.ts"],
    {
      cwd: new URL("../../..", import.meta.url),
      env: { ...process.env, DATABASE_URL_MIGRATE: urlPropietario, E2E_PASSWORD: password },
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
  // Cada proyecto parte del anexo sembrado en borrador (el de otro proyecto pudo rechazarlo).
  seed("seed-anexo-e2e.ts");
  await entrar(page);
  await page.goto(`/personas/${persona}/anexos`);
  await ocultarDev(page);
  // La persona puede tener otros anexos (los que genera el cambio de vínculo de vinculo-jornada):
  // se elige el sembrado por su enlace.
  const sembrado = page.locator(`a[href$="/anexos/${anexoId}"]`);
  await expect(sembrado).toBeVisible();
  await expect(sembrado).toContainText("Instalación o puesto");
  await expect(sinDesborde(page)).resolves.toBe(true);
  await page.screenshot({
    path: info.outputPath("26-lista-anexos.png"),
    fullPage: true,
    animations: "disabled",
  });
  await sembrado.click();
  // La primera visita compila la ruta del detalle en dev: más que los 5 s por defecto.
  await expect(page).toHaveURL(new RegExp(`/anexos/${anexoId}$`), { timeout: 30_000 });
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
  await hidratado(page.getByRole("button", { name: "Aprobar", exact: true }));
  await page.getByRole("button", { name: "Aprobar", exact: true }).click();
  const confirmacion = page.getByRole("dialog", { name: "Aprobar el anexo" });
  await expect(confirmacion).toBeVisible();
  await confirmacion.getByRole("button", { name: "Cancelar" }).click();
  await expect(confirmacion).not.toBeVisible();
  await page.getByRole("button", { name: "Aprobar", exact: true }).click();
  await confirmacion.getByRole("button", { name: "Aprobar", exact: true }).click();
  await expect(page.getByText("Almacenamiento no configurado en este entorno.")).toBeVisible();
  await page.screenshot({
    path: info.outputPath("29-aprobar-sin-almacenamiento.png"),
    fullPage: true,
    animations: "disabled",
  });
});

test("29: rechazar pide motivo obligatorio (D14)", async ({ page }, info) => {
  const rechazo = anexoRechazo[info.project.name] ?? anexoRechazo["telefono"]!;
  seed("seed-anexo-e2e.ts", rechazo);
  await entrar(page);
  await page.goto(`/personas/${persona}/anexos/${rechazo}`);
  await ocultarDev(page);
  await hidratado(page.getByRole("button", { name: "Rechazar", exact: true }));
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
  // El rechazo ya quedó (aviso «Anexo rechazado»); la vuelta a la lista puede compilar la ruta.
  await expect(page).toHaveURL(new RegExp(`/personas/${persona}/anexos$`), { timeout: 30_000 });
  // Otros proyectos rechazan su propio anexo: se mira la fila de este.
  await expect(page.locator(`a[href$="/anexos/${rechazo}"]`)).toContainText("rechazado", {
    ignoreCase: true,
  });
});

test("el anexo no aparece bajo otra persona", async ({ page }) => {
  await entrar(page);
  await page.goto(`/personas/00000000-0000-7000-8000-000000000083/anexos/${anexoId}`);
  await expect(page.getByText("Instalación navegación E2E")).not.toBeVisible();
});
