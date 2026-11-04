import { EVENTO_AGENTE, registrarAgente, type SolicitudAgente } from "./abrir-agente";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Atiende los pedidos de abrir el agente: el evento `opai:agente` (historial, ⌘K, menú de las
 * fichas) y `?agente=1` en la URL (con `&conversacion=<id>` para retomar una). Se carga aparte del
 * JS inicial (ADR-037). Devuelve cómo dejar de escuchar.
 */
export function escuchar(pedir: (s: SolicitudAgente) => void): () => void {
  const alEvento = (e: Event) => pedir((e as CustomEvent<SolicitudAgente>).detail ?? {});
  window.addEventListener(EVENTO_AGENTE, alEvento);
  const darDeBaja = registrarAgente();
  const url = new URL(window.location.href);
  if (url.searchParams.has("agente")) {
    const conversacion = url.searchParams.get("conversacion") ?? "";
    pedir(UUID.test(conversacion) ? { conversacionId: conversacion } : {});
    url.searchParams.delete("agente");
    url.searchParams.delete("conversacion");
    window.history.replaceState(window.history.state, "", url);
  }
  return () => {
    window.removeEventListener(EVENTO_AGENTE, alEvento);
    darDeBaja();
  };
}
