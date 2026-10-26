// Relaciones de la base en memoria: include (uno y muchos, anidado), `_count` filtrado y filtros de
// relación en el where (`some`/`none`). Imita el subconjunto de Prisma que usan los handlers del núcleo.
import { cumple, type Fila, ordenar, type Where } from "./db-memoria-util";

type Rel = { tabla: string; clave: string; muchos?: boolean };

/** Relaciones por modelo: `clave` es la columna FK (local en «uno», del hijo en «muchos»). */
export const RELACIONES: Record<string, Record<string, Rel>> = {
  membership: { user: { tabla: "user", clave: "userId" }, tenant: { tabla: "tenant", clave: "tenantId" } },
  apiKey: { user: { tabla: "user", clave: "userId" } },
  persona: { vinculos: { tabla: "vinculoLaboral", clave: "personaId", muchos: true } },
  vinculoLaboral: { cargo: { tabla: "cargo", clave: "cargoId" } },
  cuenta: {
    instalaciones: { tabla: "instalacion", clave: "cuentaId", muchos: true },
    contactos: { tabla: "contacto", clave: "cuentaId", muchos: true },
  },
  cargo: {
    vinculos: { tabla: "vinculoLaboral", clave: "cargoId", muchos: true },
    puestos: { tabla: "puesto", clave: "cargoId", muchos: true },
    estructuras: { tabla: "estructuraSueldo", clave: "cargoId", muchos: true },
  },
  instalacion: { cuenta: { tabla: "cuenta", clave: "cuentaId" } },
  documentoVinculo: { documento: { tabla: "documento", clave: "documentoId" } },
};

type Tabla = (nombre: string) => Fila[];
type IncludeArg = { where?: Where; orderBy?: unknown; take?: number; include?: Include; select?: unknown };
type Include = Record<string, boolean | IncludeArg | { select?: Record<string, boolean | IncludeArg> }>;

function contar(tabla: Tabla, modelo: string, fila: Fila, select: Record<string, unknown> = {}): Fila {
  const c: Fila = {};
  for (const [rel, arg] of Object.entries(select)) {
    const def = RELACIONES[modelo]?.[rel];
    const where = arg && typeof arg === "object" ? (arg as IncludeArg).where : undefined;
    c[rel] = def
      ? tabla(def.tabla).filter((f) => f[def.clave] === fila["id"] && cumple(f, where)).length
      : 0;
  }
  return c;
}

/** Resuelve `include` (uno/muchos, anidado y `_count`) sobre una fila. */
export function incluir(tabla: Tabla, modelo: string, fila: Fila, include?: Include): Fila {
  if (!include) return { ...fila };
  const out: Fila = { ...fila };
  for (const [rel, arg] of Object.entries(include)) {
    if (!arg) continue;
    if (rel === "_count") {
      out["_count"] = contar(tabla, modelo, fila, (arg as { select?: Record<string, unknown> }).select);
      continue;
    }
    // Relaciones no registradas: belongs-to por `${rel}Id` (como hacía la versión anterior).
    const def = RELACIONES[modelo]?.[rel] ?? { tabla: rel, clave: `${rel}Id` };
    const a: IncludeArg = arg === true ? {} : (arg as IncludeArg);
    if (def.muchos) {
      let hijos = tabla(def.tabla).filter((f) => f[def.clave] === fila["id"] && cumple(f, a.where));
      hijos = ordenar(hijos, a.orderBy);
      if (a.take != null) hijos = hijos.slice(0, a.take);
      out[rel] = hijos.map((h) => incluir(tabla, def.tabla, h, a.include));
    } else {
      const padre = tabla(def.tabla).find((f) => f["id"] === fila[def.clave]);
      out[rel] = padre ? incluir(tabla, def.tabla, padre, a.include) : null;
    }
  }
  return out;
}

/** Convierte filtros de relación del where (`rel: { some|none: {...} }`) a filtros por id. */
export function resolverWhereRelaciones(tabla: Tabla, modelo: string, where?: Where): Where | undefined {
  if (!where) return where;
  const out: Where = {};
  for (const [k, v] of Object.entries(where)) {
    const def = RELACIONES[modelo]?.[k];
    if (def?.muchos && v && typeof v === "object" && ("some" in v || "none" in v)) {
      const rel = v as { some?: Where; none?: Where };
      const relWhere = rel.some ?? rel.none;
      const ids = [
        ...new Set(
          tabla(def.tabla)
            .filter((f) => cumple(f, relWhere))
            .map((f) => f[def.clave]),
        ),
      ];
      out["id"] = "some" in rel ? { in: ids } : { notIn: ids };
    } else {
      out[k] = v;
    }
  }
  return out;
}
