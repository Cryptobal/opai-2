import type { PrismaClient } from "../src/generated/prisma/client";
import { enEtapaComprasQa as etapa } from "./compras-qa-preview-error";
import { escribirComprasQa } from "./compras-qa-escribir";
import { validarContextoPreview, validarDestinoPreview } from "./compras-qa-preview-validar";

type Dependencias = { fetch: typeof fetch; conectar: (url: string) => PrismaClient };

/** No se construye Prisma hasta validar respuestas de ambas consultas al origen fijo. */
export async function ejecutarComprasQaPreview(
  env: NodeJS.ProcessEnv,
  evento: unknown,
  deps: Dependencias,
) {
  const { proyecto, ramaId } = await etapa("CONTEXTO", () => validarContextoPreview(env, evento));
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
  const branch = await etapa("METADATA_RAMA", () => leer(`${base}/branches/${ramaId}`));
  const endpoints = await etapa("METADATA_ENDPOINTS", () =>
    leer(`${base}/branches/${ramaId}/endpoints`),
  );
  const url = await etapa("DESTINO", () => validarDestinoPreview(env, branch, endpoints));
  const db = await etapa("CONSTRUIR_CLIENTE", () => deps.conectar(url));
  try {
    await etapa("FIXTURE", () => escribirComprasQa(db));
  } finally {
    await etapa("CERRAR_CLIENTE", () => db.$disconnect());
  }
}
