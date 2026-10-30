import type { Capacidad } from "../../types";
import { firmasDocumentoUrl } from "./documento-url";
import { firmasFirmaAutomaticaAutorizar, firmasFirmaAutomaticaRevocar } from "./firma-automatica";
import { firmasFirmanteEmpresaSet } from "./firmante-empresa";
import { firmasEnviar } from "./enviar";
import { firmasFirmar } from "./firmar";
import { firmasEstado, firmasList } from "./lecturas";
import { firmasPoliticaGet, firmasPoliticaSet } from "./politica";
import { firmasCancelar, firmasRecordar } from "./recordar-cancelar";
import { firmasRechazar } from "./rechazar";
import { firmasVerFirmante } from "./ver-firmante";
import { firmasVerificar } from "./verificar";

export { consumidorFirmaDocumento } from "./consumidor-documento";

/**
 * Firma electrónica del núcleo (firma.md, CAR-82). PR 1: datos, permisos, política y gobernanza del
 * representante. PR 2: el flujo N1 de envío, firma y verificación (enviar con aprobación condicional
 * R19, estado/list, recordar, cancelar, firmar y rechazar como actos del firmante, verificar), con
 * los adaptadores de sello (P7) y la evidencia encadenada (R17). La firma N2 (prueba de vida) y la
 * aceptación del medio electrónico (R10) quedan diferidas (decisión de Carlos 29-oct-2026, 22:27).
 */
export const capacidadesFirmas: readonly Capacidad[] = [
  firmasPoliticaGet,
  firmasPoliticaSet,
  firmasFirmanteEmpresaSet,
  firmasFirmaAutomaticaAutorizar,
  firmasFirmaAutomaticaRevocar,
  firmasEnviar,
  firmasEstado,
  firmasList,
  firmasRecordar,
  firmasCancelar,
  firmasFirmar,
  firmasRechazar,
  firmasVerFirmante,
  firmasDocumentoUrl,
  firmasVerificar,
];
