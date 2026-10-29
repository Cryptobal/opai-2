import { expect, test } from "@playwright/test";

test("Supervisor sin ERP no obtiene datos por sesión HTTP ni entrando al ERP", async ({ page }) => {
  const password = process.env["E2E_PASSWORD"] ?? process.env["SEED_OWNER_PASSWORD"];
  if (!password) throw new Error("Falta la contraseña del seed local de e2e.");
  await page.goto("/login");
  await page.getByLabel("Correo").fill("e2e-sin-erp@opai.cl");
  await page.getByLabel("Contraseña", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"));
  await page.goto("/supervisor");
  // El seed no tiene instalaciones asignadas: esperar el resultado, no solo ausencia durante carga.
  await expect(page.getByText("Todo al día", { exact: true })).toBeVisible();
  await expect(page.getByText("No tienes acceso a esta sección", { exact: true })).toHaveCount(0);

  // core.instalaciones.list también está declarada para "supervisor" (antes solo ERP por defecto).
  await page.goto("/supervisor/instalaciones");
  await expect(page.getByText("Sin instalaciones activas", { exact: true })).toBeVisible();
  await expect(page.getByText("No tienes acceso a esta sección", { exact: true })).toHaveCount(0);

  // La API genérica no deriva un portal del cliente: incluso con un portal forjado se cierra.
  const resultados = [];
  for (const portal of ["supervisor", "erp", "inventado"]) {
    const res = await page.request.post(`/api/v1/core/buscar?portal=${portal}`, {
      // Propio origen (CAR-38): así el rechazo que se mide es el del portal, no el del origen.
      headers: { "x-opai-portal": portal, origin: new URL(page.url()).origin },
      data: { input: { q: "Alfa" }, portal },
    });
    expect(res.status()).toBe(403);
    resultados.push(await res.json());
  }
  expect(resultados[0]).toEqual(resultados[1]);
  expect(resultados[1]).toEqual(resultados[2]);
  expect(resultados[0]).toMatchObject({
    ok: false,
    error: {
      code: "FORBIDDEN",
      message: "No tienes acceso a este portal.",
    },
  });
  await page.goto("/");
  await expect(page.getByText("No tienes acceso a esta sección", { exact: true })).toBeVisible();
});
