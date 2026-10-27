// No se ejecuta en despliegues. OPAI 2.0 lo corre tras aprobación y con el presupuesto de Carlos.
import "dotenv/config";
import { createHash, randomInt } from "node:crypto";
import { realpath, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { cerrarClientes, dbAdmin, enTransaccion, sembrarCatalogo } from "../src/index";

/**
 * `destino` debe quedar fuera del repositorio. Compara por segmentos de ruta (nunca
 * `.startsWith("..")` sobre el string: un directorio real llamado "..secret" también empieza con
 * ".." y pasaría el chequeo naíf) y resuelve enlaces simbólicos de ambos lados con `realpath`, para
 * que un symlink no disfrace una ruta interna como externa ni al revés.
 */
export async function exigirFueraDelRepositorio(destino: string): Promise<void> {
  // dirname(este archivo) = packages/db/scripts; tres niveles arriba es la raíz del repositorio.
  const raizRepo = await realpath(
    resolve(dirname(fileURLToPath(import.meta.url)), "../../.."),
  );
  let dirDestino: string;
  try {
    dirDestino = await realpath(dirname(destino));
  } catch {
    throw new Error("El directorio de STAGING_KEY_FILE no existe; créalo antes de correr el seed.");
  }
  const rel = relative(raizRepo, dirDestino);
  const esExterno = rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel);
  if (!esExterno)
    throw new Error("STAGING_KEY_FILE debe ser una ruta fuera del repositorio (secreto, modo 0600).");
}

async function main() {
  const userId = process.env["STAGING_RESPONSABLE_ID"];
  const presupuesto = Number(process.env["STAGING_PRESUPUESTO_USD"]);
  const destino = process.env["STAGING_KEY_FILE"];
  if (!userId || !Number.isFinite(presupuesto) || presupuesto <= 0 || presupuesto > 100_000)
    throw new Error(
      "Indica STAGING_RESPONSABLE_ID y STAGING_PRESUPUESTO_USD aprobado por Carlos (0 < USD <= 100000).",
    );
  if (!destino || !isAbsolute(destino))
    throw new Error(
      "STAGING_KEY_FILE debe ser una ruta absoluta fuera del repositorio (secreto, modo 0600).",
    );
  await exigirFueraDelRepositorio(destino);
  const admin = dbAdmin();
  if (!(await admin.user.findUnique({ where: { id: userId } })))
    throw new Error("Responsable inválido.");
  const tenant = await admin.tenant.upsert({
    where: { slug: "gard-staging" },
    update: {},
    create: {
      slug: "gard-staging",
      nombre: "Gard Staging · datos ficticios",
      vertical: "seguridad",
    },
  });
  await enTransaccion(tenant.id, async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended('seed:gard-staging', 0))`;
    await sembrarCatalogo(tx, tenant.id, "seguridad");
    // Responsable solo de gobierno; el servicio NO hereda este rol ni sus permisos.
    await tx.membership.upsert({
      where: { tenantId_userId: { tenantId: tenant.id, userId } },
      update: {},
      create: { tenantId: tenant.id, userId, rol: "viewer", portales: ["erp"], estado: "activa" },
    });
    if (!(await tx.cuenta.findFirst({ where: { nombre: "Cliente ficticio staging" } })))
      await tx.cuenta.create({ data: { tenantId: tenant.id, nombre: "Cliente ficticio staging" } });
    const existente = await tx.apiKey.findFirst({ where: { nombre: "Grokbot dev" } });
    if (existente) {
      if (existente.principalTipo !== "servicio" || existente.revocadaEn)
        throw new Error(
          "Grokbot dev existente requiere revisión humana; el seed no rota ni reactiva keys.",
        );
      return;
    }
    const alfabeto = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
    const secreto = `opai_gard-staging_${Array.from({ length: 32 }, () => alfabeto[randomInt(62)]).join("")}`;
    // La fila se crea ANTES de escribir el archivo: si el archivo es lo último del bloque, un fallo
    // de la base revierte la transacción sin haber tocado el disco, y un fallo de la base NUNCA deja
    // un archivo huérfano que bloquee el reintento (`wx` no sobrescribe un secreto existente).
    await tx.apiKey.create({
      data: {
        tenantId: tenant.id,
        userId,
        nombre: "Grokbot dev",
        principalTipo: "servicio",
        scopes: ["core"],
        permisos: ["core:cuentas.read"],
        heredaPermisos: false,
        presupuestoMensualMicro: BigInt(Math.round(presupuesto * 1_000_000)),
        prefijo: secreto.slice(0, "opai_gard-staging_".length + 4),
        hash: createHash("sha256").update(secreto).digest("hex"),
      },
    });
    // Nunca a stdout ni al repositorio; wx no sobrescribe un archivo de secretos existente.
    await writeFile(destino, secreto + "\n", { mode: 0o600, flag: "wx" });
  });
  console.log(
    "gard-staging preparado; una key por bot, scopes mínimos y datos ficticios. No se imprime el secreto.",
  );
}

// Solo corre al invocarlo directamente (tsx/pnpm), nunca al importar sus funciones en un test.
if (process.argv[1] && import.meta.filename === process.argv[1]) {
  main()
    .catch(() => {
      console.error(
        "No se completó seed:staging. Revisa configuración y permisos; no se imprimen datos ni secretos.",
      );
      process.exitCode = 1;
    })
    .finally(() => cerrarClientes());
}
