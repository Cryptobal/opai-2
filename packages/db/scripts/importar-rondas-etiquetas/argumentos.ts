// Argumentos del CLI de migración de etiquetas QR de Rondas desde OPAI 1.0 (Brief 14 · PR 2). Puro.
// SOLO SIMULACIÓN: esta entrega únicamente planifica en memoria (`--dry-run`); sin `--dry-run` se
// niega. Nunca escribe en 1.0 ni en 2.0 (decisión p.20: se reutilizan y se mejoran, sin reimprimir).

export type Argumentos = {
  dryRun: true;
  /** Ruta del export de checkpoints de 1.0 (JSON). No se conecta a 1.0 en esta entrega. */
  fixtures: string;
  salida: string | null;
};

export const USO =
  "Uso: pnpm --filter @opai/db importar:rondas-etiquetas --dry-run --origen fixtures:<ruta.json> [--salida <reporte.json>]";

export const MENSAJE_SIN_DRY_RUN =
  "La importación real de etiquetas de 1.0 no está habilitada: el formato del QR de 1.0 está sin verificar y la escritura la aplica el bot OPAI 2.0 con respaldo. Esta entrega solo simula: agrega --dry-run.";

export function leerArgumentos(
  argv: readonly string[],
): { ok: true; args: Argumentos } | { ok: false; error: string; codigo: number } {
  const valores = new Map<string, string>();
  const banderas = new Set<string>();
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i] ?? "";
    if (a === "--dry-run" || a === "--aplicar" || a === "--apply") banderas.add(a);
    else if (a === "--origen" || a === "--salida") {
      const v = argv[i + 1];
      if (v === undefined || v.startsWith("--"))
        return { ok: false, error: `Falta el valor de ${a}. ${USO}`, codigo: 64 };
      valores.set(a, v);
      i++;
    } else return { ok: false, error: `Argumento desconocido: ${a}. ${USO}`, codigo: 64 };
  }
  if (!banderas.has("--dry-run") || banderas.has("--aplicar") || banderas.has("--apply"))
    return { ok: false, error: MENSAJE_SIN_DRY_RUN, codigo: 2 };
  const origen = valores.get("--origen") ?? "";
  if (!origen.startsWith("fixtures:") || origen.length <= "fixtures:".length)
    return { ok: false, error: `Falta o es inválido --origen. ${USO}`, codigo: 64 };
  return {
    ok: true,
    args: {
      dryRun: true,
      fixtures: origen.slice("fixtures:".length),
      salida: valores.get("--salida") ?? null,
    },
  };
}
