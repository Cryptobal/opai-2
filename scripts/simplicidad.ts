// Check `simplicidad` (ADR-115): mide el repositorio y lo compara con la línea base.
// Falla solo si una cifra empeora; lo que ya existía no bloquea.
//   pnpm simplicidad               mide y compara con simplicidad-base.json
//   pnpm simplicidad --actualizar  reescribe la base con las cifras de hoy
//   pnpm simplicidad --detalle     además lista todos los hallazgos
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { medirDuplicados, medirSinUso } from "./simplicidad/herramientas";
import { medirLargos } from "./simplicidad/largos";

const BASE = "simplicidad-base.json";
const RAMA_BASE = process.env.SIMPLICIDAD_RAMA_BASE ?? "origin/main";

const ETIQUETAS = {
  lineasDuplicadas: "Líneas de código duplicado",
  archivosLargos: "Archivos de más de 150 líneas",
  funcionesLargas: "Funciones de más de 60 líneas",
  exportacionesSinUso: "Exportaciones sin uso",
  archivosSinUso: "Archivos sin uso",
  dependenciasSinUso: "Dependencias sin uso",
} as const;

type Metrica = keyof typeof ETIQUETAS;
type Cifras = Record<Metrica, number>;
type Detalle = Record<Metrica, string[]>;

function medir(): { cifras: Cifras; detalle: Detalle } {
  const duplicados = medirDuplicados();
  const largos = medirLargos();
  const sinUso = medirSinUso();
  const detalle: Detalle = {
    lineasDuplicadas: duplicados.clones,
    archivosLargos: largos.archivosLargos,
    funcionesLargas: largos.funcionesLargas,
    exportacionesSinUso: sinUso.exportaciones,
    archivosSinUso: sinUso.archivos,
    dependenciasSinUso: sinUso.dependencias,
  };
  const cifras = Object.fromEntries(
    Object.entries(detalle).map(([k, v]) => [k, v.length]),
  ) as Cifras;
  cifras.lineasDuplicadas = duplicados.lineas;
  return { cifras, detalle };
}

/** Archivos que cambia la rama respecto de main: ahí suele estar lo que empeoró la cifra. */
function archivosDelCambio(): string[] {
  try {
    const salida = execFileSync("git", ["diff", "--name-only", `${RAMA_BASE}...HEAD`], {
      encoding: "utf8",
    });
    return salida.split("\n").filter(Boolean);
  } catch {
    return [];
  }
}

function explicar(metrica: Metrica, hallazgos: string[]): void {
  const cambiados = archivosDelCambio();
  const propios = hallazgos.filter((h) => cambiados.some((a) => h.includes(a)));
  const lista = propios.length > 0 ? propios : hallazgos;
  const titulo = propios.length > 0 ? "En archivos de este cambio" : "Todos los hallazgos";
  console.error(`  ${titulo} (${ETIQUETAS[metrica]}):`);
  for (const h of lista.slice(0, 40)) console.error(`    - ${h}`);
}

/** Subir la base está permitido solo con justificación en el PR: se deja a la vista en el log. */
function avisarSiSubioLaBase(base: Cifras): void {
  try {
    const previa = JSON.parse(
      execFileSync("git", ["show", `${RAMA_BASE}:${BASE}`], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      }),
    ) as Partial<Cifras>;
    for (const m of Object.keys(ETIQUETAS) as Metrica[]) {
      const antes = previa[m];
      if (typeof antes === "number" && base[m] > antes) {
        console.warn(
          `⚠ Este cambio SUBE la base de «${ETIQUETAS[m]}» (${antes} → ${base[m]}): justifícalo en el PR.`,
        );
      }
    }
  } catch {
    // La rama base todavía no tiene línea base: nada que comparar.
  }
}

const { cifras, detalle } = medir();
const args = process.argv.slice(2);

if (args.includes("--detalle")) {
  for (const m of Object.keys(ETIQUETAS) as Metrica[]) {
    console.log(`\n## ${ETIQUETAS[m]} (${cifras[m]})`);
    for (const h of detalle[m]) console.log(`- ${h}`);
  }
}

if (args.includes("--actualizar")) {
  writeFileSync(BASE, `${JSON.stringify(cifras, null, 2)}\n`);
  console.log(`Línea base actualizada en ${BASE}.`);
  process.exit(0);
}

const base = JSON.parse(readFileSync(BASE, "utf8")) as Cifras;
const faltantes = (Object.keys(ETIQUETAS) as Metrica[]).filter((m) => typeof base[m] !== "number");
if (faltantes.length > 0) {
  console.error(
    `A ${BASE} le faltan cifras: ${faltantes.join(", ")}. Corre \`pnpm simplicidad --actualizar\`.`,
  );
  process.exit(1);
}
avisarSiSubioLaBase(base);
let empeoro = false;
let mejoro = false;
for (const m of Object.keys(ETIQUETAS) as Metrica[]) {
  const signo = cifras[m] > base[m] ? "✗ empeora" : cifras[m] < base[m] ? "✓ mejora" : "  igual";
  console.log(
    `${signo.padEnd(10)} ${ETIQUETAS[m].padEnd(32)} base ${base[m]} → ahora ${cifras[m]}`,
  );
  if (cifras[m] > base[m]) {
    empeoro = true;
    explicar(m, detalle[m]);
  }
  if (cifras[m] < base[m]) mejoro = true;
}

if (empeoro) {
  console.error(
    "\nEste cambio empeora la simplicidad del código (AGENTS.md «Código simple», ADR-115).",
  );
  console.error("Reutiliza lo que existe, borra lo que quedó sin uso o divide lo que creció.");
  process.exit(1);
}
if (mejoro)
  console.log(
    "\nBajaste una cifra: corre `pnpm simplicidad --actualizar` y sube la base nueva en este PR.",
  );
