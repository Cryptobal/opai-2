const CUERPO_AASA = JSON.stringify({
  webcredentials: { apps: ["PRG52N5SNA.cl.opai.app"] },
});

/** Apple App Site Association (webcredentials). Público: sin sesión ni datos de negocio. */
export function GET(): Response {
  return new Response(CUERPO_AASA, {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=300",
    },
  });
}