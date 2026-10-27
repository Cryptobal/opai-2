import { expect, test } from "@playwright/test";

import { aislarCorreo } from "../lib/correo-srcdoc";

test("srcdoc aislado carga el logo propio y bloquea imágenes externas antes de salir a la red", async ({
  page,
}) => {
  let externas = 0;
  await page.route("https://tracker.example.test/**", async (route) => {
    externas += 1;
    await route.fulfill({
      contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>',
    });
  });
  await page.route(/\/api\/marca\/prueba\/logoPrincipal\?vistaPrevia=1$/, async (route) => {
    await route.fulfill({
      contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>',
    });
  });
  await page.goto("/login");
  const html = aislarCorreo(
    '<!doctype html><html><body><img id="propia" src="/api/marca/prueba/logoPrincipal?vistaPrevia=1"><img id="externa" src="https://tracker.example.test/pixel"></body></html>',
    new URL(page.url()).origin,
  );
  await page.evaluate((srcdoc) => {
    const iframe = document.createElement("iframe");
    iframe.id = "correo-csp";
    iframe.setAttribute("sandbox", "");
    iframe.referrerPolicy = "no-referrer";
    iframe.srcdoc = srcdoc;
    document.body.append(iframe);
  }, html);
  const frame = page.frameLocator("#correo-csp");
  await expect
    .poll(() => frame.locator("#propia").evaluate((img) => (img as HTMLImageElement).naturalWidth))
    .toBe(1);
  expect(
    await frame.locator("#externa").evaluate((img) => (img as HTMLImageElement).naturalWidth),
  ).toBe(0);
  expect(externas).toBe(0);
});
