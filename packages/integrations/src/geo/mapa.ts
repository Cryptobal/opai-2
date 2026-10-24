// Mapa estático de Google (Static Maps) por HTTP. La clave nunca sale del servidor: el navegador pide
// la imagen al proxy del núcleo (`/api/geo/mapa`), que la descarga con la clave del tenant.

export type OpcionesMapa = { ancho?: number; alto?: number; zoom?: number };
export type ImagenMapa = { mime: string; bytes: Uint8Array };

/** URL de Static Maps con la clave: solo para el servidor, nunca para el cliente. */
export function urlMapaGoogle(
  apiKey: string,
  lat: number,
  lng: number,
  o: OpcionesMapa = {},
): string {
  const url = new URL("https://maps.googleapis.com/maps/api/staticmap");
  url.search = new URLSearchParams({
    center: `${lat},${lng}`,
    zoom: String(o.zoom ?? 16),
    size: `${o.ancho ?? 640}x${o.alto ?? 360}`,
    scale: "2",
    markers: `${lat},${lng}`,
    key: apiKey,
  }).toString();
  return url.toString();
}

/** Lee la imagen de la respuesta de Static Maps; si Google devolvió otra cosa, se informa. */
export async function imagenDeRespuesta(r: Response): Promise<ImagenMapa> {
  const mime = r.headers.get("content-type") ?? "image/png";
  if (!mime.startsWith("image/")) throw new Error("Google Maps no devolvió una imagen (mapa).");
  return { mime, bytes: new Uint8Array(await r.arrayBuffer()) };
}
