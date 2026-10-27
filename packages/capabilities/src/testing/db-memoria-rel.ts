// Relaciones de la base en memoria: include (uno y muchos, anidado), `_count` filtrado y filtros de
// relación en el where (`some`/`none`). Imita el subconjunto de Prisma que usan los handlers del núcleo.
import { cumple, type Fila, ordenar, type Where } from "./db-memoria-util";

type Rel = { tabla: string; clave: string; muchos?: boolean };

/** Relaciones por modelo: `clave` es la columna FK (local en «uno», del hijo en «muchos»). */
export const RELACIONES: Record<string, Record<string, Rel>> = {
  membership: {
    user: { tabla: "user", clave: "userId" },
    tenant: { tabla: "tenant", clave: "tenantId" },
    rolTenant: { tabla: "rol", clave: "roleId" },
  },
  apiKey: { user: { tabla: "user", clave: "userId" } },
  permisoExcepcion: { creadoPorUsuario: { tabla: "user", clave: "creadoPor" } },
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
  instalacion: {
    cuenta: { tabla: "cuenta", clave: "cuentaId" },
    puestos: { tabla: "puesto", clave: "instalacionId", muchos: true },
  },
  estructuraSueldo: { items: { tabla: "estructuraItem", clave: "estructuraId", muchos: true } },
  documentoVinculo: { documento: { tabla: "documento", clave: "documentoId" } },
  puesto: {
    instalacion: { tabla: "instalacion", clave: "instalacionId" },
    cargo: { tabla: "cargo", clave: "cargoId" },
    patron: { tabla: "patronTurno", clave: "patronId" },
    funcion: { tabla: "funcionPuesto", clave: "funcionId" },
  },
  documento: { vinculos: { tabla: "documentoVinculo", clave: "documentoId", muchos: true } },
};

type Tabla = (nombre: string) => Fila[];
type IncludeArg = {
  where?: Where;
  orderBy?: unknown;
  take?: number;
  include?: Include;
  select?: Include;
};
export type Include = Record<string, boolean | IncludeArg | { select?: Record<string, unknown> }>;
export type IncluirArgs = { include?: Include; select?: Include };

function contar(
  tabla: Tabla,
  modelo: string,
  fila: Fila,
  select: Record<string, unknown> = {},
): Fila {
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

/** Resuelve relaciones de `include` y `select` (uno/muchos, anidado y `_count`) sobre una fila. */
export function incluir(tabla: Tabla, modelo: string, fila: Fila, args?: IncluirArgs): Fila {
  if (!args?.include && !args?.select) return { ...fila };
  const out: Fila = { ...fila };
  // `select` solo resuelve relaciones conocidas (los campos escalares ya están en la fila cruda);
  // `include` además admite un belongs-to no registrado por `${rel}Id` (como la versión anterior).
  const procesar = (spec: Include, soloConocidas: boolean) => {
    for (const [rel, arg] of Object.entries(spec)) {
      if (!arg) continue;
      // `true` en un include resuelve la relación sin sub-args; en un select es un campo escalar.
      if (arg === true && soloConocidas) continue;
      if (rel === "_count") {
        const sel = (arg as { select?: Record<string, unknown> }).select;
        out["_count"] = contar(tabla, modelo, fila, sel);
        continue;
      }
      const reg = RELACIONES[modelo]?.[rel];
      if (!reg && soloConocidas) continue;
      const def = reg ?? { tabla: rel, clave: `${rel}Id` };
      const a: IncludeArg = arg === true ? {} : (arg as IncludeArg);
      if (def.muchos) {
        let hijos = tabla(def.tabla).filter(
          (f) => f[def.clave] === fila["id"] && cumple(f, a.where),
        );
        hijos = ordenar(hijos, a.orderBy);
        if (a.take != null) hijos = hijos.slice(0, a.take);
        out[rel] = hijos.map((h) => incluir(tabla, def.tabla, h, a));
      } else {
        const padre = tabla(def.tabla).find((f) => f["id"] === fila[def.clave]);
        out[rel] = padre ? incluir(tabla, def.tabla, padre, a) : null;
      }
    }
  };
  if (args.include) procesar(args.include, false);
  if (args.select) procesar(args.select, true);
  return out;
}

/** Resuelve relaciones y conectores sin sobrescribir los predicados escalares de la consulta. */
export function resolverWhereRelaciones(
  tabla: Tabla,
  modelo: string,
  where?: Where,
): Where | undefined {
  if (!where) return where;
  const condiciones: Where[] = [];
  for (const [k, v] of Object.entries(where)) {
    const def = RELACIONES[modelo]?.[k];
    if ((k === "AND" || k === "OR") && Array.isArray(v)) {
      condiciones.push({ [k]: v.map((w: Where) => resolverWhereRelaciones(tabla, modelo, w)) });
    } else if (k === "NOT" && v && typeof v === "object" && !Array.isArray(v)) {
      condiciones.push({ NOT: resolverWhereRelaciones(tabla, modelo, v as Where) });
    } else if (def?.muchos && v && typeof v === "object" && ("some" in v || "none" in v)) {
      const rel = v as { some?: Where; none?: Where };
      const relWhere = resolverWhereRelaciones(tabla, def.tabla, rel.some ?? rel.none);
      const ids = [
        ...new Set(
          tabla(def.tabla)
            .filter((f) => cumple(f, relWhere))
            .map((f) => f[def.clave]),
        ),
      ];
      condiciones.push({ id: "some" in rel ? { in: ids } : { notIn: ids } });
    } else if (def && !def.muchos && v && typeof v === "object") {
      const relWhere = resolverWhereRelaciones(tabla, def.tabla, v as Where);
      const ids = tabla(def.tabla)
        .filter((f) => cumple(f, relWhere))
        .map((f) => f["id"]);
      condiciones.push({ [def.clave]: { in: ids } });
    } else {
      condiciones.push({ [k]: v });
    }
  }
  return { AND: condiciones };
}
