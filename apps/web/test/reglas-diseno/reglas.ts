/// <reference types="node" />
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import { TAMANOS_TEXTO_HILO } from "@opai/ds/hilo";

// Reglas de uso de Hilo que se pueden verificar leyendo el código (DISENO-hilo.md, ADR-105, CAR-334).
// Las que dependen de la pantalla dibujada (un primario por vista, área táctil, textos en inglés) las
// mide la auditoría de Playwright (`e2e/auditoria-diseno*.ts`).

export const RAIZ = join(import.meta.dirname, "../../../..");

const CARPETAS = ["apps/web/app", "packages/ds/src", "modules"];
const OMITIR = /(\.test\.tsx?$|\/node_modules\/|\/test\/|\/e2e\/|\/domain\/src\/formato\.ts$)/;

export type Regla = {
  id: string;
  descripcion: string;
  contar: (texto: string) => number;
};

const contarRegex = (re: RegExp) => (texto: string) => texto.match(re)?.length ?? 0;

export const REGLAS: Regla[] = [
  {
    id: "F1-formato-propio",
    descripcion:
      "Montos, fechas y números se presentan con @opai/domain (formatearClp, formatearFecha…), no con toLocale* ni Intl en la pantalla",
    contar: contarRegex(
      /\.toLocale(Date|Time)?String\(|new Intl\.NumberFormat\(|Intl\.DateTimeFormat\(\s*["']es-CL/g,
    ),
  },
  {
    id: "T1-tamano-fuera-de-escala",
    descripcion:
      "Los tamaños de texto salen de la escala Hilo (11, 12, 13, 14, 15, 16, 18, 22, 24, 26, 28…)",
    contar: (texto) =>
      [...texto.matchAll(/\btext-\[(\d+(?:\.\d+)?)px\]/g)].filter(
        (m) => !TAMANOS_TEXTO_HILO.includes(Number(m[1])),
      ).length,
  },
  {
    id: "B1-boton-generico",
    descripcion:
      "Los botones dicen lo que hacen: nunca «OK», «Aceptar», «Enviar» a secas ni textos en inglés",
    contar: contarRegex(
      />\s*(OK|Ok|Aceptar|Enviar|Submit|Cancel|Save|Delete|Close|Confirm|Loading\.\.\.)\s*</g,
    ),
  },
  {
    id: "C1-estilo-en-linea",
    descripcion: "Sin colores ni tamaños en estilos en línea: solo tokens y clases del DS",
    contar: contarRegex(/style=\{\{[^}]*\b(color|background|fontSize|borderRadius)\b/g),
  },
];

function archivos(dir: string, salida: string[] = []): string[] {
  for (const nombre of readdirSync(dir)) {
    const ruta = join(dir, nombre);
    if (OMITIR.test(ruta)) continue;
    if (statSync(ruta).isDirectory()) archivos(ruta, salida);
    else if (/\.tsx?$/.test(nombre)) salida.push(ruta);
  }
  return salida;
}

export type Conteo = Record<string, Record<string, number>>;

/** Hallazgos por regla y archivo (ruta relativa a la raíz del repo). */
export function contarTodo(): Conteo {
  const conteo: Conteo = Object.fromEntries(REGLAS.map((r) => [r.id, {}]));
  for (const carpeta of CARPETAS) {
    for (const ruta of archivos(join(RAIZ, carpeta))) {
      const texto = readFileSync(ruta, "utf8");
      for (const regla of REGLAS) {
        const n = regla.contar(texto);
        if (n > 0) conteo[regla.id]![relative(RAIZ, ruta)] = n;
      }
    }
  }
  return conteo;
}
