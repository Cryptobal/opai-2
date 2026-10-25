import { expect, type Page, test } from "@playwright/test";

/**
 * Gate de rendimiento (ADR-045, Brief 03). Recorre el protocolo de navegación y lee el marcador de
 * servidor `#opai-metricas` (fases, total y consultas a Neon por request).
 *
 * En el PR 1 es un INFORME: siempre exige la presencia del marcador (falla sobre `main`, que no lo
 * emite) y registra las fases, el total y las consultas como anotaciones y en consola. Las metas de
 * total ≤ 500 ms, ≤ 8 consultas y esqueleto ≤ 200 ms solo se comprueban (con `expect.soft`) cuando
 * `GATE_ESTRICTO=1`, porque solo son representativas contra `next start` (los tiempos de `pnpm dev`
 * no lo son). En el PR 2, con los arreglos y el job propio `rendimiento` contra `next start`, se
 * activa `GATE_ESTRICTO` y el gate pasa a obligatorio.
 *
 * El job dedicado (build de producción + `next start` + Lighthouse móvil) no se agrega aquí porque el
 * token de push no tiene permiso `workflow`; mientras tanto este spec corre dentro del job `e2e`
 * existente (contra `pnpm dev`, como informe). El YAML del job va en la descripción del PR.
 */
const GATE_ESTRICTO = process.env["GATE_ESTRICTO"] === "1";
const email = process.env["E2E_EMAIL"] ?? "carlos.irigoyen@opai.cl";
const password = process.env["E2E_PASSWORD"] ?? process.env["SEED_OWNER_PASSWORD"];

const MAX_ESQUELETO_MS = 200;
const MAX_TOTAL_MS = 500;
const MAX_CONSULTAS = 8;

// Protocolo de ADR-045: Cuentas → Instalaciones → Personas → Cargos y sueldos → Configuración → Inicio.
const PROTOCOLO = [
  { nombre: "Cuentas", href: "/cuentas" },
  { nombre: "Instalaciones", href: "/instalaciones" },
  { nombre: "Personas", href: "/personas" },
  { nombre: "Cargos y sueldos", href: "/cargos" },
  { nombre: "Configuración", href: "/configuracion" },
  { nombre: "Inicio", href: "/" },
];

type Metricas = {
  serverTiming: string;
  consultas: number;
  fases: Partial<Record<"sesion" | "identidad" | "datos", number>>;
  totalMs: number;
};

test.use({ actionTimeout: 30_000 });
test.setTimeout(180_000);

async function entrar(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Correo").fill(email);
  await page.getByLabel("Contraseña", { exact: true }).fill(password ?? "");
  await page.getByRole("button", { name: "Entrar" }).click();
  const gard = page.getByRole("button", { name: /Gard Security/ });
  await Promise.race([
    gard.waitFor({ state: "visible" }),
    page.waitForURL((u) => u.pathname === "/" || u.pathname === "/platform"),
  ]).catch(() => undefined);
  if (await gard.isVisible()) await gard.click();
  await page.waitForURL((u) => u.pathname === "/" || u.pathname === "/platform");
}

/** Lee el marcador de servidor emitido por `MarcadorMetricas`. */
async function leerMetricas(page: Page): Promise<Metricas | null> {
  const texto = await page.locator("#opai-metricas").textContent().catch(() => null);
  if (!texto) return null;
  return JSON.parse(texto) as Metricas;
}

test("protocolo ADR-045: Server-Timing y consultas por navegación", async ({ page }) => {
  await entrar(page);

  const informe: string[] = [];
  for (const paso of PROTOCOLO) {
    // Carga completa del documento: medición estable del servidor (fases, total y consultas).
    await page.goto(paso.href, { waitUntil: "load" });
    const m = await leerMetricas(page);

    // CA6: el marcador (Server-Timing) está presente en toda página de portal. Falla sobre `main`.
    expect(m, `Falta #opai-metricas en ${paso.nombre}`).not.toBeNull();
    if (!m) continue;
    expect(typeof m.consultas, `consultas no numérico en ${paso.nombre}`).toBe("number");

    informe.push(
      `${paso.nombre.padEnd(18)} total=${String(m.totalMs).padStart(6)}ms  ` +
        `consultas=${String(m.consultas).padStart(2)}  [${m.serverTiming}]`,
    );
    test.info().annotations.push({
      type: "rendimiento",
      description: `${paso.nombre}: ${m.serverTiming}`,
    });

    // Metas de ADR-045: solo se comprueban con GATE_ESTRICTO (next start); si no, van en el informe.
    if (GATE_ESTRICTO) {
      expect
        .soft(m.consultas, `${paso.nombre}: más de ${MAX_CONSULTAS} consultas`)
        .toBeLessThanOrEqual(MAX_CONSULTAS);
      expect
        .soft(m.totalMs, `${paso.nombre}: Server-Timing total sobre ${MAX_TOTAL_MS} ms`)
        .toBeLessThanOrEqual(MAX_TOTAL_MS);
    }
  }

  console.log(`\nRendimiento (protocolo ADR-045):\n${informe.join("\n")}\n`);
});

test("navegación entre módulos: el esqueleto aparece pronto", async ({ page }) => {
  await entrar(page);
  await page.goto("/cuentas", { waitUntil: "load" });

  const menu = page.getByRole("navigation", { name: "Principal" });
  const enlace = menu.getByRole("link", { name: /Personas/ }).first();

  const inicio = Date.now();
  await enlace.click();
  // El esqueleto se marca con data-navegando (useLinkStatus) o aparece el contenido de /personas.
  await page
    .locator("[data-navegando], main")
    .first()
    .waitFor({ state: "visible" })
    .catch(() => undefined);
  await page.waitForURL(/\/personas/);
  const esqueletoMs = Date.now() - inicio;

  test.info().annotations.push({
    type: "rendimiento",
    description: `Esqueleto/navegación a Personas: ${esqueletoMs} ms`,
  });
  // La meta es ≤ 200 ms del esqueleto; aquí se mide el total de la navegación cliente (solo estricto).
  if (GATE_ESTRICTO) {
    expect
      .soft(esqueletoMs, `Navegación lenta (${esqueletoMs} ms)`)
      .toBeLessThanOrEqual(MAX_ESQUELETO_MS);
  }
});
