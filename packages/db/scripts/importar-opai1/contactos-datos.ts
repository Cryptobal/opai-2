// Datos normalizados de un contacto de 1.0 y la regla del principal por cuenta (puro).
import type { Aviso } from "./comun";
import { correo, telefono, textoLimpio } from "./normalizar";
import type { ContactoOpai1 } from "./origen";

/** `cuentaId` es la cuenta 2.0 existente o la clave `nueva:<id 1.0>` de la que se crearía. */
export type DatosContacto = {
  cuentaId: string;
  nombres: string;
  apellidos: string;
  email: string | null;
  telefono: string | null;
  cargo: string | null;
  esPrincipal: boolean;
  roles: string[];
};

/**
 * `recibe*` de 1.0 → roles del contacto en 2.0. `recibeNotasCredito` se funde en `facturacion`.
 * `recibeCesion` no tiene rol en el `Contacto` de main (llega con el vínculo del CRM PR 2): se avisa.
 */
export function rolesDeContacto(f: ContactoOpai1): string[] {
  const roles = new Set<string>();
  if (f.recibeFacturacion || f.recibeNotasCredito) roles.add("facturacion");
  if (f.recibeCobranza) roles.add("cobranza");
  if (f.recibeOperacional) roles.add("operacional");
  if (f.recibeCesion) roles.add("cesion");
  return [...roles].sort();
}

export function datosContacto(f: ContactoOpai1, cuentaId: string, avisos: Aviso[]): DatosContacto {
  const email = correo(f.email);
  const tel = telefono(f.phone);
  if (textoLimpio(f.email) && !email) avisos.push({ codigo: "correo_invalido", idOpai1: f.id });
  if (textoLimpio(f.phone) && !tel) avisos.push({ codigo: "telefono_invalido", idOpai1: f.id });
  return {
    cuentaId,
    nombres: textoLimpio(f.firstName) ?? "",
    apellidos: textoLimpio(f.lastName) ?? "",
    email,
    telefono: tel,
    cargo: textoLimpio(f.roleTitle),
    esPrincipal: f.isPrimary,
    roles: rolesDeContacto(f),
  };
}

/**
 * Si `isPrimary` se repite en una cuenta, gana el contacto actualizado más recientemente (empate:
 * id mayor) y los demás pierden la marca; cada perdedor se reporta.
 */
export function resolverPrincipales(
  filas: readonly { fila: ContactoOpai1; datos: DatosContacto }[],
  avisos: Aviso[],
): void {
  const porCuenta = new Map<string, { fila: ContactoOpai1; datos: DatosContacto }[]>();
  for (const x of filas) {
    if (!x.datos.esPrincipal) continue;
    porCuenta.set(x.datos.cuentaId, [...(porCuenta.get(x.datos.cuentaId) ?? []), x]);
  }
  for (const grupo of porCuenta.values()) {
    if (grupo.length < 2) continue;
    const orden = [...grupo].sort(
      (a, b) =>
        Date.parse(b.fila.updatedAt) - Date.parse(a.fila.updatedAt) ||
        b.fila.id.localeCompare(a.fila.id),
    );
    for (const perdedor of orden.slice(1)) {
      perdedor.datos.esPrincipal = false;
      avisos.push({ codigo: "principal_repetido", idOpai1: perdedor.fila.id });
    }
  }
}
