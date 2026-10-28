// Argumentos del CLI (puro). En esta entrega solo existe la simulación: sin `--dry-run` se niega.

export type Origen = { tipo: "fixtures"; ruta: string } | { tipo: "opai1" };

export type Argumentos = {
  dryRun: true;
  tenant: string;
  origen: Origen;
  salida: string | null;
};

export const USO =
  "Uso: pnpm --filter @opai/db importar:opai1 --dry-run --tenant <slug> --origen fixtures:<ruta.json> [--salida <reporte.json>]";

export const MENSAJE_SIN_DRY_RUN =
  "La importación real desde OPAI 1.0 no está habilitada: requiere el OK explícito de Carlos y el CRM completo (Brief 07). Esta entrega solo simula: agrega --dry-run.";

export function leerOrigen(valor: string): Origen | null {
  if (valor === "opai1") return { tipo: "opai1" };
  if (valor.startsWith("fixtures:") && valor.length > "fixtures:".length)
    return { tipo: "fixtures", ruta: valor.slice("fixtures:".length) };
  return null;
}

export function leerArgumentos(
  argv: readonly string[],
): { ok: true; args: Argumentos } | { ok: false; error: string; codigo: number } {
  const valores = new Map<string, string>();
  const banderas = new Set<string>();
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i] ?? "";
    if (a === "--dry-run" || a === "--aplicar" || a === "--apply") banderas.add(a);
    else if (a === "--tenant" || a === "--origen" || a === "--salida") {
      const v = argv[i + 1];
      if (v === undefined || v.startsWith("--"))
        return { ok: false, error: `Falta el valor de ${a}. ${USO}`, codigo: 64 };
      valores.set(a, v);
      i++;
    } else return { ok: false, error: `Argumento desconocido: ${a}. ${USO}`, codigo: 64 };
  }
  if (!banderas.has("--dry-run") || banderas.has("--aplicar") || banderas.has("--apply"))
    return { ok: false, error: MENSAJE_SIN_DRY_RUN, codigo: 2 };
  const tenant = valores.get("--tenant");
  if (!tenant) return { ok: false, error: `Falta --tenant. ${USO}`, codigo: 64 };
  const origen = leerOrigen(valores.get("--origen") ?? "");
  if (!origen) return { ok: false, error: `Falta o es inválido --origen. ${USO}`, codigo: 64 };
  return {
    ok: true,
    args: { dryRun: true, tenant, origen, salida: valores.get("--salida") ?? null },
  };
}
