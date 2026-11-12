import { type Browser, type Page } from "@playwright/test";

// Identidades de prueba para los portales Guardia y Terreno en la auditoría (CAR-334). Las crea el
// dueño de `qa-e2e` desde el ERP de la vista previa (su rama de Neon, que se descarta con el PR): un
// código para emparejar un equipo de terreno a la primera instalación, y un PIN temporal para la
// primera persona con RUT. Nunca Gard ni datos reales; los códigos y PIN no se imprimen.

async function primerEnlace(page: Page, lista: string, re: RegExp): Promise<string | null> {
  await page.goto(lista);
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => undefined);
  const hrefs = await page.$$eval("a[href]", (as) => as.map((a) => a.getAttribute("href") ?? ""));
  return hrefs.find((h) => re.test(h)) ?? null;
}

/** Empareja `terreno` (otra página, sin sesión de ERP) con la primera instalación. */
export async function emparejarTerreno(erp: Page, terreno: Page): Promise<string | null> {
  const ficha = await primerEnlace(erp, "/instalaciones", /^\/instalaciones\/[0-9a-f-]{36}$/);
  if (!ficha) return "sin instalaciones en qa-e2e";
  await erp.goto(`${ficha}/dispositivos`);
  await erp.getByRole("button", { name: "Emparejar dispositivo" }).click();
  const dialogo = erp.getByRole("dialog", { name: "Emparejar dispositivo" });
  await dialogo.waitFor({ timeout: 30_000 });
  const codigo = (await dialogo.locator("p.t-mono").first().innerText()).trim();
  if (!/^[A-Z0-9]{6}$/.test(codigo)) return "no se obtuvo el código";
  await terreno.goto(`/terreno/emparejar?c=${codigo}`);
  await terreno.getByRole("button", { name: "Emparejar", exact: true }).click();
  await terreno
    .waitForURL((u) => u.pathname !== "/terreno/emparejar", { timeout: 30_000 })
    .catch(() => undefined);
  return new URL(terreno.url()).pathname === "/terreno/emparejar"
    ? "el emparejamiento no avanzó"
    : null;
}

/** Entra al portal del trabajador con un PIN temporal de la primera persona con PIN posible. */
export async function entrarTrabajador(erp: Page, trabajador: Page): Promise<string | null> {
  const ficha = await primerEnlace(erp, "/personas", /^\/personas\/[0-9a-f-]{36}$/);
  if (!ficha) return "sin personas en qa-e2e";
  await erp.goto(`${ficha}/laboral`);
  const rut = (await erp.locator("body").innerText()).match(/\b\d{1,2}\.\d{3}\.\d{3}-[\dK]\b/)?.[0];
  const asignar = erp.getByRole("button", { name: /^(Asignar|Cambiar) PIN$/ });
  if (!rut || !(await asignar.count())) return "la persona no tiene RUT o PIN de terreno";
  const pin = "731946";
  await asignar.first().click();
  await erp.getByLabel("PIN de 6 dígitos").fill(pin);
  await erp.getByRole("dialog").getByRole("button", { name: "Asignar PIN" }).click();
  await erp
    .getByRole("dialog")
    .waitFor({ state: "detached", timeout: 30_000 })
    .catch(() => undefined);
  await trabajador.goto("/trabajador/login");
  await trabajador.getByLabel("RUT").fill(rut.replace(/\./g, "").replace("-", ""));
  for (const d of pin) await trabajador.getByRole("button", { name: d, exact: true }).click();
  await trabajador.getByRole("button", { name: "Entrar", exact: true }).click();
  await trabajador
    .waitForURL((u) => u.pathname !== "/trabajador/login", { timeout: 30_000 })
    .catch(() => undefined);
  if (new URL(trabajador.url()).pathname === "/trabajador/cambiar-pin") {
    // Primer ingreso: el portal exige cambiar el PIN temporal antes de seguir.
    await trabajador.getByLabel("PIN actual").fill(pin);
    await trabajador.getByLabel("PIN nuevo (6 dígitos)").fill("582913");
    await trabajador.getByLabel("Repite el PIN nuevo").fill("582913");
    await trabajador.getByRole("button", { name: "Cambiar PIN" }).click();
    await trabajador
      .waitForURL((u) => u.pathname === "/trabajador", { timeout: 30_000 })
      .catch(() => undefined);
  }
  const final = new URL(trabajador.url()).pathname;
  return final.startsWith("/trabajador/login") || final === "/trabajador/cambiar-pin"
    ? `no entró con RUT y PIN (${final})`
    : null;
}

export async function nuevaPagina(
  browser: Browser,
  opciones: Parameters<Browser["newContext"]>[0],
) {
  const ctx = await browser.newContext(opciones);
  return { ctx, page: await ctx.newPage() };
}
