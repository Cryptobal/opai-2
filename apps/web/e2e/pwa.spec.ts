import { ocultarIndicadorDev } from "./indicador-dev";
import { entrar as iniciarSesion } from "./sesion";
import { expect, type Locator, type Page, test } from "@playwright/test";

/**
 * Base PWA (ADR-044, Brief 04): manifest válido con íconos que existen, service worker que controla
 * la página, cascarón sin red que cae a la página offline del DS sin servir datos de `/api` desde la
 * caché, y la regla de caché bloqueante (§4.4, §9, CA8): nunca HTML ni RSC con sesión en `caches`,
 * solo la lista explícita de activos públicos; al cerrar sesión la app limpia las cachés. Corre en el
 * job e2e (no obligatorio aún, ADR-043 v3); se corre antes de abrir el PR.
 */

const ICONOS = [
  "/icono-192.png",
  "/icono-512.png",
  "/icono-maskable-192.png",
  "/icono-maskable-512.png",
  "/apple-touch-icon.png",
];

type IconoManifest = { sizes: string; purpose?: string };

// Lo único que puede quedar en `caches`: la página offline neutra, los íconos y los estáticos con
// hash (JS/CSS/fuentes). Cualquier HTML o RSC con sesión (query `_rsc`) o `/api/*` sería una fuga.
const PUBLICOS = new Set(["/sin-conexion", ...ICONOS]);
function esActivoPublico(u: string): boolean {
  const { pathname, search } = new URL(u);
  if (search.includes("_rsc")) return false;
  return PUBLICOS.has(pathname) || pathname.startsWith("/_next/static/");
}

/** URLs de todas las peticiones guardadas en cualquier caché del service worker. */
async function urlsEnCache(page: Page): Promise<string[]> {
  return page.evaluate(async () => {
    const urls: string[] = [];
    for (const n of await caches.keys()) {
      const c = await caches.open(n);
      for (const req of await c.keys()) urls.push(req.url);
    }
    return urls;
  });
}

/** ¿Algún cuerpo guardado en caché contiene este texto? (p. ej. el correo del usuario anterior). */
async function cacheContieneTexto(page: Page, texto: string): Promise<boolean> {
  return page.evaluate(async (t) => {
    for (const n of await caches.keys()) {
      const c = await caches.open(n);
      for (const req of await c.keys()) {
        const r = await c.match(req);
        const cuerpo = r ? await r.clone().text().catch(() => "") : "";
        if (cuerpo.includes(t)) return true;
      }
    }
    return false;
  }, texto);
}

async function soloActivosPublicos(page: Page): Promise<void> {
  for (const u of await urlsEnCache(page)) expect(esActivoPublico(u), u).toBe(true);
}

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
  await page.waitForFunction(() => navigator.serviceWorker?.controller != null, null, {
    timeout: 40_000,
  });
}

test("el service worker se registra y controla la página", async ({ page }) => {
  await page.goto("/login");
  await esperarControl(page);
  expect(await page.evaluate(() => navigator.serviceWorker.controller != null)).toBe(true);
});

test("sin red aparece la página offline y en caché solo hay activos públicos", async ({
  page,
  context,
}) => {
  await page.goto("/login");
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

  // Tras navegar, en `caches` solo hay la lista explícita de activos públicos (CA8): nada de HTML
  // ni RSC con sesión, ni `/api/*`.
  await soloActivosPublicos(page);
  await context.setOffline(false);
});

// --- Dos usuarios de dos empresas en el mismo navegador (CA8, §12) --------------------------------
const password = process.env["E2E_PASSWORD"] ?? process.env["SEED_OWNER_PASSWORD"];
const emailA = process.env["E2E_EMAIL"] ?? "carlos.irigoyen@opai.cl"; // usuario A, empresa 1 (Gard)
const emailB = "e2e-multiempresa@opai.cl"; // usuario B, elige la empresa 2 (Empresa E2E)

async function entrar(page: Page, correo: string, empresa: RegExp) {
  await iniciarSesion(page, correo);
  // Con más de una membresía el acceso pide elegir; se elige la empresa indicada.
  if (new URL(page.url()).pathname === "/elegir-empresa") {
    await page.getByRole("button", { name: empresa }).click();
  }
  await page.waitForURL((u) => u.pathname === "/" || u.pathname === "/platform");
}

/** Abre el menú de usuario hasta ver `dentro`: un clic antes de hidratar no lo abre (CAR-60). */
async function abrirMenuUsuario(page: Page, dentro: Locator) {
  await expect(async () => {
    if (!(await dentro.isVisible()))
      await page.getByRole("button", { name: "Menú de usuario" }).click({ timeout: 2_000 });
    await expect(dentro).toBeVisible({ timeout: 1_000 });
  }).toPass({ timeout: 30_000 });
}

test.describe("dos usuarios, dos empresas", () => {
  // Solo dev (CI levanta `next dev`): el indicador de Next tapa el «Menú de usuario» al pie de la barra
  // lateral y el clic de «Cerrar sesión» no llega; la prueba colgaba hasta el timeout (CAR-60).
  test.beforeEach(({ page }) => ocultarIndicadorDev(page));
  test.skip(!password, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");
  // Igual que caché-sesión: el menú de usuario (salir) y el riel existen desde iPad; el teléfono tiene
  // otro DOM. La propiedad de seguridad no depende del tamaño de pantalla.
  test.skip(({ viewport }) => (viewport?.width ?? 0) < 768, "Se prueba en iPad y escritorio");
  test.setTimeout(180_000);

  test("tras salir A y entrar B, B nunca ve los datos de A y las cachés se limpiaron", async ({
    page,
    context,
  }) => {
    // A entra en la empresa 1, navega y deja el service worker controlando.
    await entrar(page, emailA, /Gard Security/);
    await esperarControl(page);
    // Sentinela: una entrada en caché con el correo de A. Si cerrar sesión limpia las cachés (§4.4),
    // desaparece; el service worker nunca la recrea, así que la prueba es determinista.
    await page.evaluate(
      (e) => caches.open("prueba-sesion").then((c) => c.put("/__a", new Response(e))),
      emailA,
    );
    expect(await page.evaluate(() => caches.has("prueba-sesion"))).toBe(true);

    // A cierra sesión: la app limpia las cachés del service worker antes de redirigir.
    // Justo después de entrar el shell puede repintarse y desmontar el menú abierto: abrir, hacer clic
    // y llegar a /login se reintentan juntos.
    const salir = page.getByRole("menuitem", { name: /Cerrar sesión|Salir/i });
    await expect(async () => {
      await abrirMenuUsuario(page, salir);
      await salir.click({ timeout: 2_000 });
      await page.waitForURL(/\/login/, { timeout: 5_000 });
    }).toPass({ timeout: 60_000 });
    await expect.poll(() => page.evaluate(() => caches.has("prueba-sesion"))).toBe(false);

    // B entra en la empresa 2.
    await entrar(page, emailB, /Empresa E2E/);
    await esperarControl(page);

    // B es B, no A: el menú de usuario muestra el correo de B y nunca el de A.
    await abrirMenuUsuario(page, page.getByText(emailB));
    await expect(page.getByText(emailA)).toHaveCount(0);
    await page.keyboard.press("Escape");
    // La empresa activa es la 2 (Empresa E2E), no la 1.
    await expect(page.getByRole("button", { name: /Empresa E2E/ })).toBeVisible();
    // Con red, nada de A quedó en caché.
    expect(await cacheContieneTexto(page, emailA)).toBe(false);

    // Sin red: cascarón offline neutro y, en caché, solo activos públicos; nada de A.
    await context.setOffline(true);
    await page.goto("/terreno");
    await expect(page.getByText("Sin conexión")).toBeVisible();
    await soloActivosPublicos(page);
    expect(await cacheContieneTexto(page, emailA)).toBe(false);
    await context.setOffline(false);
  });
});
