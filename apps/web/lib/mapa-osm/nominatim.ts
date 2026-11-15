const UA = "OPAI-2/1.0 (mapas rondas; contacto opai.cl)";

export type SugerenciaUbicacion = {
  lat: number;
  lng: number;
  etiqueta: string;
};

type FilaNominatim = { lat: string; lon: string; display_name: string };

export async function buscarEnNominatim(texto: string, limite = 5): Promise<SugerenciaUbicacion[]> {
  const q = texto.trim();
  if (q.length < 3) return [];
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", q);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", String(limite));
  url.searchParams.set("countrycodes", "cl");
  url.searchParams.set("addressdetails", "0");
  const r = await fetch(url, {
    headers: { "User-Agent": UA, accept: "application/json" },
    next: { revalidate: 86_400 },
  });
  if (!r.ok) return [];
  const filas = (await r.json()) as FilaNominatim[];
  return filas
    .map((f) => {
      const lat = Number.parseFloat(f.lat);
      const lng = Number.parseFloat(f.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      return { lat, lng, etiqueta: f.display_name };
    })
    .filter((x): x is SugerenciaUbicacion => x !== null);
}

export async function geocodificarDireccion(texto: string): Promise<{ lat: number; lng: number } | null> {
  const [primera] = await buscarEnNominatim(texto, 1);
  return primera ? { lat: primera.lat, lng: primera.lng } : null;
}