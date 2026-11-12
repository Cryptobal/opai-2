/// <reference types="node" />
import { readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

// Rutas que recorre la auditoría de diseño (CAR-334): salen de los `page.tsx` de `app/`, así una
// pantalla nueva entra sola. El grupo de rutas dice a qué portal pertenece.

export type Portal = "erp" | "cliente" | "guardia" | "terreno" | "publico";

export type Ruta = {
  /** Patrón de App Router sin grupos, por ejemplo `/cuentas/[id]/contactos`. */
  patron: string;
  portal: Portal;
  /** Módulo o área para el índice (primer segmento). */
  modulo: string;
  dinamica: boolean;
};

const APP = join(import.meta.dirname, "../../app");

const PORTAL_DE_GRUPO: Record<string, Portal> = {
  "(erp)": "erp",
  "(cliente)": "cliente",
  "(trabajador)": "guardia",
  "(terreno)": "terreno",
  "(auth)": "publico",
  "(entrada)": "publico",
};

/** Rutas que no son pantallas de los cuatro portales o que no se pueden abrir sin un token. */
const FUERA = [
  /^\/ds\b/,
  /^\/platform\b/,
  /^\/supervisor\b/,
  /^\/api\b/,
  /\[\.\.\.[a-z]+\]/, // comodines «no encontrado»
  /\[token\]|\[hash\]|\[slug\]/, // enlaces de un solo uso (firma, invitación, verificación)
  /^\/autorizar\b/, // consentimiento OAuth: necesita una app que lo pida
  /^\/(activar-mfa|mfa|elegir-empresa|entrar)$/,
];

function paginas(dir: string, salida: string[] = []): string[] {
  for (const nombre of readdirSync(dir)) {
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) {
      if (!nombre.startsWith("_") && nombre !== "api") paginas(ruta, salida);
    } else if (nombre === "page.tsx") salida.push(relative(APP, dir));
  }
  return salida;
}

export function rutasAuditables(): Ruta[] {
  const rutas: Ruta[] = [];
  for (const carpeta of paginas(APP)) {
    const partes = carpeta === "" ? [] : carpeta.split(sep);
    const grupo = partes.find((p) => /^\(.+\)$/.test(p));
    const patron = `/${partes.filter((p) => !/^\(.+\)$/.test(p)).join("/")}`;
    if (FUERA.some((re) => re.test(patron))) continue;
    let portal: Portal | undefined = grupo ? PORTAL_DE_GRUPO[grupo] : undefined;
    if (!portal) portal = patron.startsWith("/recuperar") || patron === "/login" ? "publico" : undefined;
    if (!portal) continue;
    const segmentos = patron.split("/").filter(Boolean);
    const sinPortal = ["cliente", "trabajador", "terreno"].includes(segmentos[0] ?? "")
      ? segmentos.slice(1)
      : segmentos;
    rutas.push({
      patron,
      portal,
      modulo: sinPortal[0] && !sinPortal[0].startsWith("[") ? sinPortal[0] : "inicio",
      dinamica: patron.includes("["),
    });
  }
  return rutas.sort((a, b) => a.patron.localeCompare(b.patron));
}

/** Nombre de archivo estable para una ruta: `/cuentas/[id]/contactos` → `cuentas__id__contactos`. */
export function slug(patron: string): string {
  return (patron.replace(/^\//, "").replace(/[[\]]/g, "_").replace(/\//g, "__") || "inicio").replace(
    /_+$/,
    "",
  );
}
