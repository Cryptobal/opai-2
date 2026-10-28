import { existeRuta } from "@/lib/existe-ruta";
import { ipDe, LIMITES, permitir } from "@/lib/rate-limit";
import { demasiadas } from "@/lib/respuestas";
import { identidadActual } from "@/lib/servidor";

/**
 * Uso interno del proxy: dice si lo que pide una URL de ficha existe, para responder HTTP 404 antes
 * de enviar el HTML (con Cache Components el shell sale en streaming y un `notFound()` posterior
 * llegaría con el estado 200). Usa la sesión del request y las mismas capacidades que la página,
 * así que no revela nada que la persona no pueda ver. Rate limit (NÚCLEO-B) para que no sirva de
 * oráculo de existencia a fuerza bruta. El cupo va por el USUARIO de la sesión, no por IP: el proxy
 * llama con un `fetch` interno que sale con la IP de Vercel (una sola para todos) y la cabecera de
 * IP real sería falsificable por quien golpee esta ruta directo (rotándola para saltarse el tope y
 * enumerar). El id de usuario sale de la sesión validada y no se puede falsear. Sin sesión se cae a
 * la IP de la petición, aunque `existeRuta` ya devuelve `true` sin sesión (no revela nada).
 */
export async function GET(request: Request): Promise<Response> {
  const identidad = await identidadActual();
  const clave = identidad
    ? `existe-usuario:${identidad.usuario.id}`
    : `existe-ip:${ipDe(request)}`;
  if (!(await permitir(clave, LIMITES.existe.maximo))) return demasiadas();
  const ruta = new URL(request.url).searchParams.get("ruta") ?? "";
  return Response.json({ existe: ruta.startsWith("/") ? await existeRuta(ruta) : true });
}
