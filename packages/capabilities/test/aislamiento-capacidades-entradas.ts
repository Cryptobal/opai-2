// Entradas y marcas de la pasada de dos empresas por las capacidades de lectura (CAR-48).
type Fila = Record<string, unknown>;
type Esquema = { safeParse: (v: unknown) => { success: boolean } };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Ids y textos únicos sembrados en una empresa: si aparecen en una salida, la salida los reveló. */
export function marcasDe(filas: Map<string, Fila>, excluir: readonly string[] = []): string[] {
  const marcas = new Set<string>();
  for (const fila of filas.values())
    for (const v of Object.values(fila))
      if (typeof v === "string" && (UUID.test(v) || v.startsWith("dos-empresas-"))) marcas.add(v);
  return [...marcas].filter((m) => !excluir.includes(m));
}

function forma(esquema: unknown): Record<string, unknown> {
  const e = esquema as { shape?: Record<string, unknown>; unwrap?: () => unknown };
  if (e?.shape) return e.shape;
  return typeof e?.unwrap === "function" ? forma(e.unwrap()) : {};
}

function opciones(esquema: unknown): string[] {
  const e = esquema as { options?: unknown[]; unwrap?: () => unknown };
  if (Array.isArray(e?.options)) return e.options.filter((o): o is string => typeof o === "string");
  return typeof e?.unwrap === "function" ? opciones(e.unwrap()) : [];
}

/**
 * `{}` y, por cada campo que sea un id (`id`, `…Id`) o una entidad polimórfica (`{ tipo, id }`), una
 * entrada con cada id sembrado en la otra empresa. Solo se devuelven las que el esquema acepta.
 */
export function entradasDePrueba(esquema: Esquema, filasAjenas: Map<string, Fila>): unknown[] {
  const ids = [
    ...new Set([...filasAjenas.values()].map((f) => f["id"]).filter((v) => typeof v === "string")),
  ];
  const candidatas: unknown[] = [{}];
  for (const [campo, tipo] of Object.entries(forma(esquema))) {
    if (campo === "id" || campo.endsWith("Id"))
      for (const id of ids) candidatas.push({ [campo]: id });
    const tipos = opciones(forma(tipo)["tipo"]);
    for (const t of tipos) for (const id of ids) candidatas.push({ [campo]: { tipo: t, id } });
  }
  return candidatas.filter((c) => esquema.safeParse(c).success);
}
