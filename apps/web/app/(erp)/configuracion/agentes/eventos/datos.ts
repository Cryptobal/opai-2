import { datosSiHayPermiso } from "@/lib/carga";
import { estadoPantalla } from "@/lib/formato";
import { ejecutarComoUsuario } from "@/lib/servidor";

export type Destino = {
  id: string;
  url: string;
  descripcion: string | null;
  eventos: string[];
  activo: boolean;
  secretoSufijo: string;
  secretoRotadoEn: string;
  createdAt: string;
};

export type Entrega = {
  id: string;
  eventoId: string;
  tipo: string;
  estado: "pendiente" | "ok" | "error";
  intentos: number;
  proximoIntentoEn: string | null;
  ultimoCodigo: number | null;
  ultimoError: string | null;
  createdAt: string;
};

export type EventoCatalogo = { id: string; descripcion: string };

type Pagina<T> = { items: T[]; siguiente: string | null };

/** Catálogo de eventos para elegir (CAR-353: hasta 200 por página; se piden todas). */
export async function cargarCatalogo(): Promise<EventoCatalogo[]> {
  const todos: EventoCatalogo[] = [];
  let cursor: string | null = null;
  do {
    const r = await ejecutarComoUsuario<Pagina<EventoCatalogo>>(
      "erp",
      "core.webhooks.eventos_list",
      {
        ...(cursor ? { cursor } : {}),
      },
    );
    const p: Pagina<EventoCatalogo> = datosSiHayPermiso(r, { items: [], siguiente: null });
    todos.push(...p.items);
    cursor = p.siguiente;
  } while (cursor);
  return todos;
}

/** Destinos de eventos (Configuración › Agentes y API keys › Eventos salientes). */
export async function cargarDestinos() {
  const [r, catalogo] = await Promise.all([
    ejecutarComoUsuario<Pagina<Destino>>("erp", "core.webhooks.destinos_list", { limite: 100 }),
    cargarCatalogo(),
  ]);
  return { state: estadoPantalla(r), destinos: r.ok ? r.data.items : [], catalogo };
}

/** Un destino con su registro de entregas, de la más reciente a la más antigua. */
export async function cargarDestino(id: string) {
  const [d, e] = await Promise.all([
    ejecutarComoUsuario<Destino>("erp", "core.webhooks.destino_get", { id }),
    ejecutarComoUsuario<Pagina<Entrega>>("erp", "core.webhooks.entregas_list", {
      destinoId: id,
      limite: 50,
    }),
  ]);
  return { d, entregas: e.ok ? e.data.items : [], hayMas: e.ok && e.data.siguiente !== null };
}
