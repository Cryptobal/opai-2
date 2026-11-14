import type { Capacidad } from "../../types";
import { webhooksDestinoCreate, webhooksDestinosList, webhooksDestinoUpdate } from "./destinos";
import { webhooksDestinoDelete, webhooksDestinoRotar } from "./secreto";

/** Eventos salientes por empresa (CAR-352): UI, `/api/v1` y MCP (la gestión es solo de personas). */
export const capacidadesWebhooks: readonly Capacidad[] = [
  webhooksDestinosList,
  webhooksDestinoCreate,
  webhooksDestinoUpdate,
  webhooksDestinoRotar,
  webhooksDestinoDelete,
];
