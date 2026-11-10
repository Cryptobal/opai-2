import type { CampoDef, FinalidadCampo } from "./tipos";

/** Las referencias solo van en documentos comerciales; nunca en contratos ni correos (CAR-138 PR 7). */
const COMERCIALES: readonly FinalidadCampo[] = ["propuesta", "documento"];

/**
 * Cliente que consintió ser referencia comercial. Dentro de `{{#cada referencias}}` toma cada elemento.
 * Solo existen las de consentimiento vigente y cuenta activa: lo que no se consintió no se resuelve.
 */
export const CAMPOS_REFERENCIA: readonly CampoDef[] = [
  {
    clave: "referencia.cliente",
    descripcion:
      "Nombre del cliente de referencia, o «Cliente de {rubro} en {comuna}» si no autorizó su nombre",
    tipo: "texto",
    fuente: "maestros",
    sensibilidad: "publica",
    finalidades: COMERCIALES,
    ejemplo: "Cliente de Logística en Quilicura",
  },
  {
    clave: "referencia.rubro",
    descripcion: "Giro o rubro del cliente de referencia",
    tipo: "texto",
    fuente: "maestros",
    sensibilidad: "publica",
    finalidades: COMERCIALES,
    ejemplo: "Logística",
  },
  {
    clave: "referencia.comuna",
    descripcion: "Comuna del cliente de referencia",
    tipo: "texto",
    fuente: "maestros",
    sensibilidad: "publica",
    finalidades: COMERCIALES,
    ejemplo: "Quilicura",
  },
  {
    clave: "referencia.cliente_desde",
    descripcion: "Fecha desde la que es cliente",
    tipo: "fecha",
    fuente: "maestros",
    sensibilidad: "publica",
    finalidades: COMERCIALES,
    ejemplo: "2024-03-01",
  },
  {
    clave: "referencia.descripcion",
    descripcion: "Descripción del servicio que el cliente autorizó mostrar",
    tipo: "texto",
    fuente: "maestros",
    sensibilidad: "publica",
    finalidades: COMERCIALES,
    ejemplo: "Servicio de guardias 24/7 en centro de distribución ficticio",
  },
  {
    clave: "referencia.cita",
    descripcion: "Cita o testimonio que el cliente autorizó mostrar",
    tipo: "texto",
    fuente: "maestros",
    sensibilidad: "publica",
    finalidades: COMERCIALES,
    ejemplo: "Un servicio puntual y bien coordinado.",
  },
];
