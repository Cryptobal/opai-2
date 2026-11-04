// Prueba de conexión con Octava: pide (o reutiliza) el token con el RUT y la contraseña de acceso. No cede nada.
import { clienteOctava } from "./octava-cliente";
import type { FetchOctava } from "./octava-http";
import {
  asegurarToken,
  type AlmacenSesionOctava,
  type CedenteOctava,
  type CredencialesOctava,
} from "./octava-sesion";

const CEDENTE_VACIO: CedenteOctava = {
  rut: "",
  razonSocial: "",
  direccion: "",
  email: "",
  contactoNombre: "",
  contactoEmail: "",
};

/** Lanza con el motivo si Octava rechaza las credenciales; devuelve la hora (ms) hasta la que sirve el token. */
export async function probarAccesoOctava(deps: {
  acceso: CredencialesOctava;
  almacen: AlmacenSesionOctava;
  fetch?: FetchOctava;
  ahora?: () => number;
}): Promise<{ venceEn: number }> {
  await asegurarToken({
    cliente: clienteOctava(deps.fetch ? { fetch: deps.fetch } : {}),
    acceso: deps.acceso,
    cedente: CEDENTE_VACIO,
    almacen: deps.almacen,
    ahora: deps.ahora ?? Date.now,
  });
  const guardado = await deps.almacen.leerToken();
  return { venceEn: guardado?.expiraEn ?? 0 };
}
