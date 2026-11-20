import { LIMITES, permitir } from "@/lib/rate-limit";
import { demasiadas, noAutenticado } from "@/lib/respuestas";
import { identidadActual } from "@/lib/servidor";

export const falloGeo = (status: number, message: string) =>
  Response.json({ ok: false, error: { message } }, { status });

/** Sesión, rate limit y portal con derecho a mapas/geocodificación. */
export async function accesoGeo(opts: {
  prefijoLimite: string;
  maximo: number;
  portales: readonly string[];
}): Promise<{ portal: string } | Response> {
  const identidad = await identidadActual();
  if (!identidad?.actual) return noAutenticado();
  if (!(await permitir(`${opts.prefijoLimite}:${identidad.usuario.id}`, opts.maximo)))
    return demasiadas();
  const portal = opts.portales.find((p) => identidad.actual?.portales.includes(p));
  if (!portal) return falloGeo(403, "Tu acceso no incluye mapas.");
  return { portal };
}

export { LIMITES };