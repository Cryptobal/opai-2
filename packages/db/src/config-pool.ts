let avisoPoolerEmitido = false;

/** Configuración por instancia; el pool de Neon limita las conexiones al servidor. */
export function configPool(env: NodeJS.ProcessEnv, url: string, aplicacion: boolean) {
  if (aplicacion && env["VERCEL"] && !avisoPoolerEmitido) {
    let hostConPooler = false;
    try {
      hostConPooler = /-pooler\./i.test(new URL(url).hostname);
    } catch {
      // El cliente de base de datos validará la URL; el aviso no debe interrumpir el arranque.
    }
    if (!hostConPooler) {
      avisoPoolerEmitido = true;
      console.warn("DATABASE_URL en Vercel: host sin -pooler.");
    }
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
