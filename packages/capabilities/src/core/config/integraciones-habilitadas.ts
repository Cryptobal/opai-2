import { z } from "zod";

/**
 * Integraciones restringidas (CAR-321): las que marcan `soloHabilitadas` en el catálogo solo existen para
 * las empresas que Plataforma pone aquí. Por ahora, «opai1» (traer datos desde OPAI 1), que es solo
 * para migrar una empresa y se retira al terminar. Se guarda el id de la empresa, nunca su nombre.
 */
export const ajustesIntegracionesHabilitadas = {
  integraciones_habilitadas: z
    .record(z.string().min(1).max(40), z.array(z.uuid()).max(50))
    .default({})
    .meta({
      etiqueta: "Integraciones restringidas: empresas habilitadas",
      ayuda: "Por integración, los id de las empresas que la ven. Ej.: { \"opai1\": [\"<id de empresa>\"] }.",
      grupo: "Integraciones",
      ambito: "plataforma",
      control: "json",
    }),
};

/**
 * Ajustes de plataforma que una empresa nunca ve (ni por pantalla, API o MCP): su valor nombra a otras empresas.
 * Se siguen leyendo por dentro con `ajuste()`.
 */
export const AJUSTES_OCULTOS_A_EMPRESAS: ReadonlySet<string> = new Set(["core.integraciones_habilitadas"]);
