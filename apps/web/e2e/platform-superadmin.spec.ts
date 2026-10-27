import { expect, test } from "@playwright/test";

const password = process.env["E2E_PASSWORD"] ?? process.env["SEED_OWNER_PASSWORD"];

test.describe("regresión Plataforma tras #59", () => {
  test.beforeEach(() => {
    if (!password) throw new Error("Falta E2E_PASSWORD o SEED_OWNER_PASSWORD");
  });

  for (const autorizado of [true, false]) {
    test(`${autorizado ? "superadmin ve Empresas" : "sin rol global ve el aviso y conserva el shell"}`, async ({
      page,
    }, info) => {
      test.setTimeout(180_000);
      await page.goto("/login");
      await page
        .getByLabel("Correo")
        .fill(
          autorizado
            ? (process.env["E2E_EMAIL"] ?? "carlos.irigoyen@opai.cl")
            : (process.env["E2E_SELECTOR_EMAIL"] ?? "e2e-selector@opai.cl"),
        );
      await page.getByLabel("Contraseña", { exact: true }).fill(password ?? "");
      await page.getByRole("button", { name: "Entrar" }).click();
      await page.waitForURL((url) => !url.pathname.startsWith("/login"));
      if (new URL(page.url()).pathname === "/elegir-empresa") {
        await page.getByRole("button", { name: /Gard Security/ }).click();
      }
      await page.goto("/platform");
      await expect(page.getByRole("banner").first()).toBeVisible();
      const nav = page.getByRole("navigation", { name: "Principal" });
      await expect(nav.first()).toBeVisible();
      if (autorizado) {
        await expect(page.getByRole("heading", { name: "Empresas", exact: true })).toBeVisible();
        await expect(
          page
            .getByRole("main")
            .getByText("Gard Security", { exact: true })
            .filter({ visible: true })
            .first(),
        ).toBeVisible();
        await expect(
          page.getByText("Plataforma es solo para el equipo de OPAI."),
        ).toHaveCount(0);
      } else {
        await expect(
          page.getByText("Plataforma es solo para el equipo de OPAI."),
        ).toBeVisible();
        await expect(page.getByText("Superadmin", { exact: true })).toHaveCount(0);
        await expect(nav.getByRole("link")).toHaveCount(0);
        await expect(page.getByRole("link", { name: "Nueva", exact: true })).toHaveCount(0);
        if (info.project.name === "telefono") {
          await page.getByRole("button", { name: "Más opciones", exact: true }).click();
          await expect(page.getByRole("menuitem", { name: "Cerrar sesión" })).toBeVisible();
          await page.keyboard.press("Escape");
        }
      }
      await page.screenshot({
        path: info.outputPath(`platform-${autorizado ? "autorizado" : "sin-acceso"}.png`),
        fullPage: true,
      });
      if (autorizado) {
        await page.goto("/trabajador");
        // H3: el DS ya ofrece Inicio también en la barra lateral; no debe quedar vacía.
        await expect(
          page
            .getByRole("navigation", { name: "Principal" })
            .getByRole("link", { name: "Inicio", exact: true })
            .first(),
        ).toBeVisible();
        await page.screenshot({ path: info.outputPath("trabajador.png"), fullPage: true });
        if (info.project.name === "telefono") {
          await page.goto("/");
          await expect(page.getByRole("heading", { name: /^Hola,/ })).toBeVisible();
          await page.screenshot({ path: info.outputPath("inicio-erp.png"), fullPage: true });
        }
      }
    });
  }
});
