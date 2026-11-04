// Utilidades de la base en memoria: orden y agrupación (subconjunto de Prisma).
export type Fila = Record<string, unknown>;
export type Where = Record<string, unknown>;

const OPERADORES = [
  "equals",
  "in",
  "notIn",
  "not",
  "lt",
  "lte",
  "gt",
  "gte",
  "contains",
  "startsWith",
  "has",
  "path",
];

function comparar(valor: unknown, op: Record<string, unknown>): boolean {
  const v = valor as number | string | Date;
  return Object.entries(op).every(([k, x]) => {
    if (k === "mode") return true;
    const y = x as number | string | Date;
    if (k === "in") return (x as unknown[]).includes(valor);
    if (k === "notIn") return !(x as unknown[]).includes(valor);
    if (k === "not") return valor !== x;
    if (k === "lt") return valor != null && v < y;
    if (k === "lte") return valor != null && v <= y;
    if (k === "gt") return valor != null && v > y;
    if (k === "gte") return valor != null && v >= y;
    if (k === "contains")
      return String(valor ?? "")
        .toLowerCase()
        .includes(String(x).toLowerCase());
    if (k === "startsWith") return String(valor ?? "").startsWith(String(x));
    if (k === "has") return Array.isArray(valor) && valor.includes(x);
    if (k === "path") {
      // Filtro JSON de Prisma: { path: ["input", "cuentaId"], equals: valor }.
      let nodo: unknown = valor;
      for (const p of x as string[]) nodo = (nodo as Record<string, unknown> | null)?.[p];
      return nodo === op["equals"];
    }
    if (k === "equals") return "path" in op ? true : valor === x;
    return false;
  });
}

export function cumple(fila: Fila, where: Where = {}): boolean {
  return Object.entries(where).every(([k, v]) => {
    if (v === undefined) return true;
    if (k === "OR" && Array.isArray(v)) return v.some((w: Where) => cumple(fila, w));
    if (k === "AND" && Array.isArray(v)) return v.every((w: Where) => cumple(fila, w));
    if (k === "NOT") return !cumple(fila, v as Where);
    if (v && typeof v === "object" && !(v instanceof Date) && !Array.isArray(v)) {
      const op = v as Record<string, unknown>;
      if (Object.keys(op).some((x) => OPERADORES.includes(x))) return comparar(fila[k], op);
      return cumple(fila, op); // clave compuesta: tenantId_userId: { … }
    }
    if (v === null) return fila[k] === null || fila[k] === undefined; // columna sin valor = NULL
    return fila[k] instanceof Date && v instanceof Date
      ? (fila[k] as Date).getTime() === v.getTime()
      : fila[k] === v;
  });
}

type Dir = "asc" | "desc" | { sort: "asc" | "desc"; nulls?: "first" | "last" };
type Orden = Record<string, Dir>;

/** orderBy de Prisma: objeto o lista de objetos `{ campo: "asc" | "desc" | { sort, nulls } }`. */
export function ordenar(filas: Fila[], orderBy: unknown): Fila[] {
  if (!orderBy) return filas;
  const criterios = (Array.isArray(orderBy) ? orderBy : [orderBy]) as Orden[];
  return [...filas].sort((a, b) => {
    for (const c of criterios) {
      for (const [campo, d] of Object.entries(c)) {
        const sort = typeof d === "string" ? d : d.sort;
        const nulls = typeof d === "string" ? undefined : d.nulls;
        const x = a[campo] as number | string | Date | null | undefined;
        const y = b[campo] as number | string | Date | null | undefined;
        if (x === y) continue;
        const nx = x === null || x === undefined;
        const ny = y === null || y === undefined;
        if (nx || ny) {
          if (nx && ny) continue;
          // Prisma/Postgres: NULL al final en asc y al inicio en desc, salvo que se indique `nulls`.
          const alFinal = nulls ? nulls === "last" : sort === "asc";
          return nx === alFinal ? 1 : -1;
        }
        const r = x < y ? -1 : 1;
        return sort === "desc" ? -r : r;
      }
    }
    return 0;
  });
}

type ArgsGrupo = {
  by: string[];
  where?: Record<string, unknown>;
  _count?: { _all: true };
  _sum?: Record<string, true>;
};

/** groupBy con `_count: { _all }` y `_sum`. */
export function agrupar(filas: Fila[], a: ArgsGrupo) {
  const grupos = new Map<string, Fila[]>();
  for (const f of filas.filter((x) => cumple(x, a.where))) {
    const clave = JSON.stringify(a.by.map((k) => f[k] ?? null));
    grupos.set(clave, [...(grupos.get(clave) ?? []), f]);
  }
  return [...grupos.values()].map((g) => {
    const base: Fila = Object.fromEntries(a.by.map((k) => [k, g[0]?.[k] ?? null]));
    if (a._count) base["_count"] = { _all: g.length };
    if (a._sum) {
      base["_sum"] = Object.fromEntries(
        Object.keys(a._sum).map((k) => [k, g.reduce((t, f) => t + Number(f[k] ?? 0), 0)]),
      );
    }
    return base;
  });
}
