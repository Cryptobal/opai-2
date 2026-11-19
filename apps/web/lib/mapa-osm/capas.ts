export const ATRIBUCION_OSM =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

export function urlCapaMapa(tema: "light" | "dark"): string {
  if (tema === "dark") {
    return "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
  }
  return "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
}