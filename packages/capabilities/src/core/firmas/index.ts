import type { Capacidad } from "../../types";
import {
  firmasFirmaAutomaticaAutorizar,
  firmasFirmaAutomaticaRevocar,
} from "./firma-automatica";
import { firmasFirmanteEmpresaSet } from "./firmante-empresa";
import { firmasPoliticaGet, firmasPoliticaSet } from "./politica";

/**
 * Firma electrónica del núcleo (firma.md, CAR-82 · PR 1). Capa de datos + gobernanza y configuración:
 * política por tipo de documento (R1/R2, CA4), firmante de la empresa y autorización de firma
 * automática del representante (R16, P5). El flujo de envío/firma/verificación (enviar, firmar,
 * rechazar, verificar) va en el PR 2 con sus pantallas y los adaptadores de sello (P7), OTP y
 * biometría; la firma N2 de trabajadores espera la prueba de vida (decisión de Carlos 29-oct-2026).
 */
export const capacidadesFirmas: readonly Capacidad[] = [
  firmasPoliticaGet,
  firmasPoliticaSet,
  firmasFirmanteEmpresaSet,
  firmasFirmaAutomaticaAutorizar,
  firmasFirmaAutomaticaRevocar,
];
