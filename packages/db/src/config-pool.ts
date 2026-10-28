/** Configuración por instancia; el pool de Neon limita las conexiones al servidor. */
export function configPool(env: NodeJS.ProcessEnv, url: string, aplicacion: boolean) {
  if (aplicacion && env["VERCEL"] && !/^.+-pooler\..+\.neon\.tech$/.test(new URL(url).hostname)) {
    throw new Error("DATABASE_URL en Vercel debe usar el endpoint pooler de Neon.");
  }
  const entero = (nombre: string, defecto: number) => {
    const valor = env[nombre];
    if (valor === undefined || valor === "") return defecto;
    if (!/^\d+$/.test(valor) || !Number.isSafeInteger(Number(valor)) || Number(valor) < 1) {
      throw new Error(`${nombre} debe ser un entero positivo.`);
    }
    return Number(valor);
  };
  return {
    max: entero("DATABASE_POOL_MAX", 4),
    idleTimeoutMillis: entero("DATABASE_POOL_IDLE_TIMEOUT_MS", 10000),
    connectionTimeoutMillis: entero("DATABASE_POOL_CONNECTION_TIMEOUT_MS", 10000),
    keepAlive: true,
  };
}
