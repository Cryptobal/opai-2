import type { Capacidad } from "../../types";
import { webhooksDestinoCreate, webhooksDestinosList, webhooksDestinoUpdate } from "./destinos";
import { webhooksEntregaReenviar, webhooksEntregasList } from "./entregas";
import { webhooksDestinoDelete, webhooksDestinoRotar } from "./secreto";
export { consumidorWebhooks, enviador, trabajoEnviarWebhooks } from "./envio";

/** Eventos salientes por empresa (CAR-352): UI, `/api/v1` y MCP (la gestión es solo de personas). */
export const capacidadesWebhooks: readonly Capacidad[] = [
  webhooksDestinosList,
  webhooksDestinoCreate,
  webhooksDestinoUpdate,
  webhooksDestinoRotar,
  webhooksDestinoDelete,
  webhooksEntregasList,
  webhooksEntregaReenviar,
];
