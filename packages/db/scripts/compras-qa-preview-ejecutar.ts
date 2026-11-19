import type { PrismaClient } from "../src/generated/prisma/client";
import { escribirComprasQa } from "./compras-qa-escribir";
import { validarContextoPreview, validarDestinoPreview } from "./compras-qa-preview-validar";

type Dependencias = { fetch: typeof fetch; conectar: (url: string) => PrismaClient };

/** No se construye Prisma hasta validar respuestas de ambas consultas al origen fijo. */
export async function ejecutarComprasQaPreview(
  env: NodeJS.ProcessEnv,
  evento: unknown,
  deps: Dependencias,
) {
  const { proyecto, ramaId } = validarContextoPreview(env, evento);
  const base = `https://console.neon.tech/api/v2/projects/${proyecto}`;
  const leer = async (url: string): Promise<unknown> => {
    const r = await deps.fetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${env.NEON_API_KEY}` },
      redirect: "error",
      signal: AbortSignal.timeout(15_000),
    });
    if (!r.ok || r.redirected || r.url !== url)
      throw new Error("No se pudo verificar metadata de preview.");
    return r.json();
  };
  const branch = await leer(`${base}/branches/${ramaId}`);
  const endpoints = await leer(`${base}/endpoints`);
  const url = validarDestinoPreview(env, branch, endpoints);
  const db = deps.conectar(url);
  try {
    await escribirComprasQa(db);
  } finally {
    await db.$disconnect();
  }
}
