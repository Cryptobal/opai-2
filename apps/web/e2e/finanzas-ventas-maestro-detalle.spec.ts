import { execFileSync } from "node:child_process";

import { expect, type Page, test } from "@playwright/test";

import { hidratado } from "./hidratacion";
import { E2E_PASSWORD, entrar } from "./sesion";

// CAR-255 · Ventas con maestro-detalle: el Libro queda a la izquierda y la factura elegida (borrador o emitida) se
// abre a la derecha. En teléfono es una pantalla a la vez, con «Volver a Ventas». Datos ficticios sembrados por
// `seed-ventas-e2e.ts` (IDs fijos); cada corrida deja los borradores como nuevos.
test.setTimeout(240_000);
test.skip(!E2E_PASSWORD, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");

const EMITIDA = "00000000-0000-7000-8000-000000002553";
// Un par de borradores por proyecto: los proyectos corren en paralelo y uno descarta lo que otro estaría mirando.
const NUMERO: Record<string, string> = { telefono: "1", ipad: "2", desktop: "3" };

/** Siembra los datos del proyecto (cada prueba parte con sus borradores nuevos) y devuelve los IDs de sus borradores. */
function sembrar(proyecto: string) {
  const n = NUMERO[proyecto] ?? "1";
  execFileSync("pnpm", ["--filter", "@opai/auth", "exec", "tsx", "scripts/seed-ventas-e2e.ts", n], {
    cwd: new URL("../../..", import.meta.url),
    env: process.env,
    stdio: "inherit",
  });
  return { editar: `00000000-0000-7000-8000-00000000256${n}`, descartar: `00000000-0000-7000-8000-00000000257${n}` };
}

const lista = (page: Page) => page.getByRole("region", { name: "Libro de ventas" });
const detalle = (page: Page) => page.getByRole("region", { name: "Detalle de la venta" });
const filaDe = (page: Page, id: string) => lista(page).locator(`a[href^="/finanzas/ventas/${id}"]`);
const sinDesborde = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);

test("elegir una factura abre el detalle y la lista sigue visible (o «Volver» en teléfono)", async ({ page }, info) => {
  const telefono = info.project.name === "telefono";
  const { editar: BORRADOR_EDITAR } = sembrar(info.project.name);
  await entrar(page);
  await page.goto("/finanzas/ventas");
  await expect(filaDe(page, EMITIDA)).toBeVisible({ timeout: 60_000 });
  await hidratado(filaDe(page, EMITIDA));
  await filaDe(page, EMITIDA).click();
  await expect(page).toHaveURL(new RegExp(`/finanzas/ventas/${EMITIDA}`));
  await expect(detalle(page).getByText("Cliente ficticio Ventas E2E").first()).toBeVisible({ timeout: 60_000 });
  await expect(detalle(page).getByRole("button", { name: "Descargar PDF" })).toBeVisible();
  if (telefono) {
    // Una pantalla a la vez: solo el detalle, y «Volver» regresa al Libro.
    await expect(lista(page)).toBeHidden();
    await page.getByRole("link", { name: "Volver a Ventas" }).click();
    await expect(page).toHaveURL(/\/finanzas\/ventas(\?|$)/);
    await expect(lista(page)).toBeVisible();
    await expect(filaDe(page, EMITIDA)).toBeVisible();
  } else {
    await expect(lista(page)).toBeVisible();
    await expect(filaDe(page, EMITIDA)).toHaveAttribute("aria-current", "page");
    // Cambiar de fila cambia el panel sin salir del Libro.
    await filaDe(page, BORRADOR_EDITAR).click();
    await expect(page).toHaveURL(new RegExp(`/finanzas/ventas/${BORRADOR_EDITAR}`));
    await expect(filaDe(page, BORRADOR_EDITAR)).toHaveAttribute("aria-current", "page");
    await expect(detalle(page).getByRole("button", { name: "Emitir factura" })).toBeVisible({ timeout: 60_000 });
    await expect(lista(page)).toBeVisible();
  }
  expect(await sinDesborde(page)).toBe(true);
});

test("un borrador se edita desde el panel y se descarta sin perder el Libro", async ({ page }, info) => {
  const { editar: BORRADOR_EDITAR, descartar: BORRADOR_DESCARTAR } = sembrar(info.project.name);
  await entrar(page);
  await page.goto(`/finanzas/ventas/${BORRADOR_EDITAR}`);
  const editar = detalle(page).getByRole("button", { name: "Editar" });
  await expect(editar).toBeVisible({ timeout: 60_000 });
  await hidratado(editar);
  await editar.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByLabel("Plazo de pago (días)").fill("45");
  const guardado = page.waitForResponse((r) => r.request().method() === "POST" && (r.request().postData() ?? "").includes("actualizar_borrador"));
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  expect((await guardado).ok()).toBe(true);
  await expect(page.getByRole("dialog")).toBeHidden({ timeout: 30_000 });
  // Sigue en el panel de ese borrador.
  await expect(page).toHaveURL(new RegExp(`/finanzas/ventas/${BORRADOR_EDITAR}`));

  // Descartar el otro borrador: pide confirmación y, al confirmar, vuelve al Libro sin ese documento.
  await page.goto(`/finanzas/ventas/${BORRADOR_DESCARTAR}`);
  const descartar = detalle(page).getByRole("button", { name: "Descartar" });
  await expect(descartar).toBeVisible({ timeout: 60_000 });
  await hidratado(descartar);
  await descartar.click();
  const borrado = page.waitForResponse((r) => r.request().method() === "POST" && (r.request().postData() ?? "").includes("descartar_borrador"));
  await page.getByRole("button", { name: "Descartar borrador" }).click();
  expect((await borrado).ok()).toBe(true);
  await expect(page).toHaveURL(/\/finanzas\/ventas(\?|$)/, { timeout: 30_000 });
  await expect(lista(page)).toBeVisible();
  await expect(filaDe(page, BORRADOR_DESCARTAR)).toHaveCount(0);
  await expect(filaDe(page, BORRADOR_EDITAR)).toBeVisible();
});
