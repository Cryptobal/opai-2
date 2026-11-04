// Dobles de prueba de Octava: fetch con respuestas grabadas por endpoint y almacén en memoria.
import type { DepsAdaptadorOctava } from "./octava";
import type { FetchOctava } from "./octava-http";
import type { AlmacenSesionOctava, CedenteOctava } from "./octava-sesion";

export type Llamada = { endpoint: string; cuerpo: Record<string, string> };

export function fetchGrabado(respuestas: Record<string, unknown[]>) {
  const llamadas: Llamada[] = [];
  const colas = Object.fromEntries(Object.entries(respuestas).map(([k, v]) => [k, [...v]]));
  const fetch: FetchOctava = async (url, init) => {
    const endpoint = url.split("/").pop() ?? "";
    llamadas.push({ endpoint, cuerpo: JSON.parse(String(init.body)) as Record<string, string> });
    const siguiente = colas[endpoint]?.shift();
    if (siguiente === undefined) throw new Error(`sin respuesta grabada para ${endpoint}`);
    const cuerpo = typeof siguiente === "string" ? siguiente : JSON.stringify(siguiente);
    return new Response(cuerpo, { status: 200 });
  };
  return { fetch, llamadas };
}

export function almacenMemoria(inicial: { token?: { token: string; expiraEn: number } } = {}) {
  const estado = { token: inicial.token ?? null } as {
    token: { token: string; expiraEn: number } | null;
  };
  const almacen: AlmacenSesionOctava = {
    leerToken: async () => estado.token,
    guardarToken: async (t) => void (estado.token = t),
  };
  return { almacen, estado };
}

export const CEDENTE: CedenteOctava = {
  rut: "76111222-8",
  razonSocial: "Cedente SpA",
  direccion: "Av. Demo 123",
  email: "cobranza@cedente.test",
  contactoNombre: "Ana Prueba",
  contactoEmail: "ana@cedente.test",
};

export function depsPrueba(
  fetch: FetchOctava,
  almacen: AlmacenSesionOctava,
  extra: Partial<DepsAdaptadorOctava> = {},
): DepsAdaptadorOctava {
  return {
    acceso: { usuario: "76.111.222-8", clave: "clave-acceso" },
    cedente: CEDENTE,
    almacen,
    ambiente: "certificacion",
    fetch,
    ahora: () => 1_000_000,
    ...extra,
  };
}
