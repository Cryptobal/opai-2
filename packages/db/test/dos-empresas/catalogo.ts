// Catálogo de Postgres para la prueba de dos empresas (CAR-48): toda tabla con `tenant_id`, en todos
// los schemas, con sus columnas, referencias (FK reales y triggers `verificar_mismo_tenant`) y únicos.
import { type Client } from "pg";

export type Columna = {
  nombre: string;
  tipo: string;
  noNula: boolean;
  conDefecto: boolean;
  generada: boolean;
  etiquetas: string[] | null;
};

export type Referencia = { columna: string; tabla: string; columnaRef: string };

export type Tabla = {
  nombre: string;
  columnas: Columna[];
  referencias: Referencia[];
  unicas: Set<string>;
};

export async function tablasConTenant(pg: Client): Promise<string[]> {
  const r = await pg.query<{ t: string }>(`
    SELECT format('%I.%I', n.nspname, c.relname) AS t
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_attribute a ON a.attrelid = c.oid AND a.attname = 'tenant_id' AND NOT a.attisdropped
    WHERE c.relkind IN ('r', 'p') AND NOT c.relispartition
      AND n.nspname NOT IN ('pg_catalog', 'information_schema')
    ORDER BY 1`);
  return r.rows.map((f) => f.t);
}

async function columnas(pg: Client, tabla: string): Promise<Columna[]> {
  const r = await pg.query<Columna>(
    `SELECT a.attname AS nombre, t.typname AS tipo, a.attnotnull AS "noNula",
       a.atthasdef OR a.attidentity <> '' AS "conDefecto", a.attgenerated <> '' AS generada,
       (SELECT array_agg(e.enumlabel ORDER BY e.enumsortorder) FROM pg_enum e
        WHERE e.enumtypid = t.oid) AS etiquetas
     FROM pg_attribute a JOIN pg_type t ON t.oid = a.atttypid
     WHERE a.attrelid = $1::regclass AND a.attnum > 0 AND NOT a.attisdropped
     ORDER BY a.attnum`,
    [tabla],
  );
  return r.rows;
}

async function referencias(pg: Client, tabla: string): Promise<Referencia[]> {
  const fk = await pg.query<Referencia>(
    `SELECT a.attname AS columna, format('%I.%I', n.nspname, c.relname) AS tabla, b.attname AS "columnaRef"
     FROM pg_constraint k
     JOIN pg_attribute a ON a.attrelid = k.conrelid AND a.attnum = k.conkey[1]
     JOIN pg_attribute b ON b.attrelid = k.confrelid AND b.attnum = k.confkey[1]
     JOIN pg_class c ON c.oid = k.confrelid JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE k.contype = 'f' AND k.conrelid = $1::regclass AND array_length(k.conkey, 1) = 1`,
    [tabla],
  );
  const pares = await paresMismoTenant(pg, tabla);
  const reales = new Set(fk.rows.map((f) => f.columna));
  return [...fk.rows, ...pares.filter((p) => !reales.has(p.columna))];
}

/** Pares (columna → tabla) de los triggers `core.verificar_mismo_tenant`, desde `pg_trigger.tgargs`. */
export async function paresMismoTenant(
  pg: Client,
  tabla?: string,
): Promise<(Referencia & { origen: string })[]> {
  const r = await pg.query<{ origen: string; args: Buffer }>(
    `SELECT format('%I.%I', n.nspname, c.relname) AS origen, g.tgargs AS args
     FROM pg_trigger g JOIN pg_class c ON c.oid = g.tgrelid JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE g.tgfoid = 'core.verificar_mismo_tenant'::regproc AND NOT g.tgisinternal
       AND ($1::text IS NULL OR g.tgrelid = $1::regclass)`,
    [tabla ?? null],
  );
  return r.rows.flatMap(({ origen, args }) => {
    const partes = args.toString("utf8").split("\0").filter(Boolean);
    const pares: (Referencia & { origen: string })[] = [];
    for (let i = 0; i + 1 < partes.length; i += 2) {
      pares.push({
        origen,
        columna: partes[i] ?? "",
        tabla: partes[i + 1] ?? "",
        columnaRef: "id",
      });
    }
    return pares;
  });
}

async function unicas(pg: Client, tabla: string): Promise<Set<string>> {
  const r = await pg.query<{ col: string }>(
    `SELECT DISTINCT a.attname AS col FROM pg_index i
     JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY (i.indkey)
     WHERE i.indrelid = $1::regclass AND i.indisunique`,
    [tabla],
  );
  return new Set(r.rows.map((f) => f.col));
}

export async function describir(pg: Client, tabla: string): Promise<Tabla> {
  return {
    nombre: tabla,
    columnas: await columnas(pg, tabla),
    referencias: await referencias(pg, tabla),
    unicas: await unicas(pg, tabla),
  };
}
