// Plan de contactos (CrmContact → persona única + core.contacto_cuentas). Mismo correo en cuentas
// distintas es una sola persona con un vínculo por cuenta (ADR-040 §5).
/* eslint-disable max-lines -- reglas N–N y vínculos (CAR-25) */
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
import { propuestasContactos } from "./contactos-propuestas";
import { type DatosContacto, datosContacto, resolverPrincipales } from "./contactos-datos";
import type { CuentaResuelta } from "./cuentas";
import type { ContactoDestino, EstadoDestino, VinculoDestino } from "./destino-tipos";
import type { ContactoOpai1 } from "./origen";

export type PlanContactos = {
  decisiones: Decision<DatosContacto>[];
  propuestas: Propuesta[];
  avisos: Aviso[];
};

type Resolver = (id: string | null | undefined) => CuentaResuelta | null | undefined;
type Fila = { fila: ContactoOpai1; datos: DatosContacto; cuenta: CuentaResuelta };

/** Vínculo adicional de la misma persona (correo) en otra cuenta. */
export const MOTIVO_VINCULO_PERSONA = "persona_unica_vinculo";
/** @deprecated Usar MOTIVO_VINCULO_PERSONA; alias para tests heredados. */
export const MOTIVO_NN = MOTIVO_VINCULO_PERSONA;

function vinculoDe(
  destino: EstadoDestino,
  contactoId: string,
  cuentaId: string | null,
): VinculoDestino | undefined {
  if (!cuentaId) return undefined;
  return destino.vinculos.find((v) => v.contactoId === contactoId && v.cuentaId === cuentaId);
}

function camposVinculo(propuesto: DatosContacto, v: VinculoDestino): string[] {
  return camposDistintos(
    {
      cargo: propuesto.cargo,
      roles: propuesto.roles,
      esPrincipal: propuesto.esPrincipal,
    },
    v,
  );
}

function personaPorEmail(destino: EstadoDestino, email: string): ContactoDestino | undefined {
  return destino.contactos.find((c) => c.email === email);
}

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

  const canonEmail = new Map<string, string>();
  for (const { fila, datos } of validas) {
    if (!datos.email || canonEmail.has(datos.email)) continue;
    canonEmail.set(datos.email, fila.id);
  }

  const canonicas = new Map<string, Decision<DatosContacto>>();

  for (const { fila, datos, cuenta } of validas) {
    const mapeado = ids.porExterno.get(fila.id);
    const canonId = datos.email ? canonEmail.get(datos.email) : undefined;
    if (datos.email && canonId && canonId !== fila.id && !mapeado) {
      const filaCanon = validas.find((v) => v.fila.id === canonId);
      if (filaCanon && filaCanon.cuenta.clave !== cuenta.clave) {
        decisiones.push(
          decision("contacto", fila.id, "actualizar", {
            motivo: MOTIVO_VINCULO_PERSONA,
            fusionaCon: canonId,
            datos,
          }),
        );
        continue;
      }
    }

    const clave = datos.email ? `${cuenta.clave}|${datos.email}` : null;
    const canonica = clave ? canonicas.get(clave) : undefined;
    if (canonica) {
      decisiones.push(
        decisionDuplicado("contacto", fila.id, canonica, mapeado, "duplicado_correo_misma_cuenta"),
      );
      continue;
    }

    const persona = datos.email ? personaPorEmail(destino, datos.email) : undefined;
    const existenteMismaCuenta = destino.contactos.find(
      (c) => datos.email !== null && c.email === datos.email && c.cuentaId === cuenta.destinoId,
    );

    let d: Decision<DatosContacto>;
    if (mapeado) {
      const actual = actuales.get(mapeado);
      const v = vinculoDe(destino, mapeado, cuenta.destinoId);
      if (v) {
        const cv = camposVinculo(datos, v);
        const camposPersona = actual
          ? camposDistintos(
              {
                nombres: datos.nombres,
                apellidos: datos.apellidos,
                email: datos.email,
                telefono: datos.telefono,
              },
              actual,
            )
          : [];
        const campos = [...new Set([...camposPersona, ...cv])].sort();
        d =
          campos.length === 0
            ? decision("contacto", fila.id, "sin_cambios", { destinoId: mapeado, datos })
            : decision("contacto", fila.id, "actualizar", {
                destinoId: mapeado,
                campos,
                datos,
                motivo: "cambian_campos",
              });
      } else {
        d = decisionMapeada("contacto", fila.id, datos, actual, mapeado);
      }
    } else if (persona && persona.cuentaId !== cuenta.destinoId) {
      const v = vinculoDe(destino, persona.id, cuenta.destinoId);
      if (v) {
        const campos = camposVinculo(datos, v);
        d =
          campos.length === 0
            ? decision("contacto", fila.id, "sin_cambios", { destinoId: persona.id, datos })
            : decision("contacto", fila.id, "actualizar", {
                motivo: "vincula_persona_correo",
                destinoId: persona.id,
                campos,
                datos,
              });
      } else {
        d = decision("contacto", fila.id, "actualizar", {
          motivo: "vincula_persona_correo",
          destinoId: persona.id,
          datos,
        });
      }
    } else if (!existenteMismaCuenta) d = decision("contacto", fila.id, "crear", { datos });
    else if (ids.mapeadoAOtro(existenteMismaCuenta.id, [fila.id]))
      d = decision("contacto", fila.id, "conflicto", {
        motivo: "correo_ya_mapeado",
        destinoId: existenteMismaCuenta.id,
      });
    else {
      const v = vinculoDe(destino, existenteMismaCuenta.id, cuenta.destinoId);
      d = {
        ...decisionMapeada("contacto", fila.id, datos, existenteMismaCuenta, existenteMismaCuenta.id),
        accion: "actualizar",
        motivo: "vincula_por_correo",
        campos: v ? camposVinculo(datos, v) : camposDistintos(datos, existenteMismaCuenta),
      };
    }
    if (clave) canonicas.set(clave, d);
    decisiones.push(d);
  }
  return {
    decisiones,
    propuestas: propuestasContactos(validas, decisiones, destino),
    avisos,
  };
}
