// Plan de cuentas (CrmAccount → core.cuentas). Dedupe determinista por RUT normalizado (P10); sin
// RUT, el nombre canónico solo genera propuestas de fusión, nunca una fusión automática (R28).
import {
  type Aviso,
  camposDistintos,
  type Decision,
  decision,
  decisionDuplicado,
  decisionMapeada,
  indiceIds,
  ordenEstable,
  type Propuesta,
} from "./comun";
import type { EstadoDestino } from "./destino-tipos";
import { nombreCanonico, rut, textoLimpio } from "./normalizar";
import type { CuentaOpai1 } from "./origen";

export type DatosCuenta = { nombre: string; razonSocial: string | null; rut: string | null };

export type PlanCuentas = {
  decisiones: Decision<DatosCuenta>[];
  propuestas: Propuesta[];
  avisos: Aviso[];
};

export function datosCuenta(f: CuentaOpai1): DatosCuenta {
  return {
    nombre: textoLimpio(f.name) ?? f.name,
    razonSocial: textoLimpio(f.legalName),
    rut: rut(f.rut),
  };
}

export function planCuentas(filas: readonly CuentaOpai1[], destino: EstadoDestino): PlanCuentas {
  const ids = indiceIds(destino, "cuenta");
  const actuales = new Map(destino.cuentas.map((c) => [c.id, c]));
  const porRut = new Map(destino.cuentas.flatMap((c) => (c.rut ? [[c.rut, c] as const] : [])));
  const canonPorRut = new Map<string, Decision<DatosCuenta>>();
  const decisiones: Decision<DatosCuenta>[] = [];
  const avisos: Aviso[] = [];

  for (const f of ordenEstable(filas)) {
    const datos = datosCuenta(f);
    if (textoLimpio(f.rut) && !datos.rut) avisos.push({ codigo: "rut_invalido", idOpai1: f.id });
    const mapeado = ids.porExterno.get(f.id);
    const canonica = datos.rut ? canonPorRut.get(datos.rut) : undefined;
    if (canonica) {
      decisiones.push(decisionDuplicado("cuenta", f.id, canonica, mapeado, "duplicado_rut"));
      continue;
    }
    let d: Decision<DatosCuenta>;
    const existente = datos.rut ? porRut.get(datos.rut) : undefined;
    if (mapeado) d = decisionMapeada("cuenta", f.id, datos, actuales.get(mapeado), mapeado);
    else if (!existente) d = decision("cuenta", f.id, "crear", { datos });
    else if (ids.mapeadoAOtro(existente.id, [f.id]))
      d = decision("cuenta", f.id, "conflicto", {
        motivo: "rut_ya_mapeado",
        destinoId: existente.id,
      });
    else
      d = decision("cuenta", f.id, "actualizar", {
        motivo: "vincula_por_rut",
        destinoId: existente.id,
        campos: camposDistintos(datos, existente),
        datos,
      });
    if (datos.rut) canonPorRut.set(datos.rut, d);
    decisiones.push(d);
  }
  return { decisiones, propuestas: propuestasPorNombre(filas, decisiones, destino), avisos };
}

/**
 * Para cada nombre canónico con al menos una cuenta de 1.0 sin RUT: si hay más de una fila (de 1.0
 * o de 2.0 no mapeada a esas filas) con ese nombre, se propone la fusión para que Carlos decida.
 */
function propuestasPorNombre(
  filas: readonly CuentaOpai1[],
  decisiones: readonly Decision<DatosCuenta>[],
  destino: EstadoDestino,
): Propuesta[] {
  const porId = new Map(decisiones.map((d) => [d.idOpai1, d]));
  const claves = new Set(filas.filter((f) => !rut(f.rut)).map((f) => nombreCanonico(f.name)));
  const propuestas: Propuesta[] = [];
  for (const clave of [...claves].sort()) {
    const grupo = ordenEstable(filas)
      .filter((f) => nombreCanonico(f.name) === clave && porId.get(f.id)?.fusionaCon === null)
      .map((f) => f.id);
    const propios = new Set(grupo.map((id) => porId.get(id)?.destinoId).filter(Boolean));
    const idsDestino = destino.cuentas
      .filter((c) => nombreCanonico(c.nombre) === clave && !propios.has(c.id))
      .map((c) => c.id)
      .sort();
    if (grupo.length + idsDestino.length > 1)
      propuestas.push({
        entidad: "cuenta",
        criterio: "nombre_canonico",
        idsOpai1: grupo,
        idsDestino,
      });
  }
  return propuestas;
}

/** Cuenta de destino de una fila: existente (`destinoId`) o por crear (`clave` = nueva:<id 1.0>). */
export type CuentaResuelta = { clave: string; destinoId: string | null };

/**
 * Resuelve un id de cuenta de 1.0 a su cuenta 2.0 siguiendo la fusión por RUT. `undefined` si la
 * cuenta no viene en el origen; `null` si quedó en conflicto u omitida sin fusión.
 */
export function resolverCuentas(
  decisiones: readonly Decision<DatosCuenta>[],
): (idOpai1: string | null | undefined) => CuentaResuelta | null | undefined {
  const porId = new Map(decisiones.map((d) => [d.idOpai1, d]));
  return (idOpai1) => {
    if (!idOpai1) return undefined;
    let d = porId.get(idOpai1);
    if (!d) return undefined;
    if (d.fusionaCon && d.accion !== "conflicto") d = porId.get(d.fusionaCon) ?? d;
    if (d.accion === "conflicto" || d.accion === "omitido") return null;
    return { clave: d.destinoId ?? `nueva:${d.idOpai1}`, destinoId: d.destinoId };
  };
}
