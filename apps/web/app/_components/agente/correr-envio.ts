import { textoError } from "./mensajes-error";
import { llamarTurno } from "./llamar-turno";
import type { PendienteTurno } from "./reanudar-turno";
import { aplicarTurno } from "./respuesta-plan";
import type { Contexto, Mensaje, Modelo, Nivel } from "./tipos";

const nuevoId = () => crypto.randomUUID();

type Args = {
  texto: string;
  portal: string;
  modelo: Modelo;
  nivel: Nivel;
  ficha: { contexto: Contexto } | null;
  conversacionId: string | null;
  generacion: number;
  vigente: () => number;
  setMensajes: (fn: (ms: Mensaje[]) => Mensaje[]) => void;
  poner: (id: string, cambio: (m: Mensaje) => Mensaje) => void;
  alConversacion: (id: string, texto: string) => void;
  fijarPendiente: (p: PendienteTurno) => void;
  cerrarPendiente: () => void;
  alCortar: () => void;
};

/** Un envío: arma el hilo, llama el SSE y deja pendiente si se corta la red. */
export async function correrEnvio(a: Args): Promise<void> {
  const id = nuevoId();
  const turnoId = nuevoId();
  a.fijarPendiente({ turnoId, mensajeId: id, texto: a.texto, reintentosEnvio: 0 });
  a.setMensajes((ms) => [
    ...ms,
    { id: nuevoId(), rol: "yo", texto: a.texto },
    { id, rol: "agente", texto: "" },
  ]);
  try {
    const r = await llamarTurno({
      portal: a.portal,
      texto: a.texto,
      modelo: a.modelo,
      nivel: a.nivel,
      turnoId,
      conversacionId: a.conversacionId,
      ...(a.ficha ? { contexto: a.ficha.contexto } : {}),
    });
    if (a.vigente() !== a.generacion) {
      a.cerrarPendiente();
      return;
    }
    if (!r.ok) {
      a.poner(id, (m) => ({ ...m, error: textoError(r.error.code, r.error.message) }));
      a.cerrarPendiente();
      return;
    }
    if (r.data.conversacionId) a.alConversacion(r.data.conversacionId, a.texto);
    a.poner(id, (m) => aplicarTurno(m, r.data, a.nivel));
    a.cerrarPendiente();
  } catch {
    if (a.vigente() === a.generacion) a.alCortar();
    else a.cerrarPendiente();
  }
}
