import {
  almacenamientoDelEntorno,
  emisorFcmDelEntorno,
  emisorPushDelEntorno,
  mailerDelEntorno,
} from "@opai/integrations";

import type { Servicios } from "./types";

/** Emisores de correo, archivos y push (web + FCM nativo) con sustitución en pruebas. */
export function serviciosDelContexto(params: { servicios?: Partial<Servicios> }): Servicios {
  return {
    correo: params.servicios?.correo ?? mailerDelEntorno(),
    almacenamiento: params.servicios?.almacenamiento ?? almacenamientoDelEntorno(),
    push: params.servicios?.push === undefined ? emisorPushDelEntorno() : params.servicios.push,
    pushNativo:
      params.servicios?.pushNativo === undefined ? emisorFcmDelEntorno() : params.servicios.pushNativo,
    urlBase: params.servicios?.urlBase ?? process.env["BETTER_AUTH_URL"] ?? "http://localhost:3000",
  };
}