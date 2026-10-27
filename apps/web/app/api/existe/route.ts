import { existeRuta } from "@/lib/existe-ruta";
import { ipDe, LIMITES, permitir } from "@/lib/rate-limit";
import { demasiadas } from "@/lib/respuestas";

/**
 * Uso interno del proxy: dice si lo que pide una URL de ficha existe, para responder HTTP 404 antes
 * de enviar el HTML (con Cache Components el shell sale en streaming y un `notFound()` posterior
 * llegaría con el estado 200). Usa la sesión del request y las mismas capacidades que la página,
 * así que no revela nada que la persona no pueda ver. Rate limit por IP (NÚCLEO-B) para que no sirva
 * de oráculo de existencia a fuerza bruta. El proxy pasa la IP real del cliente en `x-opai-ip` (su
 * `fetch` interno saldría con una sola IP de Vercel); si no viene, se usa la de la petición.
 */
export async function GET(request: Request): Promise<Response> {
  const ip = request.headers.get("x-opai-ip")?.trim() || ipDe(request);
  if (!(await permitir(`existe-ip:${ip}`, LIMITES.existe.maximo))) return demasiadas();
  const ruta = new URL(request.url).searchParams.get("ruta") ?? "";
  return Response.json({ existe: ruta.startsWith("/") ? await existeRuta(ruta) : true });
}
