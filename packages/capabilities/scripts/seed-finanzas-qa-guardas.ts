// Guardas del seed de QA de Finanzas (puras, con prueba): entorno, base y tenant de QA.
// Dos destinos válidos: `dev` (tenant qa-* en la base de desarrollo) y `qa-aislado` (proyecto de QA vacío, CAR-221).
import { QA_AISLADO, exigirDestinoQa, exigirTenantQaAislado } from "@opai/domain";

export type DestinoSeedQa = { slug: string; confirmar: boolean };

const baseDe = (variable: string, env: Record<string, string | undefined>): URL => {
  const valor = env[variable];
  if (!valor) throw new Error(`Falta ${variable}.`);
  return new URL(valor);
};

/** Solo tenants de QA: el slug real de la empresa (`gard`) o cualquier otro sin prefijo `qa-` se rechaza. */
export function exigirTenantQa(slug: string): void {
  if (!/^qa-[a-z0-9-]+$/.test(slug)) throw new Error(`«${slug}» no es un tenant de QA: el slug debe empezar con «qa-».`);
}

/** Ambas URLs deben apuntar a la misma base (el tenant se lee con MIGRATE y las capacidades escriben con APP). */
export function exigirMismaBase(env: Record<string, string | undefined>): void {
  const migrar = baseDe("DATABASE_URL_MIGRATE", env);
  const app = baseDe("DATABASE_URL", env);
  if (migrar.hostname !== app.hostname || migrar.port !== app.port || migrar.pathname !== app.pathname)
    throw new Error("DATABASE_URL y DATABASE_URL_MIGRATE deben apuntar a la misma base.");
}

export function leerDestino(argv: string[], env: Record<string, string | undefined>): DestinoSeedQa {
  if (env["OPAI_ENTORNO"] === QA_AISLADO.entorno) return leerDestinoQaAislado(argv, env);
  if (env["VERCEL_ENV"] === "production" || env["NODE_ENV"] === "production" || env["OPAI_ENTORNO"] !== "dev")
    throw new Error("Solo para desarrollo: exige OPAI_ENTORNO=dev y una base de dev.");
  const i = argv.indexOf("--tenant");
  const valor = i >= 0 ? argv[i + 1] : env["OPAI_QA_TENANT"];
  if (!valor || valor.startsWith("--")) throw new Error("Indica el tenant de QA con --tenant qa-<nombre> u OPAI_QA_TENANT.");
  exigirTenantQa(valor);
  exigirMismaBase(env);
  return { slug: valor, confirmar: argv.includes("--confirmar") };
}

/** Destino QA aislado: base `opai2_qa`, rol de aplicación real, salidas simuladas y solo las dos empresas de QA. */
function leerDestinoQaAislado(argv: string[], env: Record<string, string | undefined>): DestinoSeedQa {
  exigirDestinoQa(env);
  const i = argv.indexOf("--tenant");
  const valor = i >= 0 ? argv[i + 1] : env["OPAI_QA_TENANT"];
  if (!valor || valor.startsWith("--")) throw new Error("Indica el tenant de QA con --tenant qa-<nombre> u OPAI_QA_TENANT.");
  exigirTenantQaAislado(valor);
  return { slug: valor, confirmar: argv.includes("--confirmar") };
}
