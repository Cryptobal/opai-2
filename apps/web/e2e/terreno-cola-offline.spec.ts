import { expect, test } from "@playwright/test";
import { digitoVerificador } from "@opai/domain";
import { entrar } from "./sesion";

// CAR-78 · B3: un equipo de terreno emparejado captura sin señal y el hecho llega UNA sola vez al volver la
// conexión, con la hora del servidor y el desfase del reloj. Recorre todo con las pantallas reales: el
// administrador genera el código en el ERP, el teléfono (sin sesión) lo canjea, elige su nombre y trabaja.
test("cola sin conexión: el hecho capturado en modo avión llega una vez al recuperar la señal", async ({
  browser,
  page,
}) => {
  test.setTimeout(180_000);
  // 1) ERP: una persona con vínculo en la instalación (los datos de demostración no traen vínculos) y el
  // código de emparejamiento de esa instalación.
  await entrar(page);
  await page.goto("/personas?nueva=1");
  const dialogo = page.getByRole("dialog", { name: "Agregar persona" });
  await expect(dialogo).toBeVisible({ timeout: 30_000 });
  const base = String(20_000_000 + (Date.now() % 9_000_000));
  await dialogo.getByLabel("Nombres").fill("Prueba");
  await dialogo.getByLabel("Apellidos").fill(`Terreno ${Date.now()}`);
  await dialogo.getByLabel("RUT").fill(`${base}-${digitoVerificador(base)}`);
  await dialogo.getByLabel("Cargo").click();
  await page.getByRole("option").first().click();
  await dialogo.getByRole("button", { name: "Instalación obligatoria" }).click();
  await page.getByRole("option", { name: /Planta Quilicura/ }).click();
  await dialogo.getByLabel("Horas semanales").fill("45");
  await dialogo.getByLabel("Distribución").fill("Lunes a sábado");
  await dialogo.getByRole("button", { name: "Crear persona" }).click();
  await page.waitForURL(/\/personas\/[0-9a-f-]{36}$/);
  await page.goto("/instalaciones");
  await page.getByRole("link", { name: /Planta Quilicura/ }).first().click();
  await page.waitForURL(/\/instalaciones\/[0-9a-f-]{36}/);
  const instalacionId = /\/instalaciones\/([0-9a-f-]{36})/.exec(page.url())?.[1] ?? "";
  await page.goto(`/instalaciones/${instalacionId}/dispositivos`);
  await page.getByRole("button", { name: /Emparejar dispositivo/ }).first().click();
  const codigo = (await page.getByText(/^[A-HJKMNP-Z2-9]{6}$/).first().textContent())?.trim() ?? "";
  expect(codigo).toMatch(/^[A-HJKMNP-Z2-9]{6}$/);

  // 2) Teléfono: sin sesión, canjea el código, elige su nombre y abre el inicio.
  const telefono = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const t = await telefono.newPage();
  await t.goto(`/terreno/emparejar?c=${codigo}`);
  await t.getByRole("button", { name: "Emparejar", exact: true }).click();
  await expect(t.getByRole("heading", { name: "Dispositivo emparejado" })).toBeVisible({ timeout: 20_000 });
  await t.getByRole("link", { name: "Continuar" }).click();
  await expect(t.getByRole("heading", { name: "¿Quién eres?" })).toBeVisible({ timeout: 20_000 });
  await t.screenshot({ path: "e2e/__screenshots__/terreno-quien-eres-telefono.png", fullPage: true });
  await t.getByRole("list").getByRole("button").first().click();
  await expect(t.getByRole("heading", { name: /^Hola, / })).toBeVisible();
  // El service worker debe controlar la página para enviar la cola.
  await t.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await t.reload();
  await expect(t.getByText("En línea · todo enviado")).toBeVisible({ timeout: 30_000 });

  // 3) Sin señal: el hecho queda guardado en el teléfono y la pantalla lo dice.
  await telefono.setOffline(true);
  await t.evaluate(() => {
    localStorage.setItem("opai.terreno.ultimoLatido", "0");
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(t.getByText(/Sin conexión · 1 hecho por enviar/)).toBeVisible({ timeout: 15_000 });
  await t.screenshot({ path: "e2e/__screenshots__/terreno-cola-sin-conexion-telefono.png", fullPage: true });

  // 4) Vuelve la señal: se envía solo y la cola queda vacía.
  await telefono.setOffline(false);
  await expect(t.getByText("En línea · todo enviado")).toBeVisible({ timeout: 45_000 });

  // 5) Una sola vez: tras recargar no queda nada por enviar (el servidor ya tiene la clave; la
  // idempotencia y el envío simultáneo se prueban en hechos-terreno-db.test.ts).
  await t.reload();
  await expect(t.getByText("En línea · todo enviado")).toBeVisible({ timeout: 30_000 });
  await expect(t.getByText(/por enviar/)).toHaveCount(0);
  await telefono.close();
});
