/** Respuesta JSON de rutas `/api/terreno/*` sin caché (equipo emparejado). */
export const jsonTerreno = (status: number, cuerpo: unknown, extra: Record<string, string> = {}) =>
  Response.json(cuerpo, { status, headers: { "Cache-Control": "no-store", ...extra } });