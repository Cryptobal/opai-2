/// <reference types="node" />
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { type Page } from "@playwright/test";

import { EN_PREVIEW } from "../preview";
import { axe, medir, type Medicion } from "./medir";
import { type Ruta, slug } from "./rutas";

// Recorre una lista de rutas en una página ya preparada (sesión, ancho, marco) y deja una captura y
// una medición por pantalla (CAR-334). Las rutas con `[id]` se resuelven abriendo la lista más
// cercana y tomando el primer enlace que calce; si no hay, se anota «sin registro».

export const CARPETA = EN_PREVIEW
  ? "test-results/capturas/auditoria"
  : "e2e/__screenshots__/auditoria";

export type Fila = Ruta & {
  ancho: string;
  url: string | null;
  final: string | null;
  estado: number | null;
  captura: string | null;
  nota: string | null;
  errores: string[];
  medicion: Medicion | null;
};

const RUIDO = [
  "vercel.live",
  "The script resource is behind a redirect",
  "Download the React DevTools",
];

async function asentar(page: Page) {
  await page.waitForLoadState("networkidle", { timeout: 12_000 }).catch(() => undefined);
  await page
    .locator('main [aria-busy="true"]')
    .first()
    .waitFor({ state: "detached", timeout: 10_000 })
    .catch(() => undefined);
  await page.waitForTimeout(400);
}

async function resolver(page: Page, ruta: Ruta, todas: Ruta[], cache: Map<string, string | null>) {
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

export async function recorrer(page: Page, rutas: Ruta[], ancho: string, telefono: boolean) {
  const filas: Fila[] = [];
  const cache = new Map<string, string | null>();
  let errores: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error" && !RUIDO.some((r) => m.text().includes(r)))
      errores.push(m.text().slice(0, 200));
  });
  page.on("pageerror", (e) => errores.push(String(e).slice(0, 200)));
  for (const ruta of rutas) {
    const fila: Fila = {
      ...ruta,
      ancho,
      url: null,
      final: null,
      estado: null,
      captura: null,
      nota: null,
      errores: [],
      medicion: null,
    };
    filas.push(fila);
    try {
      fila.url = ruta.dinamica ? await resolver(page, ruta, rutas, cache) : ruta.patron;
      if (!fila.url) {
        fila.nota = "sin registro para abrir";
        continue;
      }
      errores = [];
      const respuesta = await page.goto(fila.url, {
        waitUntil: "domcontentloaded",
        timeout: 45_000,
      });
      await asentar(page);
      fila.estado = respuesta?.status() ?? null;
      fila.final = new URL(page.url()).pathname;
      if (fila.final !== fila.url) fila.nota = `redirigió a ${fila.final}`;
      fila.captura = `${ruta.portal}/${slug(ruta.patron)}-${ancho}.png`;
      const archivo = join(CARPETA, fila.captura);
      mkdirSync(dirname(archivo), { recursive: true });
      await page.screenshot({ path: archivo, fullPage: true, animations: "disabled" });
      fila.medicion = { ...(await medir(page, telefono)), axe: await axe(page) };
      fila.errores = [...new Set(errores)].slice(0, 5);
    } catch (e) {
      fila.nota = `falló: ${String(e).split("\n")[0]?.slice(0, 160)}`;
    }
  }
  return filas;
}

export function guardarInforme(nombre: string, filas: Fila[]) {
  mkdirSync(CARPETA, { recursive: true });
  writeFileSync(join(CARPETA, `informe-${nombre}.json`), `${JSON.stringify(filas, null, 1)}\n`);
}
