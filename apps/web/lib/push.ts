import "server-only";

/**
 * Clave pública VAPID para que el navegador se suscriba (CAR-356 PR 4b). Es pública por diseño (va al navegador);
 * la privada nunca sale del servidor. Sin las claves en Vercel, null: la pantalla no ofrece el aviso al celular.
 */
export function clavePublicaPush(): string | null {
  const publica = process.env["VAPID_PUBLIC_KEY"];
  const completo = publica && process.env["VAPID_PRIVATE_KEY"] && process.env["VAPID_SUBJECT"];
  return completo ? publica : null;
}
