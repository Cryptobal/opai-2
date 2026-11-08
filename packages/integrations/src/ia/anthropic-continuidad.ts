import { createHash } from "node:crypto";
import type { Bloque } from "./anthropic-mapa";
import type {
  ContinuidadIa,
  Mensaje,
  RespuestaConversacion,
  SolicitudConversacion,
} from "./contrato";
import { ErrorIa } from "./http";

export const errorContinuidad = () =>
  new ErrorIa(
    "Anthropic",
    400,
    "No se puede continuar esta respuesta de IA. Inicia una nueva solicitud.",
  );

/** Otros proveedores y stream no pueden reconstruir el protocolo opaco de Anthropic. */
export function rechazarContinuidad(s: SolicitudConversacion) {
  if (s.mensajes.some((m) => m.rol === "asistente" && m.continuidad !== undefined))
    throw errorContinuidad();
}

type Estado = {
  id: number;
  modelo: string;
  prefijo: string;
  opciones: string;
  proyeccion: string;
  content: Bloque[] | null;
};
const proyeccion = (m: { texto?: string; llamadas?: RespuestaConversacion["llamadas"] }) =>
  JSON.stringify([m.texto ?? "", m.llamadas ?? []]);

/** Scope privado por cuenta/adaptador, nunca serializable ni compartido entre solicitudes del agente. */
export function continuidadAnthropic() {
  const estados = new WeakMap<ContinuidadIa, Estado>();
  const neutrales = new Set<string>();
  const emitidas = new Set<string>();
  let agotado = false;
  const hash = (texto: string) => createHash("sha256").update(texto).digest("hex");
  const registrarPrefijo = (clave: string) => {
    if (emitidas.size < 32 || emitidas.has(clave)) emitidas.add(clave);
    else agotado = true;
  };
  let bytesRetenidos = 0;
  let secuencia = 0;
  let streamsPendientes = 0;
  const prefijo = (mensajes: readonly Mensaje[]) =>
    JSON.stringify(
      mensajes.map((m) => {
        if (m.rol !== "asistente") return m;
        const e = m.continuidad === undefined ? undefined : estados.get(m.continuidad);
        if (m.continuidad !== undefined && !e) throw errorContinuidad();
        return [m.rol, proyeccion(m), e?.id];
      }),
    );
  const opciones = (s: SolicitudConversacion) =>
    JSON.stringify([s.herramientas, s.eleccionHerramienta, s.salidaEstructurada, s.temperatura]);
  return {
    iniciarStream(solicitud: { prefijo: string }) {
      streamsPendientes++;
      const clave = hash(solicitud.prefijo);
      const previa = emitidas.has(clave);
      registrarPrefijo(clave);
      return (neutral: boolean, respuesta: RespuestaConversacion) => {
        streamsPendientes--;
        if (neutral) {
          if (!previa) emitidas.delete(clave);
          const firma = hash(JSON.stringify([solicitud.prefijo, proyeccion(respuesta)]));
          if (neutrales.size < 128 || neutrales.has(firma)) neutrales.add(firma);
          else agotado = true;
        }
      };
    },
    fijar: (s: SolicitudConversacion) => ({ prefijo: prefijo(s.mensajes), opciones: opciones(s) }),
    resolver(modelo: string, s: SolicitudConversacion, registrarNeutrales = true) {
      const originales = new Map<number, Bloque[]>();
      s.mensajes.forEach((m, i) => {
        if (m.rol !== "asistente") return;
        const previo = prefijo(s.mensajes.slice(0, i));
        if (m.continuidad === undefined) {
          if (agotado) throw errorContinuidad();
          if (emitidas.has(hash(previo))) throw errorContinuidad();
          const firma = JSON.stringify([previo, proyeccion(m)]);
          if ((secuencia || streamsPendientes) && m.llamadas?.length && !neutrales.has(hash(firma)))
            throw errorContinuidad();
          if (registrarNeutrales && !secuencia && firma.length < 32_000 && neutrales.size < 128)
            neutrales.add(hash(firma));
          return;
        }
        const e = estados.get(m.continuidad);
        if (
          !e ||
          !e.content ||
          e.modelo !== modelo ||
          e.prefijo !== previo ||
          e.opciones !== opciones(s) ||
          e.proyeccion !== proyeccion(m)
        )
          throw errorContinuidad();
        const llamadas = m.llamadas ?? [];
        const resultados = s.mensajes.slice(i + 1, i + 1 + llamadas.length);
        if (
          !llamadas.length ||
          resultados.length !== llamadas.length ||
          new Set(llamadas.map((ll) => ll.id)).size !== llamadas.length ||
          llamadas.some(
            (ll) =>
              resultados.filter(
                (r) => r.rol === "herramienta" && r.id === ll.id && r.nombre === ll.nombre,
              ).length !== 1,
          )
        )
          throw errorContinuidad();
        const siguiente = s.mensajes[i + 1 + llamadas.length];
        if (siguiente && siguiente.rol !== "asistente") throw errorContinuidad();
        originales.set(i, e.content);
      });
      return originales;
    },
    guardar(
      modelo: string,
      solicitud: { prefijo: string; opciones: string },
      r: RespuestaConversacion,
      bloques: Bloque[] | null,
    ) {
      const handle = Object.freeze(Object.create(null)) as ContinuidadIa;
      registrarPrefijo(hash(solicitud.prefijo));
      // Un exceso no descarta uso ya incurrido: la respuesta se mide; solo se bloquea continuarla.
      const json = bloques && bloques.length <= 2048 ? JSON.stringify(bloques) : null;
      const bytes = new TextEncoder().encode(
        (json ?? "") + solicitud.prefijo + solicitud.opciones + proyeccion(r),
      ).length;
      const valida =
        json !== null &&
        bytes <= 2 * 1024 * 1024 &&
        bytesRetenidos + bytes <= 8 * 1024 * 1024 &&
        secuencia < 32;
      const content: Bloque[] | null = valida ? JSON.parse(json) : null;
      if (bloques !== null && !valida) agotado = true;
      if (valida) bytesRetenidos += bytes;
      estados.set(handle, {
        id: ++secuencia,
        modelo,
        prefijo: valida ? solicitud.prefijo : "",
        opciones: valida ? solicitud.opciones : "",
        proyeccion: valida ? proyeccion(r) : "",
        content,
      });
      return handle;
    },
  };
}
