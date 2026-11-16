// Cuenta archivos y funciones demasiado largos (ADR-115). Mismo criterio que ESLint `max-lines`:
// no cuentan las líneas en blanco ni las que solo tienen comentarios.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import ts from "typescript";

const MAX_LINEAS_ARCHIVO = 150;
const MAX_LINEAS_FUNCION = 60;

const FUERA =
  /(\.test\.tsx?$|\.spec\.ts$|\.d\.ts$|\/test\/|\/e2e\/|\/generated\/|\/novedades\/entradas\/embed\.ts$)/;

/** Archivos de código versionados que entran en la medición (sin pruebas ni generados). */
function archivosMedidos(): string[] {
  const salida = execFileSync("git", ["ls-files", "apps", "packages", "modules", "scripts"], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  return salida.split("\n").filter((f) => /\.tsx?$/.test(f) && !FUERA.test(f));
}

/** Líneas con al menos un token de código. */
function lineasDeCodigo(fuente: ts.SourceFile): number {
  const lineas = new Set<number>();
  const escaner = ts.createScanner(
    ts.ScriptTarget.Latest,
    true,
    fuente.languageVariant,
    fuente.text,
  );
  for (let t = escaner.scan(); t !== ts.SyntaxKind.EndOfFileToken; t = escaner.scan()) {
    const desde = fuente.getLineAndCharacterOfPosition(escaner.getTokenStart()).line;
    const hasta = fuente.getLineAndCharacterOfPosition(escaner.getTokenEnd()).line;
    for (let l = desde; l <= hasta; l++) lineas.add(l);
  }
  return lineas.size;
}

/** Funciones (declaraciones, métodos, flechas) con más líneas que el tope, como «archivo:línea nombre». */
function funcionesLargas(fuente: ts.SourceFile, archivo: string): string[] {
  const largas: string[] = [];
  const visitar = (nodo: ts.Node): void => {
    if (ts.isFunctionLike(nodo) && "body" in nodo && nodo.body) {
      const inicio = fuente.getLineAndCharacterOfPosition(nodo.getStart(fuente)).line;
      const fin = fuente.getLineAndCharacterOfPosition(nodo.end).line;
      if (fin - inicio + 1 > MAX_LINEAS_FUNCION) {
        largas.push(`${archivo}:${inicio + 1} (${fin - inicio + 1} líneas)`);
      }
    }
    ts.forEachChild(nodo, visitar);
  };
  visitar(fuente);
  return largas;
}

export interface Largos {
  archivosLargos: string[];
  funcionesLargas: string[];
}

export function medirLargos(): Largos {
  const resultado: Largos = { archivosLargos: [], funcionesLargas: [] };
  for (const archivo of archivosMedidos()) {
    const tipo = archivo.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
    const fuente = ts.createSourceFile(
      archivo,
      readFileSync(archivo, "utf8"),
      ts.ScriptTarget.Latest,
      false,
      tipo,
    );
    const lineas = lineasDeCodigo(fuente);
    if (lineas > MAX_LINEAS_ARCHIVO) resultado.archivosLargos.push(`${archivo} (${lineas} líneas)`);
    resultado.funcionesLargas.push(...funcionesLargas(fuente, archivo));
  }
  return resultado;
}
