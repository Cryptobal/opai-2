import { trabajosDelNucleo as trabajosServicios } from "./bitacora";
import { trabajoVerificarAuditoria } from "./auditoria";
import { trabajosDocumentos } from "./documentos";
import { trabajosAgentes } from "./agentes";
import { trabajosCumplimiento } from "./cumplimiento";
import { trabajosMaestros } from "./maestros";
import {
  trabajoCapturaIndicadoresSii,
  trabajoCapturaPrevisional,
} from "./remuneraciones";
import { trabajoTareasVencidas } from "./crm/actividades-vencidas";
import { trabajoExtenderTurnos } from "./turnos";
import { trabajoEnviarWebhooks } from "./webhooks";
import { trabajosSlack } from "./slack";

/** Trabajos del núcleo que registra el borde (`apps/web/lib/registro.ts`). */
export const trabajosDelNucleo = [
  ...trabajosServicios,
  trabajoVerificarAuditoria,
  ...trabajosDocumentos,
  ...trabajosAgentes,
  ...trabajosCumplimiento,
  ...trabajosMaestros,
  trabajoCapturaIndicadoresSii,
  trabajoCapturaPrevisional,
  trabajoTareasVencidas,
  trabajoExtenderTurnos,
  trabajoEnviarWebhooks,
  ...trabajosSlack,
];