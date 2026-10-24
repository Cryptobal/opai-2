import { existeRuta } from "@/lib/existe-ruta";

/**
 * Uso interno del proxy: dice si lo que pide una URL de ficha existe, para responder HTTP 404 antes
 * de enviar el HTML (con Cache Components el shell sale en streaming y un `notFound()` posterior
 * llegaría con el estado 200). Usa la sesión del request y las mismas capacidades que la página,
 * así que no revela nada que la persona no pueda ver.
 */
export async function GET(request: Request): Promise<Response> {
  const ruta = new URL(request.url).searchParams.get("ruta") ?? "";
  return Response.json({ existe: ruta.startsWith("/") ? await existeRuta(ruta) : true });
}
