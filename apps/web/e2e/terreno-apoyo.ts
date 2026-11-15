import { expect, type Locator, type Page } from "@playwright/test";

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
      // Las transiciones de color duran 150-200 ms: la captura espera a que el tema termine de aplicarse.
      await t.waitForTimeout(400);
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
 * CAR-395 · El Inicio del equipo no ofrece «Marcar punto»: la marca se hace solo dentro de la ronda en curso
 * (una marca desde el Inicio quedaba sin ronda). Si Rondas está activo, el Inicio lleva a «Mis rondas».
 */
export async function inicioSinMarcarPunto(t: Page): Promise<void> {
  await t.goto("/terreno");
  await expect(t.getByRole("heading", { name: "Turno de ahora" })).toBeVisible({ timeout: 20_000 });
  await expect(t.getByRole("region", { name: "Marcar punto" })).toHaveCount(0);
}

/**
 * E3b · Dentro de la ronda en curso, marca un QR que el servidor no conoce: queda guardada en el teléfono, se
 * envía y vuelve rechazada con su motivo (nunca se pierde en silencio). La ronda sigue en curso al volver.
 */
export async function marcarQrDesconocido(t: Page, enCurso: Locator): Promise<void> {
  await enCurso.getByLabel("Código del punto (QR)").fill(`QR-DESCONOCIDO-${Date.now()}`);
  await enCurso.getByRole("button", { name: "Marcar", exact: true }).click();
  await expect(enCurso.getByText("Marca guardada en el teléfono")).toBeVisible();
  await t.goto("/terreno/cola");
  await expect(t.getByRole("heading", { name: /^No se enviaron \(1\)/ })).toBeVisible({
    timeout: 30_000,
  });
  await expect(t.getByText(/No se reconoce este código QR/)).toBeVisible();
  await t.getByRole("button", { name: "Quitar de la lista" }).click();
  await expect(t.getByRole("heading", { name: /^No se enviaron/ })).toHaveCount(0);
  await t.goto("/terreno/rondas");
  await expect(enCurso).toBeVisible({ timeout: 15_000 });
}
