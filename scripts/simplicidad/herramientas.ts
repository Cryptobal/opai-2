// Ejecuta knip (sin uso) y jscpd (duplicados) y devuelve sus hallazgos como listas de texto (ADR-115).
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const MIN_TOKENS = "50";
const IGNORAR_DUPLICADOS = [
  "**/node_modules/**",
  "**/.next/**",
  "**/dist/**",
  "**/.turbo/**",
  "**/coverage/**",
  "**/src/generated/**",
  "**/*.test.ts",
  "**/*.test.tsx",
  "**/test/**",
  "**/e2e/**",
  "**/novedades/entradas/embed.ts",
  "**/migrations/**",
].join(",");

function ejecutar(binario: string, args: string[]): string {
  return execFileSync("pnpm", ["exec", binario, ...args], {
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024,
  });
}

interface ClonJscpd {
  lines: number;
  firstFile: { name: string; start: number };
  secondFile: { name: string; start: number };
}

/** Bloques duplicados de 50 tokens o más; cada uno pesa sus líneas. */
export function medirDuplicados(): { lineas: number; clones: string[] } {
  const dir = mkdtempSync(join(tmpdir(), "simplicidad-"));
  ejecutar(
    "jscpd",
    ["apps", "packages", "modules", "scripts", "-f", "typescript,tsx", "-k", MIN_TOKENS].concat([
      "-r",
      "json",
      "-o",
      dir,
      "-i",
      IGNORAR_DUPLICADOS,
    ]),
  );
  const informe = JSON.parse(readFileSync(join(dir, "jscpd-report.json"), "utf8")) as {
    duplicates: ClonJscpd[];
    statistics: { total: { duplicatedLines: number } };
  };
  const clones = informe.duplicates.map(
    (c) =>
      `${c.firstFile.name}:${c.firstFile.start} ≈ ${c.secondFile.name}:${c.secondFile.start} (${c.lines} líneas)`,
  );
  return { lineas: informe.statistics.total.duplicatedLines, clones };
}

type Hallazgo = { name: string };
interface IssueKnip {
  file: string;
  files: Hallazgo[];
  exports: Hallazgo[];
  types: Hallazgo[];
  dependencies: Hallazgo[];
  devDependencies: Hallazgo[];
  unlisted: Hallazgo[];
}

export interface SinUso {
  exportaciones: string[];
  archivos: string[];
  dependencias: string[];
}

/** Exportaciones (valores y tipos), archivos y dependencias sin uso según knip. */
export function medirSinUso(): SinUso {
  const salida = ejecutar("knip", ["--reporter", "json", "--no-exit-code", "--no-progress"]);
  const { issues } = JSON.parse(salida.slice(salida.indexOf("{"))) as { issues: IssueKnip[] };
  const sinUso: SinUso = { exportaciones: [], archivos: [], dependencias: [] };
  for (const i of issues) {
    const con = (lista: Hallazgo[]) => lista.map((h) => `${i.file}: ${h.name}`);
    sinUso.exportaciones.push(...con(i.exports), ...con(i.types));
    sinUso.archivos.push(...i.files.map((h) => h.name));
    sinUso.dependencias.push(...con(i.dependencies), ...con(i.devDependencies), ...con(i.unlisted));
  }
  return sinUso;
}
