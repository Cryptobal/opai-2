/// <reference types="node" />
import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { type Page } from "@playwright/test";

import { EN_PREVIEW } from "../preview";
import { axe, medir, type Medicion } from "./medir";
import { asentar, resolver } from "./resolver";
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
  ms?: number;
};

const RUIDO = [
  "vercel.live",
  "The script resource is behind a redirect",
  "Download the React DevTools",
];

/** Tope por pantalla: una que no termina de cargar no frena el recorrido. */
const TOPE_MS = 75_000;

const conTope = <T>(p: Promise<T>, ms: number) =>
  Promise.race([
    p,
    new Promise<never>((_, no) => setTimeout(() => no(new Error(`tope de ${ms} ms`)), ms)),
  ]);

export async function recorrer(
  page: Page,
  rutas: Ruta[],
  ancho: string,
  telefono: boolean,
  carpeta = CARPETA,
  todas: Ruta[] = rutas,
  parcial: string | null = join(carpeta, `parcial-${ancho}.ndjson`),
) {
  mkdirSync(carpeta, { recursive: true });
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
    const t0 = Date.now();
    try {
      await conTope(visitar(), TOPE_MS);
    } catch (e) {
      fila.nota = `falló: ${String(e).split("\n")[0]?.slice(0, 160)}`;
    }
    fila.ms = Date.now() - t0;
    if (parcial) appendFileSync(parcial, `${JSON.stringify(fila)}\n`);

    async function visitar() {
      fila.url = ruta.dinamica ? await resolver(page, ruta, todas, cache) : ruta.patron;
      if (!fila.url) {
        fila.nota = "sin registro para abrir";
        return;
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
      const archivo = join(carpeta, fila.captura);
      mkdirSync(dirname(archivo), { recursive: true });
      await page
        .screenshot({ path: archivo, fullPage: true, animations: "disabled", timeout: 20_000 })
        .catch(() => page.screenshot({ path: archivo, animations: "disabled" }));
      fila.medicion = { ...(await medir(page, telefono)), axe: await axe(page) };
      fila.errores = [...new Set(errores)].slice(0, 5);
    }
  }
  return filas;
}

export function guardarInforme(nombre: string, filas: Fila[], carpeta = CARPETA) {
  mkdirSync(carpeta, { recursive: true });
  writeFileSync(join(carpeta, `informe-${nombre}.json`), `${JSON.stringify(filas, null, 1)}\n`);
}
