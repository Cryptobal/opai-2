import { expect, type Page } from "@playwright/test";

/** Mete en la cola local un hecho de un tipo que el servidor ya no acepta y pide enviarlo (CAR-78 · E1). */
export async function inyectarRechazado(t: Page) {
  await t.evaluate(async () => {
    const bd = await new Promise<IDBDatabase>((ok, mal) => {
      const r = indexedDB.open("opai-terreno", 2);
      r.onsuccess = () => ok(r.result);
      r.onerror = () => mal(r.error);
    });
    await new Promise<void>((ok, mal) => {
      const tx = bd.transaction("cola", "readwrite");
      tx.objectStore("cola").put({
        clave: crypto.randomUUID(),
        tipo: "terreno.tipo_retirado",
        payload: {},
        personaId: null,
        horaHecho: new Date(Date.now() - 60_000).toISOString(),
        creadoEn: Date.now(),
      });
      tx.oncomplete = () => ok();
      tx.onerror = () => mal(tx.error);
    });
    bd.close();
    const reg = await navigator.serviceWorker.ready;
    reg.active?.postMessage({ type: "VACIAR_COLA" });
  });
}

/** Evidencia visual del inicio y la cola de Terreno a 375 y 1280 px, en claro y oscuro. */
export async function capturasDeInicioYCola(t: Page) {
  for (const [ancho, alto] of [
    [375, 812],
    [1280, 800],
  ] as const) {
    for (const tema of ["light", "dark"] as const) {
      await t.setViewportSize({ width: ancho, height: alto });
      await t.emulateMedia({ colorScheme: tema });
      for (const [ruta, nombre] of [
        ["/terreno", "inicio"],
        ["/terreno/cola", "cola"],
      ] as const) {
        await t.goto(ruta);
        await expect(t.getByRole("heading", { name: /^(Hola, |Cola sin conexión)/ })).toBeVisible({
          timeout: 20_000,
        });
        await t.screenshot({
          path: `e2e/__screenshots__/terreno-${nombre}-${ancho}-${tema}.png`,
          fullPage: true,
        });
      }
    }
  }
  await t.setViewportSize({ width: 375, height: 812 });
  await t.emulateMedia({ colorScheme: "light" });
}

/**
 * E3b · Marca un QR que el servidor no conoce: queda guardada en el teléfono, se envía y vuelve rechazada con
 * su motivo (nunca se pierde en silencio). Devuelve false si el módulo Rondas no está activo en la empresa.
 */
export async function marcarQrDesconocido(t: Page): Promise<boolean> {
  await t.goto("/terreno");
  const seccion = t.getByRole("region", { name: "Marcar punto" });
  if (!(await seccion.isVisible({ timeout: 20_000 }).catch(() => false))) return false;
  await seccion.getByLabel("Código del punto (QR)").fill(`QR-DESCONOCIDO-${Date.now()}`);
  await seccion.getByRole("button", { name: "Marcar" }).click();
  await expect(seccion.getByText("Marca guardada en el teléfono")).toBeVisible();
  await t.goto("/terreno/cola");
  await expect(t.getByRole("heading", { name: /^No se enviaron \(1\)/ })).toBeVisible({
    timeout: 30_000,
  });
  await expect(t.getByText(/No se reconoce este código QR/)).toBeVisible();
  await t.getByRole("button", { name: "Quitar de la lista" }).click();
  await expect(t.getByRole("heading", { name: /^No se enviaron/ })).toHaveCount(0);
  return true;
}
