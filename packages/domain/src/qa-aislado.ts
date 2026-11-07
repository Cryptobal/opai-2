// Destino de QA aislado de Finanzas (CAR-221). Lógica pura: valida, sin tocar nada, que un script de siembra
// apunte EXACTAMENTE al proyecto de QA vacío (base `opai2_qa`) y nunca a Gard, a main ni a una copia de datos.
// Falla cerrado: ante cualquier duda, el script no escribe. Los mensajes nunca repiten una URL ni un secreto.

export const QA_AISLADO = {
  entorno: "qa-aislado",
  destino: "opai2-qa-aislado",
  base: "opai2_qa",
  rolApp: "opai_app",
  tenants: ["qa-finanzas-a", "qa-finanzas-b"],
} as const;

export const ROLES_QA = ["owner", "admin", "gerente", "supervisor", "viewer"] as const;
export type RolQa = (typeof ROLES_QA)[number];

export type EntornoQa = Readonly<Record<string, string | undefined>>;

type Conexion = { host: string; puerto: string; base: string; usuario: string };

/** Lee host, puerto, base y usuario; null si no es una URL de Postgres. Nunca devuelve ni registra la clave. */
function leerConexion(url: string | undefined): Conexion | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (!/^postgres(ql)?:$/.test(u.protocol)) return null;
    // Neon expone el mismo endpoint directo y por pool (`-pooler`): es el mismo destino.
    const host = u.hostname.replace("-pooler", "");
    return { host, puerto: u.port || "5432", base: u.pathname.replace(/^\//, ""), usuario: decodeURIComponent(u.username) };
  } catch {
    return null;
  }
}

/** Todo lo que impide usar este entorno como destino del QA aislado; vacío si es seguro. */
export function problemasDestinoQa(env: EntornoQa): string[] {
  const p: string[] = [];
  if (env["OPAI_ENTORNO"] !== QA_AISLADO.entorno) p.push(`Exige OPAI_ENTORNO=${QA_AISLADO.entorno}.`);
  if (env["OPAI_QA_DESTINO"] !== QA_AISLADO.destino) p.push(`Exige OPAI_QA_DESTINO=${QA_AISLADO.destino} (confirmación del destino).`);
  if (env["VERCEL_ENV"] === "production" || env["NODE_ENV"] === "production") p.push("No corre en producción.");

  const app = leerConexion(env["DATABASE_URL"]);
  const dueno = leerConexion(env["DATABASE_URL_MIGRATE"]);
  if (!app) p.push("Falta DATABASE_URL (rol de aplicación) o no es una URL de Postgres.");
  if (!dueno) p.push("Falta DATABASE_URL_MIGRATE (propietario del QA) o no es una URL de Postgres.");
  if (app && dueno) {
    if (app.host !== dueno.host || app.puerto !== dueno.puerto || app.base !== dueno.base) {
      p.push("DATABASE_URL y DATABASE_URL_MIGRATE deben apuntar a la misma base.");
    }
    if (app.usuario !== QA_AISLADO.rolApp) p.push(`DATABASE_URL debe usar el rol ${QA_AISLADO.rolApp} (sin BYPASSRLS), no el propietario.`);
    if (dueno.usuario === QA_AISLADO.rolApp) p.push("DATABASE_URL_MIGRATE debe ser el propietario, distinto de opai_app.");
  }
  for (const c of [app, dueno]) {
    if (c && c.base !== QA_AISLADO.base) p.push(`La base debe llamarse ${QA_AISLADO.base}.`);
  }

  if (env["SII_ADAPTADOR"] !== "simulado") p.push("SII_ADAPTADOR debe ser «simulado»: sin salida al SII.");
  if (env["CESION_ADAPTADOR"] !== "simulado") p.push("CESION_ADAPTADOR debe ser «simulado»: sin salida a la factoring.");
  if (env["RESEND_API_KEY"]) p.push("RESEND_API_KEY debe estar vacía: sin correo real.");
  return [...new Set(p)];
}

/** Lanza con todos los problemas juntos (sin valores sensibles); no hace nada si el destino es el QA aislado. */
export function exigirDestinoQa(env: EntornoQa): void {
  const p = problemasDestinoQa(env);
  if (p.length > 0) throw new Error(`Destino no autorizado para el QA aislado:\n- ${p.join("\n- ")}`);
}

/** El QA aislado solo tiene empresas `qa-*`: si hay otra (p. ej. `gard`), la base no es la vacía y se aborta. */
export function exigirSoloEmpresasQa(slugs: readonly string[]): void {
  const ajenas = slugs.filter((s) => !/^qa-[a-z0-9-]+$/.test(s));
  if (ajenas.length > 0) {
    throw new Error(`La base tiene empresas que no son de QA (${ajenas.length}): no es el QA aislado vacío.`);
  }
}

/** Solo las dos empresas del QA aislado. */
export function exigirTenantQaAislado(slug: string): void {
  if (!(QA_AISLADO.tenants as readonly string[]).includes(slug)) {
    throw new Error(`«${slug}» no es una empresa del QA aislado (${QA_AISLADO.tenants.join(", ")}).`);
  }
}

/** Correo ficticio y determinista de un usuario de QA (dominio .test: no existe, no recibe correo). */
export const correoQa = (slug: string, rol: RolQa): string => `${rol}.${slug}@qa.opai.test`;

export type UsuarioQa = { slug: string; rol: RolQa; correo: string };

/** Cuentas del QA aislado: un usuario por rol en cada una de las dos empresas (10 en total). */
export function planUsuariosQa(): UsuarioQa[] {
  return QA_AISLADO.tenants.flatMap((slug) => ROLES_QA.map((rol) => ({ slug, rol, correo: correoQa(slug, rol) })));
}
