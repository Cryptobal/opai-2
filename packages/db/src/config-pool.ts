let avisoPoolerEmitido = false;

const SSL_ALIAS_DE_VERIFY_FULL = new Set(["prefer", "require", "verify-ca"]);

/**
 * pg 8 trata `sslmode=prefer|require|verify-ca` como `verify-full` y lo avisa con un SECURITY
 * WARNING en cada arranque (en pg 9 pasarán a la semántica de libpq, más débil). Fijamos
 * `verify-full` explícito: es el comportamiento que ya tiene hoy, sin el aviso y sin que la
 * actualización a pg 9 lo debilite. Neon usa certificados públicos, así que verifica sin CA propia.
 * `uselibpqcompat=true` es una elección explícita y se respeta; sin `sslmode` no se toca.
 */
export function conSslVerificado(url: string): string {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return url;
  }
  const modo = u.searchParams.get("sslmode");
  if (
    !modo ||
    !SSL_ALIAS_DE_VERIFY_FULL.has(modo) ||
    u.searchParams.get("uselibpqcompat") === "true"
  ) {
    return url;
  }
  u.searchParams.set("sslmode", "verify-full");
  return u.toString();
}

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
    connectionString: conSslVerificado(url),
    max: entero("DATABASE_POOL_MAX", 10),
    // Corto: en Vercel `attachDatabasePool` mantiene viva la función este tiempo tras cada consulta,
    // y una conexión que pasa más que esto en el pool se descarta al pedirla (`conexionMuerta`).
    idleTimeoutMillis: entero("DATABASE_POOL_IDLE_TIMEOUT_MS", 5000),
    // Holgado para el arranque en frío de Neon (la compute suspendida tarda de 0,5 a pocos s en
    // despertar). Un vencimiento adelantado tras reanudar la instancia se reintenta una vez.
    connectionTimeoutMillis: entero("DATABASE_POOL_CONNECTION_TIMEOUT_MS", 10000),
    // Sondas TCP desde los 10 s (no las 2 h del sistema): detectan antes un socket que Neon cortó
    // a mitad de una consulta larga o de una transacción abierta.
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,
  };
}
