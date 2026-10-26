import { expect, type Page, test } from "@playwright/test";

/**
 * Base PWA (ADR-044, Brief 04): manifest válido con íconos que existen, service worker que controla
 * la página, y cascarón sin red que cae a la página offline del DS sin servir datos de `/api` desde
 * la caché. No necesita sesión: usa el manifest y rutas públicas (/login, /sin-conexion). Corre en
 * el job e2e (no obligatorio aún, ADR-043 v3); se corre antes de abrir el PR.
 */

const ICONOS = [
  "/icono-192.png",
  "/icono-512.png",
  "/icono-maskable-192.png",
  "/icono-maskable-512.png",
  "/apple-touch-icon.png",
];

type IconoManifest = { sizes: string; purpose?: string };

test("el manifest es válido y sus íconos existen", async ({ request }) => {
  const res = await request.get("/manifest.webmanifest");
  expect(res.status()).toBe(200);
  const m = (await res.json()) as {
    name: string;
    display: string;
    start_url: string;
    scope: string;
    icons: IconoManifest[];
  };
  expect(m.name).toBe("OPAI");
  expect(m.display).toBe("standalone");
  // start_url dentro del scope (lo exige la base PWA).
  expect(m.start_url.startsWith(m.scope)).toBe(true);
  const iconos = m.icons.map((i) => `${i.sizes}/${i.purpose ?? "any"}`);
  expect(iconos).toContain("192x192/any");
  expect(iconos).toContain("512x512/any");
  expect(iconos).toContain("192x192/maskable");
  for (const ruta of ICONOS) {
    const r = await request.get(ruta);
    expect(r.status(), ruta).toBe(200);
  }
});

async function esperarControl(page: Page) {
  await page.goto("/login");
  await page.waitForFunction(() => navigator.serviceWorker?.controller != null, null, {
    timeout: 40_000,
  });
}

test("el service worker se registra y controla la página", async ({ page }) => {
  await esperarControl(page);
  expect(await page.evaluate(() => navigator.serviceWorker.controller != null)).toBe(true);
});

test("sin red aparece la página offline y /api no se sirve de caché", async ({ page, context }) => {
  await esperarControl(page);
  // La página offline está precacheada en install.
  await expect
    .poll(() => page.evaluate(() => caches.match("/sin-conexion").then((r) => !!r)), {
      timeout: 15_000,
    })
    .toBe(true);

  await context.setOffline(true);
  // Navegación de terreno sin red: cae a la página offline del DS (cascarón, no el dinosaurio).
  await page.goto("/terreno");
  await expect(page.getByText("Sin conexión")).toBeVisible();
  await expect(page.getByRole("button", { name: "Reintentar" })).toBeVisible();

  // /api no se sirve desde la caché: sin red, la petición falla (R4, §9).
  const apiVivo = await page.evaluate(async () => {
    try {
      return (await fetch("/api/health")).ok;
    } catch {
      return false;
    }
  });
  expect(apiVivo).toBe(false);

  await context.setOffline(false);
});
