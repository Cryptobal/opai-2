// Plan de cuentas (CrmAccount → core.cuentas). Dedupe determinista por RUT normalizado (P10); sin
// RUT, el nombre canónico solo genera propuestas de fusión, nunca una fusión automática (R28).
/* eslint-disable max-lines -- reglas RUT, vinculo y propuestas (CAR-25/157) */
import {
  type Aviso,
  type Decision,
  decision,
  decisionDuplicado,
  decisionMapeada,
  indiceIds,
  ordenEstable,
  type Propuesta,
} from "./comun";
import { completarVacios } from "./completar-vacios";
import type { EstadoDestino } from "./destino-tipos";
import { correo, nombreCanonico, rut, textoLimpio } from "./normalizar";
import type { CuentaOpai1 } from "./origen";

export type DatosCuenta = {
  nombre: string;
  razonSocial: string | null;
  rut: string | null;
  giro: string | null;
  calle: string | null;
  comuna: string | null;
  ciudad: string | null;
  emailDte: string | null;
  estado: "prospecto" | "cliente_activo" | "cliente_inactivo";
  escrituraNotaria: string | null;
  escrituraFecha: string | null;
  clienteDesde: string | null;
  clienteHasta: string | null;
  representanteNombre: string | null;
  representanteRut: string | null;
};

export type PlanCuentas = {
  decisiones: Decision<DatosCuenta>[];
  propuestas: Propuesta[];
  avisos: Aviso[];
};

const RE_DIA = /^\d{4}-\d{2}-\d{2}/;
const dia = (v: string | null | undefined) => {
  const t = textoLimpio(v);
  return t && RE_DIA.test(t) ? t.slice(0, 10) : null;
};

/** `status` de 1.0; si falta, `type` / `isActive` heredados. Sin información queda prospecto. */
export function estadoCuenta(f: CuentaOpai1): DatosCuenta["estado"] {
  const status = textoLimpio(f.status)?.toLowerCase();
  if (status === "client_active") return "cliente_activo";
  if (status === "client_inactive") return "cliente_inactivo";
  if (status === "prospect") return "prospecto";
  const tipo = textoLimpio(f.type)?.toLowerCase();
  if (tipo === "client" || tipo === "cliente")
    return f.isActive === false ? "cliente_inactivo" : "cliente_activo";
  return "prospecto";
}

/** La razón social sale solo de `legalName`: nunca se rellena con el nombre de fantasía. */
export function datosCuenta(f: CuentaOpai1): DatosCuenta {
  const rep = textoLimpio(f.legalRepresentativeName);
  const repRut = rut(f.legalRepresentativeRut);
  return {
    nombre: textoLimpio(f.name) ?? f.name,
    razonSocial: textoLimpio(f.legalName),
    rut: rut(f.rut),
    giro: textoLimpio(f.giro),
    calle: textoLimpio(f.address),
    comuna: textoLimpio(f.commune),
    ciudad: textoLimpio(f.city),
    emailDte: correo(f.emailDte),
    estado: estadoCuenta(f),
    escrituraNotaria: textoLimpio(f.notaryName),
    escrituraFecha: dia(f.notaryDate),
    clienteDesde: dia(f.startDate),
    clienteHasta: dia(f.endDate),
    representanteNombre: rep && repRut ? rep : null,
    representanteRut: rep && repRut ? repRut : null,
  };
}

/** `prospecto` es el estado por defecto de 2.0: equivale a «sin dato» y puede completarse. */
export const EQUIVALENTES_CUENTA = { estado: "prospecto" } as const;

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
    if (!datos.razonSocial) avisos.push({ codigo: "cuenta_no_lista_sin_razon_social", idOpai1: f.id });
    const mapeado = ids.porExterno.get(f.id);
    const canonica = datos.rut ? canonPorRut.get(datos.rut) : undefined;
    if (canonica) {
      decisiones.push(decisionDuplicado("cuenta", f.id, canonica, mapeado, "duplicado_rut"));
      continue;
    }
    let d: Decision<DatosCuenta>;
    const existente = datos.rut ? porRut.get(datos.rut) : undefined;
    if (mapeado)
      d = decisionMapeada("cuenta", f.id, datos, actuales.get(mapeado), mapeado, EQUIVALENTES_CUENTA);
    else if (!existente) d = decision("cuenta", f.id, "crear", { datos });
    else if (ids.mapeadoAOtro(existente.id, [f.id]))
      d = decision("cuenta", f.id, "conflicto", {
        motivo: "rut_ya_mapeado",
        destinoId: existente.id,
      });
    else {
      const { escribir, conflictos } = completarVacios(datos, existente, EQUIVALENTES_CUENTA);
      d = decision("cuenta", f.id, "actualizar", {
        motivo: "vincula_por_rut",
        destinoId: existente.id,
        campos: Object.keys(escribir),
        conflictos,
        datos,
      });
    }
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

export type ResolverCuentasFn = ReturnType<typeof resolverCuentas>;
