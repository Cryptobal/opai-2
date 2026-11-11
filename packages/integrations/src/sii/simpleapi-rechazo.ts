// Discriminador del 401/403 sin cuerpo de SimpleAPI (CAR-263b). SimpleAPI usa ese mismo rechazo para una API key que
// no reconoce y para un contenido que rechaza (certificado, CAF o JSON; lo documenta OPAI 1.0 en `simpleapi-http.ts`).
// Los `x-rate-limit-*` no distinguen (vienen en toda respuesta; CAR-263). La sonda de `Suscripcion/status` sí: si
// reconoce la key en Basic (como la emisión), el rechazo es del contenido; si solo la reconoce cruda, puede ser el
// esquema o el contenido; si no la reconoce con ningún esquema, es la key; si no responde, se dicen las dos causas. Nunca se afirma que la key está mal solo por un 401 vacío.

import { ErrorProveedorSii } from "./error-proveedor";
import { probarKeySimpleApi, type EsquemaAuthSimpleApi } from "./simpleapi-suscripcion";

/** Resultado de la sonda que acompañó un rechazo, sin la key ni el header: va al log categórico. */
export type SondaKeySimpleApi = { estado: "reconocida"; esquema: EsquemaAuthSimpleApi } | { estado: "no_reconocida" | "sin_respuesta" };

/** Sin dato de la sonda: el rechazo puede ser de la key o del contenido, y se dice así. */
export const motivoRechazoSinCuerpo = (status: number): string =>
  `respondió HTTP ${status} sin motivo: puede ser la API key o el contenido (certificado, CAF o JSON); «Probar conexión» en Integraciones › Emisión DTE comprueba la key`;

const motivoContenido = (status: number): string =>
  `respondió HTTP ${status} sin motivo, pero sí reconoce la API key: rechazó el contenido (certificado, CAF o JSON), no la key`;

/** La key se reconoce solo cruda, pero `dte/generar` va en Basic: el 401 puede ser el esquema o el contenido. */
const motivoSoloCruda = (status: number): string =>
  `respondió HTTP ${status} sin motivo; SimpleAPI reconoce la API key solo enviada directa y la emisión la manda en Basic: puede ser esa forma de autenticar o el contenido (certificado, CAF o JSON)`;

const motivoKey = (status: number): string =>
  `respondió HTTP ${status} sin motivo y tampoco reconoce la API key guardada (mal copiada, vencida o sin suscripción a SimpleAPI DTE); cópiala de nuevo en Integraciones › Emisión DTE`;

/** Copia el error con otro motivo, conservando el diagnóstico de la respuesta y de la petición. */
function conMotivo(e: ErrorProveedorSii, motivo: string, sonda: SondaKeySimpleApi): ErrorProveedorSii {
  const nuevo = new ErrorProveedorSii(e.paso, motivo, e.status, e.detalle, e.incierto);
  nuevo.limites = e.limites;
  nuevo.cuerpo = e.cuerpo;
  nuevo.respuesta = e.respuesta;
  nuevo.peticion = e.peticion;
  nuevo.sondaKey = sonda;
  return nuevo;
}

/**
 * Si `error` es un 401/403 sin cuerpo, pregunta a `Suscripcion/status` (GET, sin certificado, CAF ni folios) si la key
 * se reconoce y devuelve el error con el motivo que corresponde. Cualquier otro error vuelve tal cual.
 */
export async function discriminarRechazoSinCuerpo(error: unknown, apiKey: string): Promise<unknown> {
  if (!(error instanceof ErrorProveedorSii) || error.cuerpo !== "vacio") return error;
  const status = error.status;
  if (status !== 401 && status !== 403) return error;
  const r = await probarKeySimpleApi(apiKey).catch(() => null);
  if (r?.estado === "reconocida") {
    // Solo con Basic (el esquema de la emisión) la sonda descarta la key; si solo aceptó la cruda, queda la duda.
    const motivo = r.esquema === "basic" ? motivoContenido(status) : motivoSoloCruda(status);
    return conMotivo(error, motivo, { estado: "reconocida", esquema: r.esquema });
  }
  if (r?.estado === "no_reconocida") return conMotivo(error, motivoKey(status), { estado: "no_reconocida" });
  return conMotivo(error, error.motivo, { estado: "sin_respuesta" });
}
