/** Orígenes exactos de teselas Leaflet (CSP `img-src`). Sin imports: lo usa `cabeceras-seguridad.ts` desde `next.config.ts`. */
export const HOSTS_IMG_MAPA = [
  "https://a.tile.openstreetmap.org",
  "https://b.tile.openstreetmap.org",
  "https://c.tile.openstreetmap.org",
  "https://a.basemaps.cartocdn.com",
  "https://b.basemaps.cartocdn.com",
  "https://c.basemaps.cartocdn.com",
  "https://d.basemaps.cartocdn.com",
  "https://server.arcgisonline.com",
] as const;