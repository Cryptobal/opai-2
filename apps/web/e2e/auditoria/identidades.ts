import { type Page } from "@playwright/test";

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

/** Cada acción falla a los 30 s en vez de esperar sin límite: la auditoría anota el motivo y sigue. */
function conLimite(...paginas: Page[]) {
  for (const p of paginas) p.setDefaultTimeout(30_000);
}

/** Empareja `terreno` (otra página, sin sesión de ERP) con la primera instalación. */
export async function emparejarTerreno(erp: Page, terreno: Page): Promise<string | null> {
  conLimite(erp, terreno);
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

/**
 * Entra al portal del trabajador con un PIN temporal de la primera persona con PIN posible. Los dos
 * anchos corren en paralelo sobre la misma persona: si el otro ancho le cambió el PIN entremedio, se
 * reintenta una vez después de una pausa.
 */
export async function entrarTrabajador(erp: Page, trabajador: Page): Promise<string | null> {
  const nota = await intentarTrabajador(erp, trabajador);
  if (!nota?.startsWith("no entró")) return nota;
  await trabajador.waitForTimeout(20_000);
  return intentarTrabajador(erp, trabajador);
}

async function intentarTrabajador(erp: Page, trabajador: Page): Promise<string | null> {
  conLimite(erp, trabajador);
  // La persona ficticia de `auditoria-datos.spec.ts` (con RUT y vínculo); si no está, la primera.
  const re = /^\/personas\/[0-9a-f-]{36}$/;
  // Primero la de `seed:guardia-qa` (CAR-401), la única con usuario de OPAI; luego la de la preparación.
  const ficha =
    (await primerEnlace(erp, "/personas?q=Guardia%20QA", re)) ??
    (await primerEnlace(erp, "/personas?q=Auditor%C3%ADa", re)) ??
    (await primerEnlace(erp, "/personas", re));
  if (!ficha) return "sin personas en qa-e2e";
  await erp.goto(`${ficha}/laboral`);
  // La cabecera de la ficha llega por streaming: se espera el RUT antes de leer el texto (CAR-401).
  await erp
    .getByText(/\b\d{1,2}\.\d{3}\.\d{3}-[\dK]\b/)
    .first()
    .waitFor({ timeout: 20_000 })
    .catch(() => undefined);
  const rut = (await erp.locator("body").innerText()).match(/\b\d{1,2}\.\d{3}\.\d{3}-[\dK]\b/)?.[0];
  const asignar = erp.getByRole("button", { name: /^(Asignar|Cambiar) PIN$/ });
  if (!rut) return "la persona no muestra RUT en Laboral";
  await asignar
    .first()
    .waitFor({ timeout: 20_000 })
    .catch(() => undefined);
  if (!(await asignar.count())) return "la ficha no ofrece «Asignar PIN»";
  // El PIN solo abre el portal si la persona tiene usuario en OPAI (la tarjeta lo avisa).
  if (await erp.getByText(/No tiene usuario en OPAI/).count())
    return "la persona no tiene usuario en OPAI (hay que invitarla antes de asignar PIN)";
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
  // Con PIN temporal de RR. HH., el mismo formulario pide elegir uno propio antes de abrir sesión.
  const nuevo = trabajador.getByLabel("PIN nuevo (6 dígitos)");
  await Promise.race([
    trabajador.waitForURL((u) => u.pathname !== "/trabajador/login", { timeout: 30_000 }),
    nuevo.waitFor({ timeout: 30_000 }),
  ]).catch(() => undefined);
  if (await nuevo.count()) {
    await nuevo.fill("582913");
    await trabajador.getByLabel("Repite el PIN nuevo").fill("582913");
    await trabajador.getByRole("button", { name: "Entrar", exact: true }).click();
    await trabajador
      .waitForURL((u) => u.pathname !== "/trabajador/login", { timeout: 30_000 })
      .catch(() => undefined);
  }
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
