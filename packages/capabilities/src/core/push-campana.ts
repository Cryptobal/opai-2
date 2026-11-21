import { type CategoriaAviso, rutaPushInterna } from "@opai/domain";

import type { Contexto } from "../types";
import { avisarAlCelular } from "./push-avisar";

/** Mapea un evento de dominio a la categoría de preferencias del portal del trabajador. */
function categoriaPushDeEvento(tipo: string): CategoriaAviso {
  if (tipo.startsWith("pauta.")) return "pauta";
  if (tipo.includes("documento")) return "documentos";
  if (tipo.startsWith("comercial.solicitud") || tipo.startsWith("tickets.ticket")) return "solicitudes";
  return "empresa";
}

function moduloDeEvento(tipo: string): string {
  const [m] = tipo.split(".");
  return m || "core";
}

/** Toca el celular tras crear el aviso en la campana (misma preferencia y silencio). */
export async function avisarPushTrasCampana(
  ctx: Contexto,
  usuarioId: string,
  eventoTipo: string,
  enlace: string | null,
) {
  const ruta = rutaPushInterna(enlace);
  await avisarAlCelular(
    ctx,
    [usuarioId],
    categoriaPushDeEvento(eventoTipo),
    moduloDeEvento(eventoTipo),
    new Date(),
    ruta,
  );
}