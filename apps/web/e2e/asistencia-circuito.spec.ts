import { expect, type Page, test } from "@playwright/test";

import { E2E_PASSWORD as password, entrar } from "./sesion";

// CAR-599 · circuito de marca (Terreno + Trabajador) → comprobante → Asistencia de hoy → Pauta.
// Datos: `seed:asistencia-e2e` sobre el fixture de Pauta en `gard`.
const FIXTURE = {
  instalacion: "00000000-0000-7000-8000-0000000b0001",
  tokenDispositivo: "e2e-asistencia-dispositivo-token-ficticio-seguro-abc123",
  pin: "482915",
  trabajadorEmail: "asistencia-circuito-trabajador@opai.cl",
} as const;
const HOY = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago" }).format(new Date());

async function teclearPin(page: Page, digitos: string) {
  for (const d of digitos) await page.getByRole("button", { name: d, exact: true }).click();
}

async function marcarConPin(page: Page) {
  await page.getByRole("button", { name: "Usar PIN" }).click();
  await teclearPin(page, FIXTURE.pin);
  await page.getByRole("button", { name: "Marcar con PIN" }).click();
  await expect(page.getByRole("heading", { name: /marcada/i })).toBeVisible({ timeout: 60_000 });
}

test.describe("asistencia · circuito completo", () => {
  test.skip(!password, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");

  test("Terreno y Trabajador dejan el día en ERP y Pauta", async ({ page, context, baseURL }, info) => {
    test.skip(info.project.name !== "telefono", "Recorrido móvil (375 px)");
    test.setTimeout(180_000);
    const url = baseURL ?? "http://localhost:3000";
    await context.addCookies([
      { name: "opai_dispositivo", value: FIXTURE.tokenDispositivo, url },
    ]);
    await page.goto("/terreno");
    await expect(page.getByRole("heading", { name: "¿Quién eres?" })).toBeVisible({ timeout: 60_000 });
    await page.getByRole("button", { name: /Ana Pauta E2E/ }).click();
    await page.getByRole("link", { name: "Marcar asistencia" }).click();
    await marcarConPin(page);
    await expect(page.getByText("Comprobante")).toBeVisible();

    await entrar(page, FIXTURE.trabajadorEmail);
    await page.goto("/trabajador/marcar");
    await marcarConPin(page);

    await entrar(page);
    await page.goto("/asistencia");
    await expect(page.getByText(/[A-ZÁÉÍÓÚ][a-záéíóú]+ \d{2}-\d{2}-\d{4} · \d+ turnos/).first()).toBeVisible({
      timeout: 60_000,
    });
    await expect(page.getByText("Ana Pauta E2E").first()).toBeVisible();

    await page.goto(`/pauta?inst=${FIXTURE.instalacion}&vista=diaria&fecha=${HOY}`);
    await expect(page.getByText(/La presencia sale de las marcas de Asistencia|Asistió|Sin salida|Presente/).first()).toBeVisible({
      timeout: 60_000,
    });
    await page.goto(`/pauta?inst=${FIXTURE.instalacion}`);
    await expect(page.getByText("Portería Día").first()).toBeVisible();
  });
});