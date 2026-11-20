/** Asociación pública de iOS para las credenciales web de la app OPAI. */
export function GET(): Response {
  return Response.json({ webcredentials: { apps: ["PRG52N5SNA.cl.opai.app"] } });
}
