// Plan de contactos (CrmContact → core.contactos). En main el contacto tiene UNA cuenta: el mismo
// correo en cuentas distintas es una persona N–N que llega con el CRM PR 2, así que se reporta como
// conflicto y no se resuelve aquí. Duplicados en la misma cuenta se funden (mismo correo).
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
import { propuestasContactos } from "./contactos-propuestas";
import { type DatosContacto, datosContacto, resolverPrincipales } from "./contactos-datos";
import type { CuentaResuelta } from "./cuentas";
import type { EstadoDestino } from "./destino-tipos";
import type { ContactoOpai1 } from "./origen";

export type PlanContactos = {
  decisiones: Decision<DatosContacto>[];
  propuestas: Propuesta[];
  avisos: Aviso[];
};

type Resolver = (id: string | null | undefined) => CuentaResuelta | null | undefined;
type Fila = { fila: ContactoOpai1; datos: DatosContacto; cuenta: CuentaResuelta };

export const MOTIVO_NN = "requiere_nn_crm_pr2";

export function planContactos(
  filas: readonly ContactoOpai1[],
  resolver: Resolver,
  destino: EstadoDestino,
): PlanContactos {
  const ids = indiceIds(destino, "contacto");
  const actuales = new Map(destino.contactos.map((c) => [c.id, c]));
  const avisos: Aviso[] = [];
  const decisiones: Decision<DatosContacto>[] = [];
  const validas: Fila[] = [];
  for (const fila of ordenEstable(filas)) {
    const cuenta = resolver(fila.accountId);
    if (!cuenta) {
      const motivo = cuenta === null ? "cuenta_no_resuelta" : "cuenta_inexistente";
      decisiones.push(decision("contacto", fila.id, "omitido", { motivo }));
      continue;
    }
    validas.push({ fila, cuenta, datos: datosContacto(fila, cuenta.clave, avisos) });
  }
  resolverPrincipales(validas, avisos);
  const nn = correosMultiCuenta(validas, destino, ids.porDestino);
  const canonicas = new Map<string, Decision<DatosContacto>>();

  for (const { fila, datos, cuenta } of validas) {
    const mapeado = ids.porExterno.get(fila.id);
    if (datos.email && nn.has(datos.email)) {
      decisiones.push(decision("contacto", fila.id, "conflicto", { motivo: MOTIVO_NN }));
      continue;
    }
    const clave = datos.email ? `${cuenta.clave}|${datos.email}` : null;
    const canonica = clave ? canonicas.get(clave) : undefined;
    if (canonica) {
      decisiones.push(
        decisionDuplicado("contacto", fila.id, canonica, mapeado, "duplicado_correo_misma_cuenta"),
      );
      continue;
    }
    const existente = destino.contactos.find(
      (c) => datos.email !== null && c.email === datos.email && c.cuentaId === cuenta.destinoId,
    );
    let d: Decision<DatosContacto>;
    if (mapeado) d = decisionMapeada("contacto", fila.id, datos, actuales.get(mapeado), mapeado);
    else if (!existente) d = decision("contacto", fila.id, "crear", { datos });
    else if (ids.mapeadoAOtro(existente.id, [fila.id]))
      d = decision("contacto", fila.id, "conflicto", {
        motivo: "correo_ya_mapeado",
        destinoId: existente.id,
      });
    else
      d = {
        ...decisionMapeada("contacto", fila.id, datos, existente, existente.id),
        accion: "actualizar",
        motivo: "vincula_por_correo",
      };
    if (clave) canonicas.set(clave, d);
    decisiones.push(d);
  }
  return {
    decisiones,
    propuestas: propuestasContactos(validas, decisiones, destino),
    avisos,
  };
}

/** Correos que aparecen en más de una cuenta (1.0, o 1.0 + 2.0 no mapeado): persona N–N. */
function correosMultiCuenta(
  filas: readonly Fila[],
  destino: EstadoDestino,
  mapeados: ReadonlyMap<string, string[]>,
): Set<string> {
  const cuentas = new Map<string, Set<string>>();
  const agregar = (email: string, cuenta: string) =>
    cuentas.set(email, (cuentas.get(email) ?? new Set()).add(cuenta));
  for (const f of filas) if (f.datos.email) agregar(f.datos.email, f.cuenta.clave);
  for (const c of destino.contactos) {
    if (c.email && cuentas.has(c.email) && !mapeados.has(c.id)) agregar(c.email, c.cuentaId);
  }
  return new Set([...cuentas].filter(([, s]) => s.size > 1).map(([email]) => email));
}
