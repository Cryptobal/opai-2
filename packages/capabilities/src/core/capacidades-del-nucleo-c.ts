import type { Capacidad } from "../types";
import { capacidadesAnexos } from "./anexos";
import { capacidadesCampos } from "./campos";
import { capacidadesProcesosPersona } from "./procesos-persona";
import { geoAutocompletar, geoDetalle, geoGeocodificar, geoMapa, iaProbar } from "./geo-ia";
import { regionesList } from "./regiones";
import { integracionesProbar, platformIntegracionesEstado } from "./integraciones-probar";
import {
  integracionesConfigurar,
  integracionesGet,
  integracionesList,
  integracionesSetSecreto,
} from "./integraciones";
import { integracionesGuardarCertificadoDte } from "./integraciones-certificado-dte";
import { capacidadesSlack } from "./slack";
import { capacidadesAgentes } from "./agentes";
import { capacidadesCalendario } from "./calendario";
import { capacidadesRemuneraciones } from "./remuneraciones";
import { capacidadesComunicaciones } from "./comunicaciones";
import { capacidadesNovedades } from "./novedades";
import { capacidadesConfig } from "./config";
import { capacidadesCumplimiento } from "./cumplimiento";
import { capacidadesDocumentos } from "./documentos";
import { capacidadesEmpresa } from "./empresa";
import { capacidadesFirmas } from "./firmas";
import { capacidadesCorreos } from "./correos";
import { capacidadesImportar } from "./importar";
import { capacidadesCrm } from "./crm";
import { capacidadesMaestros } from "./maestros";
import { capacidadesAusencias } from "./maestros/personas-ausencias";
import { capacidadesPanel } from "./panel";
import { capacidadesReglasAprobacion } from "./aprobaciones-reglas/capacidades";
import { porAprobarList } from "./por-aprobar";
import { capacidadesGrupos } from "./grupos";
import { capacidadesWebhooks } from "./webhooks";
import { capacidadesIndicadoresGestion } from "./indicadores-gestion";
import { capacidadesJefatura } from "./jefatura";
import { capacidadesPermisos } from "./permisos";

/** Bloque maestros–agentes del registro `core.*`. */
export const capacidadesDelNucleoC: readonly Capacidad[] = [
  integracionesList,
  integracionesGet,
  integracionesConfigurar,
  integracionesSetSecreto,
  integracionesGuardarCertificadoDte,
  integracionesProbar,
  geoAutocompletar,
  geoDetalle,
  geoGeocodificar,
  geoMapa,
  regionesList,
  iaProbar,
  platformIntegracionesEstado,
  ...capacidadesMaestros,
  ...capacidadesAusencias,
  ...capacidadesCrm,
  ...capacidadesCorreos,
  ...capacidadesImportar,
  ...capacidadesCalendario,
  ...capacidadesRemuneraciones,
  ...capacidadesAnexos,
  ...capacidadesCampos,
  ...capacidadesPanel,
  ...capacidadesPermisos,
  ...capacidadesGrupos,
  ...capacidadesWebhooks,
  ...capacidadesReglasAprobacion,
  porAprobarList,
  ...capacidadesSlack,
  ...capacidadesIndicadoresGestion,
  ...capacidadesJefatura,
  ...capacidadesProcesosPersona,
  ...capacidadesDocumentos,
  ...capacidadesFirmas,
  ...capacidadesConfig,
  ...capacidadesCumplimiento,
  ...capacidadesEmpresa,
  ...capacidadesComunicaciones,
  ...capacidadesNovedades,
  ...capacidadesAgentes,
];