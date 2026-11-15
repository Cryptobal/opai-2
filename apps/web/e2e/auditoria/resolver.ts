import { type Page } from "@playwright/test";

import { type Ruta } from "./rutas";

// Espera de carga y resolución de rutas con `[id]` para la auditoría de diseño (CAR-334).

export async function asentar(page: Page) {
  await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => undefined);
  await page
    .locator('main [aria-busy="true"]')
    .first()
    .waitFor({ state: "detached", timeout: 6_000 })
    .catch(() => undefined);
  await page.waitForTimeout(400);
}

export async function resolver(
  page: Page,
  ruta: Ruta,
  todas: Ruta[],
  cache: Map<string, string | null>,
) {
  const segs = ruta.patron.split("/").filter(Boolean);
  let concreto: string[] = [];
  for (let i = 0; i < segs.length; i++) {
    const seg = segs[i]!;
    if (!seg.startsWith("[")) {
      concreto.push(seg);
      continue;
    }
    const clave = `/${segs.slice(0, i + 1).join("/")}`;
    if (!cache.has(clave)) {
      const prefijo = `/${concreto.join("/")}`;
      const hermanos = new Set(
        todas
          .map((r) => r.patron.split("/").filter(Boolean))
          .filter(
            (p) =>
              p.length > i && `/${p.slice(0, i).join("/")}` === `/${segs.slice(0, i).join("/")}`,
          )
          .map((p) => p[i]!)
          .filter((p) => !p.startsWith("[")),
      );
      let hallado: string | null = null;
      for (let j = concreto.length; j >= 1 && !hallado; j--) {
        const base = `/${concreto.slice(0, j).join("/")}`;
        if (!todas.some((r) => r.patron === `/${segs.slice(0, j).join("/")}`)) continue;
        await page.goto(base, { waitUntil: "domcontentloaded" }).catch(() => null);
        await asentar(page);
        const hrefs = await page.$$eval("a[href]", (as) =>
          as.map((a) => a.getAttribute("href") ?? ""),
        );
        const re = new RegExp(`^${prefijo.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/([^/?#]+)`);
        hallado = hrefs.map((h) => re.exec(h)?.[1]).find((s) => s && !hermanos.has(s)) ?? null;
      }
      cache.set(clave, hallado);
    }
    const valor = cache.get(clave);
    if (!valor) return null;
    concreto = [...concreto, valor];
  }
  return `/${concreto.join("/")}`;
}
