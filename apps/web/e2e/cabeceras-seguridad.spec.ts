import { expect, type Page, test } from "@playwright/test";

// Núcleo P1 (CSP y HSTS): ninguna ruta principal debe reportar una violación de CSP y toda respuesta
// debe llevar las cabeceras de seguridad. La CSP viaja en Report-Only, así que el navegador igual
// dispara `securitypolicyviolation` (disposition "report") si algo no calza: así validamos que la
// política no romperá nada al pasar a modo estricto con nonce tras el #45.
const email = process.env["E2E_EMAIL"] ?? "carlos.irigoyen@opai.cl";
const password = process.env["E2E_PASSWORD"] ?? process.env["SEED_OWNER_PASSWORD"];

type Violacion = { directiva: string; bloqueado: string; ruta: string };

// `exposeFunction` cuelga esta función del `window` del navegador; el escucha de `addInitScript` la
// llama. Se declara aquí para no castear `window` en el init script.
declare global {
  interface Window {
    __cspViolacion?: (v: Violacion) => void;
  }
}

test.use({ actionTimeout: 30_000 });
test.setTimeout(180_000);

/** Registra el escucha de violaciones en cada documento (se re-ejecuta en cada navegación). */
async function escuchar(page: Page, violaciones: Violacion[]) {
  await page.exposeFunction("__cspViolacion", (v: Violacion) => violaciones.push(v));
  await page.addInitScript(() => {
    document.addEventListener("securitypolicyviolation", (e) => {
      window.__cspViolacion?.({
        directiva: e.violatedDirective,
        bloqueado: e.blockedURI,
        ruta: location.pathname,
      });
    });
  });
}

async function entrar(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Correo").fill(email);
  await page.getByLabel("Contraseña", { exact: true }).fill(password ?? "");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL((url) => url.pathname === "/" || url.pathname === "/platform");
}

test.describe("cabeceras de seguridad (núcleo P1)", () => {
  test.skip(!password, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");

  test("las respuestas llevan CSP, Permissions-Policy y HSTS (en producción)", async ({ page }) => {
    const resp = await page.goto("/login");
    const h = resp?.headers() ?? {};
    expect(h["content-security-policy-report-only"]).toContain("default-src 'self'");
    expect(h["permissions-policy"]).toBe("camera=(self), geolocation=(self), microphone=()");
    expect(h["x-frame-options"]).toBe("DENY");
    // HSTS solo en producción (los navegadores la ignoran sobre HTTP). Si está, debe ser exacta y sin
    // preload; se detecta por la propia cabecera para no depender del modo del servidor de prueba.
    const hsts = h["strict-transport-security"];
    if (hsts) expect(hsts).toBe("max-age=63072000; includeSubDomains");
  });

  test("ninguna ruta principal reporta violaciones de CSP", async ({ page }) => {
    const violaciones: Violacion[] = [];
    await escuchar(page, violaciones);
    await page.goto("/login");
    await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible();
    await entrar(page);
    // /ds solo existe fuera de producción; en un build de producción responde 404 (sin violaciones).
    for (const ruta of ["/", "/supervisor", "/ds"]) {
      await page.goto(ruta);
      await page.waitForLoadState("networkidle");
    }
    expect(violaciones, JSON.stringify(violaciones, null, 2)).toEqual([]);
  });
});
