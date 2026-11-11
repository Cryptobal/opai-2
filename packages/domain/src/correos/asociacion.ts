// Asociación de un correo a una cuenta y un contacto (CAR-233, decisión de Carlos del 10-nov-2026).
// Lógica pura: recibe las contrapartes del correo (las direcciones del cliente) y los candidatos que la
// capacidad ya leyó de la empresa; nunca decide con el cuerpo ni el asunto.
//   1. Correo exacto de un contacto.
//   2. Si no calza, dominio de la empresa según `sitioWeb` (solo dominios no genéricos).
//   3. Si no se puede asociar, o calza con más de una cuenta: «sin asignar» (se asocia a mano).
import { correoDeDireccion, dominioCalza, dominioDeCorreo, dominioDeSitio, esDominioGenerico } from "./direcciones";

/** Contacto candidato: su correo y su cuenta principal (`core.contactos.cuenta_id`). */
export type ContactoCandidato = { id: string; email: string; cuentaId: string };
export type CuentaCandidata = { id: string; sitioWeb: string | null };

export type ResultadoAsociacion =
  | { tipo: "contacto"; cuentaId: string; contactoId: string | null }
  | { tipo: "dominio"; cuentaId: string }
  | { tipo: "sin_asignar"; motivo: "sin_contraparte" | "generico" | "sin_calce" | "ambiguo" };

/** Correos normalizados y únicos de una lista de direcciones (descarta lo que no es un correo). */
export const correosDe = (direcciones: readonly string[]): string[] => [
  ...new Set(direcciones.map(correoDeDireccion).filter((c): c is string => c !== null)),
];

export function asociarCorreo(
  contrapartes: readonly string[],
  contactos: readonly ContactoCandidato[],
  cuentas: readonly CuentaCandidata[],
): ResultadoAsociacion {
  const correos = correosDe(contrapartes);
  if (!correos.length) return { tipo: "sin_asignar", motivo: "sin_contraparte" };

  // 1. Correo exacto. Varios contactos de la misma cuenta: cuenta sí, contacto no (no se adivina cuál).
  const exactos = contactos.filter((c) => correos.includes(c.email.trim().toLowerCase()));
  if (exactos.length) {
    const cuentasExactas = [...new Set(exactos.map((c) => c.cuentaId))];
    if (cuentasExactas.length > 1) return { tipo: "sin_asignar", motivo: "ambiguo" };
    const ids = [...new Set(exactos.map((c) => c.id))];
    return { tipo: "contacto", cuentaId: cuentasExactas[0] as string, contactoId: ids.length === 1 ? (ids[0] as string) : null };
  }

  // 2. Dominio de `sitioWeb`, solo para dominios que no sean de correo personal o genérico.
  const dominios = [...new Set(correos.map(dominioDeCorreo).filter((d): d is string => d !== null))];
  const propios = dominios.filter((d) => !esDominioGenerico(d));
  if (!propios.length) return { tipo: "sin_asignar", motivo: "generico" };
  const sitios = cuentas.flatMap((c) => {
    const d = dominioDeSitio(c.sitioWeb);
    return d ? [{ id: c.id, dominio: d }] : [];
  });
  const calzan = [...new Set(sitios.filter((s) => propios.some((d) => dominioCalza(d, s.dominio))).map((s) => s.id))];
  if (calzan.length === 1) return { tipo: "dominio", cuentaId: calzan[0] as string };
  return { tipo: "sin_asignar", motivo: calzan.length > 1 ? "ambiguo" : "sin_calce" };
}
