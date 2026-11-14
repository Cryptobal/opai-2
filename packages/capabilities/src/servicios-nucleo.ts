import type { Almacenamiento, EmisorPush, Mailer } from "@opai/integrations";

/** Servicios del núcleo disponibles para las capacidades. Los implementa el borde. */
export type Servicios = {
  correo: Mailer;
  /** Almacenamiento de archivos (R2) con URLs firmadas. */
  almacenamiento: Almacenamiento;
  /** URL pública de la app, para enlaces en correos ("https://test.opai.cl"). */
  urlBase: string;
  /** Web Push sin contenido (CAR-356 PR 4a); `null` sin claves VAPID. */
  push?: EmisorPush | null;
};

