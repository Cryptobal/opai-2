// Capacidades de Tickets (CAR-84, ADR-004/ADR-025). Se exponen igual en UI, API /api/v1 y MCP.
import type { Capacidad } from "@opai/capabilities";

import { ticketsAprobar, ticketsRechazar } from "./aprobacion";
import { ticketsCrear, ticketsComentar } from "./escritura";
import { ticketsCambiarEstado, ticketsReasignar } from "./estado";
import { ticketsListar, ticketsObtener } from "./lectura";
import { tiposCrear, tiposListar } from "./tipos";
import { tiposActualizar } from "./tipos-actualizar";

export const capacidades: readonly Capacidad[] = [
  tiposListar,
  tiposCrear,
  tiposActualizar,
  ticketsListar,
  ticketsObtener,
  ticketsCrear,
  ticketsComentar,
  ticketsCambiarEstado,
  ticketsReasignar,
  ticketsAprobar,
  ticketsRechazar,
];
