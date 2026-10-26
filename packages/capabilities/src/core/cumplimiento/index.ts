import type { Capacidad } from "../../types";
import { consentimientosListar } from "./consentimientos-consulta";
import { consentimientoRegistrar, consentimientoRevocar } from "./consentimientos";
import { cumplimientoDpaAceptar, cumplimientoEstado } from "./dpa";
import { cumplimientoDpoSet } from "./dpo";
import { incidentesListar } from "./incidentes-consulta";
import { incidenteNotificar } from "./incidentes-notificar";
import { incidenteAvanzar, incidenteRegistrar } from "./incidentes";
import { cumplimientoRat } from "./rat";
import { retencionPolitica } from "./retencion-politica";
import { trabajosCumplimiento } from "./retencion-trabajo";
import { titularAnonimizar } from "./titular-anonimizar";
import { solicitudObtener, solicitudesListar } from "./solicitudes-consulta";
import { solicitudExportar } from "./solicitudes-exportar";
import { solicitudResolver } from "./solicitudes-resolver";
import { solicitudAvanzar, solicitudCrear } from "./solicitudes";

/**
 * Capacidades de cumplimiento (Ley 21.719, Brief 07d). PR 1: DPA, DPO y RAT. PR 2: consentimientos,
 * solicitudes del titular (ARCO+) con su exportación, e incidentes/avisos de brecha. PR 3: política de
 * retención (lectura) y la anonimización puntual de un titular (única purga forzada, §16.4).
 */
export const capacidadesCumplimiento: readonly Capacidad[] = [
  cumplimientoEstado,
  cumplimientoDpaAceptar,
  cumplimientoDpoSet,
  cumplimientoRat,
  // PR 2 · consentimientos
  consentimientoRegistrar,
  consentimientoRevocar,
  consentimientosListar,
  // PR 2 · solicitudes del titular (ARCO+)
  solicitudCrear,
  solicitudAvanzar,
  solicitudResolver,
  solicitudExportar,
  solicitudesListar,
  solicitudObtener,
  // PR 2 · incidentes y avisos de brecha (§16.5)
  incidenteRegistrar,
  incidenteAvanzar,
  incidenteNotificar,
  incidentesListar,
  // PR 3 · retención y anonimización a pedido
  retencionPolitica,
  titularAnonimizar,
];

/** Trabajos diarios de cumplimiento (retención). Se registran en `apps/web/lib/registro.ts`. */
export { trabajosCumplimiento };
