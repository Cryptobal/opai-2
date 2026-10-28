import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import permitidos from "../../../apps/web/paridad-permitidos.json";
import { herramientasMcp } from "../src/mcp";
import { listarCapacidades } from "../src/registry";
import { contextoDePrueba, USUARIO_DE_PRUEBA } from "../src/testing";

export const RAIZ_WEB = join(dirname(fileURLToPath(import.meta.url)), "../../../apps/web");
export const INFRAESTRUCTURA_CON_DB = permitidos.infraestructuraConDb;
export const INTERNAS_PERMITIDAS = permitidos.internasPermitidas;

/** Contexto de un agente de un owner con scope "*" y todos los módulos del registro activos. */
export function contextoOwnerAgente() {
  const modulos = [...new Set(listarCapacidades().map((c) => c.modulo))];
  const actor = { tipo: "agent" as const, id: "k-paridad", viaUserId: USUARIO_DE_PRUEBA.id };
  return contextoDePrueba({ rol: "owner", actor, scopes: ["*"], modulosActivos: modulos }).ctx;
}

/**
 * Key de plataforma (ADR-055): responsable con `platformRole` owner, scopes "*" y "platform" (el "*"
 * nunca cubre plataforma) y hereda permisos. Es el máximo que puede ver un agente.
 */
export function contextoPlataformaAgente() {
  const modulos = [...new Set(listarCapacidades().map((c) => c.modulo))];
  const actor = { tipo: "agent" as const, id: "k-plataforma", viaUserId: USUARIO_DE_PRUEBA.id };
  return contextoDePrueba({
    rol: "owner",
    actor,
    usuario: { ...USUARIO_DE_PRUEBA, platformRole: "owner" },
    scopes: ["*", "platform"],
    claveApi: { permisos: null, servicio: false, plataforma: true },
    modulosActivos: modulos,
  }).ctx;
}

/** Nombres de las herramientas MCP que ve el contexto (por defecto, key "*" sin plataforma), ordenados. */
export function nombresDeHerramientas(ctx = contextoOwnerAgente()): string[] {
  return herramientasMcp(ctx)
    .map((h) => h.nombre)
    .sort();
}

/** Capacidades (incluida plataforma) sin herramienta MCP ni siquiera para una key de plataforma. */
export function capacidadesSinHerramienta(): string[] {
  const expuestas = new Set(herramientasMcp(contextoPlataformaAgente()).map((h) => h.capacidad.id));
  return listarCapacidades()
    .filter((c) => !expuestas.has(c.id))
    .map((c) => c.id)
    .sort();
}

function archivosDe(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    if (e.name === "node_modules" || e.name === ".next") return [];
    const ruta = join(dir, e.name);
    if (e.isDirectory()) return archivosDe(ruta);
    return /\.(ts|tsx)$/.test(e.name) && !/\.test\./.test(e.name) ? [ruta] : [];
  });
}

/** Fuentes de apps/web/app y apps/web/lib con su ruta relativa a apps/web. */
export function fuentesWeb(): { archivo: string; texto: string }[] {
  return ["app", "lib"]
    .flatMap((d) => archivosDe(join(RAIZ_WEB, d)))
    .map((ruta) => ({
      archivo: relative(RAIZ_WEB, ruta).split("\\").join("/"),
      texto: readFileSync(ruta, "utf8"),
    }));
}

/** `ids` vacío = id dinámico (variable); con ternarios puede haber más de uno. */
type Llamada = { archivo: string; ids: string[] };

/** Ejecutores: dónde está el id entre los argumentos (portal, id) o (id) o (ctx, id). */
const EJECUTORES: Readonly<Record<string, number>> = {
  ejecutarCapacidad: 1,
  ejecutarComoUsuario: 1,
  executeCapability: 1,
  ejecutar: 0,
};

/** Argumentos de nivel superior de la llamada que empieza en el `(` de `texto[abre]`. */
function argumentos(texto: string, abre: number): string[] {
  const args: string[] = [];
  let profundidad = 0;
  let actual = "";
  for (let i = abre + 1; i < texto.length; i++) {
    const c = texto[i] ?? "";
    if (c === '"' || c === "'" || c === "`") {
      const fin = texto.indexOf(c, i + 1);
      actual += texto.slice(i, fin + 1);
      i = fin;
    } else if ("([{".includes(c)) {
      profundidad++;
      actual += c;
    } else if (")]}".includes(c)) {
      if (profundidad === 0) return [...args, actual.trim()];
      profundidad--;
      actual += c;
    } else if (c === "," && profundidad === 0) {
      args.push(actual.trim());
      actual = "";
    } else actual += c;
    if (args.length > 2) return args;
  }
  return args;
}

/** Salta un genérico `<...>` (con anidados) y devuelve el índice del `(` o -1. */
function abreLlamada(texto: string, desde: number): number {
  let i = desde;
  if (texto[i] === "<") {
    let n = 0;
    for (; i < texto.length; i++) {
      if (texto[i] === "<") n++;
      if (texto[i] === ">" && texto[i - 1] !== "=" && --n === 0) break;
    }
    i++;
  }
  while (/\s/.test(texto[i] ?? "")) i++;
  return texto[i] === "(" ? i : -1;
}

/**
 * Llamadas a ejecutores de capacidades en apps/web (app y lib), con los ids literales del argumento
 * (vacío si es dinámico). Las definiciones de los propios ejecutores no cuentan como llamadas.
 */
export function llamadasAEjecutores(): Llamada[] {
  return [...llamadasDirectas(), ...accionesDeclaradas()];
}

/** Acciones declaradas como datos (`capacidad: { id: "core.x.archive", ... }`), que ejecuta un componente. */
function accionesDeclaradas(): Llamada[] {
  return fuentesWeb().flatMap(({ archivo, texto }) =>
    [...texto.matchAll(/capacidad:\s*\{\s*id:\s*"([^"]+)"/g)].map((m) => ({
      archivo,
      ids: [m[1] ?? ""],
    })),
  );
}

function llamadasDirectas(): Llamada[] {
  const nombres = Object.keys(EJECUTORES).join("|");
  const patron = new RegExp(`(?<![\\w.])(${nombres})(?=[<(\\s])`, "g");
  return fuentesWeb().flatMap(({ archivo, texto }) =>
    [...texto.matchAll(patron)].flatMap((m) => {
      const previo = texto.slice(Math.max(0, m.index - 20), m.index);
      if (/(function|import|\{)\s*$/.test(previo) || /import[^;]*$/.test(previo)) return [];
      const abre = abreLlamada(texto, m.index + (m[1] ?? "").length);
      if (abre === -1) return [];
      const arg = argumentos(texto, abre)[EJECUTORES[m[1] ?? ""] ?? 0] ?? "";
      const ids = [...arg.matchAll(/"([a-z][a-z0-9_]*(?:\.[a-z0-9_]+)+)"/g)].map((x) => x[1] ?? "");
      return [{ archivo, ids }];
    }),
  );
}

/** Archivos de app/ que importan `@opai/db` (la regla de ESLint lo prohíbe fuera de la lista). */
export function importadoresDeDb(): string[] {
  return fuentesWeb()
    .filter(
      ({ archivo, texto }) =>
        archivo.startsWith("app/") && /from\s+"@opai\/db(\/[^"]*)?"/.test(texto),
    )
    .map((f) => f.archivo)
    .sort();
}
