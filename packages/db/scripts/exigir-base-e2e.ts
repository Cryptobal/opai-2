const LOCAL = ["localhost", "127.0.0.1", "[::1]"];
const BASE_E2E = /^\/opai_e2e(?:_[a-zA-Z0-9_]+)?$/;

function destino(variable: string): URL {
  return new URL(process.env[variable] ?? "postgresql://sin-configurar/");
}

/**
 * Guardia de las fixtures e2e. Las escrituras de tenant corren por `enTransaccion`, que conecta con
 * `DATABASE_URL` (rol `opai_app`), mientras que el tenant se resuelve con `DATABASE_URL_MIGRATE`.
 * Ambas deben ser la misma base `opai_e2e` local: si no, la fixture escribiría fuera de la base validada.
 */
export function exigirBaseE2E(): void {
  const migrar = destino("DATABASE_URL_MIGRATE");
  const app = destino("DATABASE_URL");
  const local = (u: URL) => LOCAL.includes(u.hostname) && BASE_E2E.test(u.pathname);
  if (
    !local(migrar) ||
    !local(app) ||
    migrar.hostname !== app.hostname ||
    migrar.port !== app.port ||
    migrar.pathname !== app.pathname ||
    process.env["NODE_ENV"] === "production"
  )
    throw new Error("Solo opai_e2e local (DATABASE_URL y DATABASE_URL_MIGRATE deben coincidir).");
}
