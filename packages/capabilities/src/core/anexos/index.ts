import type { Capacidad } from "../../types";
import { anexosAprobar } from "./aprobar";
import { anexosGet, anexosList } from "./consulta";
export { consumidorAnexos } from "./consumidor";
import { anexosGenerar } from "./generar";
import { anexosRechazar } from "./rechazar";

/** Anexo de contrato en borrador (Brief 07b, PR 4; R11-R15). */
export const capacidadesAnexos: readonly Capacidad[] = [
  anexosGenerar,
  anexosList,
  anexosGet,
  anexosAprobar,
  anexosRechazar,
];
