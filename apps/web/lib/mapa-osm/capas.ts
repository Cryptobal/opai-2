export const ATRIBUCION_OSM =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

export const ATRIBUCION_SATELITE =
  "Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, USDA FSA, USGS, Aerogrid, IGN, IGP, and the GIS User Community";

/** Orígenes exactos de teselas (CSP `img-src`; sin comodines amplios). */
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

export function urlCapaMapa(tema: "light" | "dark"): string {
  if (tema === "dark") {
    return "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
  }
  return "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
}

export function urlCapaSatelite(): string {
  return "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
}