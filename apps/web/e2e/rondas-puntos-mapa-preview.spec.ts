import { expect, type Page, test } from "@playwright/test";

import { capturar, capturarHoja } from "./preview";
import { E2E_PASSWORD as password, entrar } from "./sesion";

test.describe("@preview rondas: mapa de puntos en la instalación", () => {
  test.skip(!password, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");
  test.use({ serviceWorkers: "block" });

  // Fixture declarada en packages/db/scripts/qa-e2e/pauta-instalaciones.sql.
  const instalacionQA = "00000000-0000-7000-8000-0000000e2101";
  const coordenadasQA = { lat: "-34", lng: "-71" };
  const teselaQA = '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="#e5e7eb"/><path d="M0 128H256M128 0V256" stroke="#94a3b8"/></svg>';


  async function abrirPuntos(page: Page) {
    await entrar(page);
    await page.goto(`/instalaciones/${instalacionQA}/rondas?sub=puntos`);
    await expect(page.getByText("Planta Norte QA", { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("group", { name: "Sección de rondas" })).toBeVisible({ timeout: 60_000 });
    return instalacionQA;
  }

  test("panel y hoja nuevo punto muestran el mapa interactivo", async ({ page, context }, info) => {
    const geocodificaciones: string[] = [];
    let teselasSimuladas = 0;
    // Ambos temas y todos los subdominios de los hosts actuales: no sale ninguna tesela.
    await context.route(/^https:\/\/(?:[^/]+\.)?(?:tile\.openstreetmap\.org|basemaps\.cartocdn\.com)\//, async (route) => {
      teselasSimuladas += 1;
      await route.fulfill({ status: 200, contentType: "image/svg+xml", body: teselaQA });
    });
    await context.route("https://nominatim.openstreetmap.org/**", async (route) => {
      geocodificaciones.push("externa");
      await route.abort();
    });
    page.on("request", (request) => {
      if (new URL(request.url()).pathname === "/api/geo/buscar") geocodificaciones.push("proxy");
    });
    await abrirPuntos(page);
    const panelMapa = page.getByRole("region", { name: "Mapa de puntos de la ronda" });
    await expect(panelMapa).toBeVisible();
    await expect(panelMapa.locator(".leaflet-container")).toBeVisible({ timeout: 30_000 });
    await capturar(page, info, "rondas-puntos-mapa-panel");

    await page.getByRole("link", { name: "Nuevo punto" }).first().click();
    const hoja = page.getByRole("dialog");
    const mapaHoja = hoja.getByRole("region", { name: "Mapa para ubicar el punto" });
    await expect(mapaHoja).toBeVisible({ timeout: 30_000 });
    await expect(mapaHoja.locator(".leaflet-container")).toBeVisible({ timeout: 30_000 });
    await expect(hoja.getByLabel("Buscar dirección")).toHaveCount(0);
    await expect(hoja.getByLabel("Latitud", { exact: true })).toBeVisible();
    await expect(hoja.getByLabel("Longitud", { exact: true })).toBeVisible();
    await expect(hoja.getByRole("button", { name: "Usar mi ubicación" })).toBeVisible();
    await hoja.getByLabel("Latitud", { exact: true }).fill(coordenadasQA.lat);
    await hoja.getByLabel("Longitud", { exact: true }).fill(coordenadasQA.lng);
    await expect(hoja.getByLabel("Latitud", { exact: true })).toHaveValue(coordenadasQA.lat);
    await expect(hoja.getByLabel("Longitud", { exact: true })).toHaveValue(coordenadasQA.lng);
    // No se pide GPS físico ni se guarda el punto de prueba.
    await expect.poll(() => teselasSimuladas).toBeGreaterThan(0);
    await capturarHoja(page, info, "rondas-punto-mapa-hoja");

    await hoja.getByRole("radio", { name: "QR", exact: true }).check();
    await expect(hoja.getByRole("region", { name: "Mapa para ubicar el punto" })).toHaveCount(0);
    await page.keyboard.press("Escape");
    expect(geocodificaciones).toEqual([]);
  });
});