// Usuarios del QA aislado de Finanzas (CAR-221): un usuario autenticable por rol (owner, admin, gerente, supervisor,
// viewer) en cada una de las dos empresas ficticias qa-finanzas-a y qa-finanzas-b (10 en total), con el mecanismo de
// credenciales existente (Better Auth, mismo hash que el login). Sin invitaciones ni correo: los correos son @qa.opai.test.
//
// Falla cerrado: solo corre contra el destino exacto `opai2_qa` (ver `exigirDestinoQa` en @opai/domain), solo si la base
// no trae ninguna empresa que no sea de QA y solo si las dos empresas ya existen (primero `seed:finanzas-qa`).
// Simula por defecto; escribe con --confirmar. Las contraseñas se generan al azar, NUNCA se imprimen y se guardan solo
// en el archivo --salida (permisos 0600), que debe quedar FUERA del repositorio para entregarlo por el canal seguro.
//
// Uso (las URLs y claves llegan por entorno, nunca por argumento ni por el chat):
//   OPAI_ENTORNO=qa-aislado OPAI_QA_DESTINO=opai2-qa-aislado SII_ADAPTADOR=simulado CESION_ADAPTADOR=simulado \
//   DATABASE_URL=<opai_app> DATABASE_URL_MIGRATE=<propietario> \
//   pnpm --filter @opai/auth seed:qa-finanzas-usuarios [--confirmar --salida /ruta/segura/credenciales.json] [--rotar-claves]
import "dotenv/config";
import { randomBytes } from "node:crypto";
import { closeSync, existsSync, openSync, realpathSync, unlinkSync, writeSync } from "node:fs";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";

import { hashPassword } from "better-auth/crypto";

import { cerrarClientes, dbAdmin } from "@opai/db";
import { QA_AISLADO, exigirDestinoQa, exigirSoloEmpresasQa, planUsuariosQa } from "@opai/domain";

const RAIZ_REPO = resolve(import.meta.dirname, "../../..");

/** ¿`ruta` está dentro de `base`? (`..` solo cuenta como componente, no como inicio del nombre: «..cred.json» es un archivo). */
function estaDentro(base: string, ruta: string): boolean {
  const rel = relative(base, ruta);
  return rel === "" || (rel !== ".." && !rel.startsWith(`..${sep}`) && !isAbsolute(rel));
}

/**
 * El archivo de credenciales no puede quedar dentro del repositorio (se podría commitear por error). Se resuelve el
 * directorio padre FÍSICAMENTE (symlinks incluidos), que debe existir, y se compara con la raíz real del repositorio.
 */
function exigirSalidaFueraDelRepo(ruta: string): string {
  if (!isAbsolute(ruta))
    throw new Error("--salida debe ser una ruta absoluta fuera del repositorio.");
  const pedido = resolve(ruta);
  if (!existsSync(dirname(pedido))) throw new Error("--salida: el directorio padre no existe.");
  const destino = join(realpathSync(dirname(pedido)), basename(pedido));
  if (estaDentro(realpathSync(RAIZ_REPO), destino)) {
    throw new Error("--salida está dentro del repositorio: usa una ruta fuera de él.");
  }
  if (existsSync(destino))
    throw new Error("--salida ya existe: no se sobreescribe un archivo de credenciales.");
  return destino;
}

/** Reserva el archivo (creación exclusiva, 0600) ANTES de tocar cuentas: si no se puede escribir, no se cambia nada. */
function reservarSalida(destino: string): number {
  try {
    return openSync(destino, "wx", 0o600);
  } catch {
    throw new Error(
      "--salida no se puede crear (permisos o directorio): no se modificó ninguna cuenta.",
    );
  }
}

async function main(): Promise<void> {
  exigirDestinoQa(process.env);
  const argv = process.argv.slice(2);
  const confirmar = argv.includes("--confirmar");
  const rotar = argv.includes("--rotar-claves");
  const i = argv.indexOf("--salida");
  const salida = i >= 0 ? argv[i + 1] : undefined;
  const destinoArchivo = confirmar ? exigirSalidaFueraDelRepo(salida ?? "") : null;

  const db = dbAdmin();
  const empresas = await db.tenant.findMany({ select: { id: true, slug: true } });
  exigirSoloEmpresasQa(empresas.map((t) => t.slug));
  const porSlug = new Map(empresas.map((t) => [t.slug, t.id]));
  for (const slug of QA_AISLADO.tenants) {
    if (!porSlug.has(slug))
      throw new Error(
        `Falta la empresa ${slug}: corre primero seed:finanzas-qa para cada empresa.`,
      );
  }
  // Con FORCE RLS el propietario solo ve las filas de todas las empresas si puede saltarse la RLS.
  const [rol] = await db.$queryRaw<
    { ok: boolean }[]
  >`SELECT rolbypassrls AS ok FROM pg_roles WHERE rolname = current_user`;
  if (!rol?.ok)
    throw new Error(
      "DATABASE_URL_MIGRATE debe ser un propietario con BYPASSRLS (rol del proyecto de QA).",
    );

  const plan = planUsuariosQa();
  if (!confirmar) {
    console.log(
      `Simulación: se crearían/verificarían ${plan.length} usuarios (5 roles × ${QA_AISLADO.tenants.length} empresas) con membresía ERP. Repite con --confirmar --salida <ruta fuera del repo>.`,
    );
    return;
  }

  const credenciales: { correo: string; empresa: string; rol: string; password: string }[] = [];
  let existentes = 0;
  const fd = reservarSalida(destinoArchivo as string);
  let cambios = false;
  try {
    // Se calculan las claves y los hashes antes; los cambios de cuentas van en UNA transacción cuyo último paso escribe
    // el archivo: si la escritura falla, se revierte todo y no quedan cuentas con claves que nadie recibió.
    const nuevos = new Map<string, { password: string; hash: string }>();
    for (const u of plan) {
      const existe = await db.user.findUnique({ where: { email: u.correo }, select: { id: true } });
      if (!existe || rotar) {
        const password = randomBytes(18).toString("base64url");
        nuevos.set(u.correo, { password, hash: await hashPassword(password) });
      }
    }
    await db.$transaction(
      async (tx) => {
        for (const u of plan) {
          const tenantId = porSlug.get(u.slug) as string;
          let usuario = await tx.user.findUnique({ where: { email: u.correo } });
          const nuevo = nuevos.get(u.correo);
          if (!nuevo) {
            existentes += 1;
          } else {
            const { password, hash } = nuevo;
            if (usuario) {
              await tx.account.updateMany({
                where: { userId: usuario.id, providerId: "credential" },
                data: { password: hash },
              });
            } else {
              const creado = await tx.user.create({
                data: { email: u.correo, name: `QA ${u.rol} ${u.slug}`, emailVerified: true },
              });
              await tx.account.create({
                data: {
                  userId: creado.id,
                  providerId: "credential",
                  accountId: creado.id,
                  password: hash,
                },
              });
              usuario = creado;
            }
            credenciales.push({ correo: u.correo, empresa: u.slug, rol: u.rol, password });
          }
          await tx.membership.upsert({
            where: { tenantId_userId: { tenantId, userId: usuario.id } },
            update: { rol: u.rol, portales: ["erp"], estado: "activa" },
            create: { tenantId, userId: usuario.id, rol: u.rol, portales: ["erp"] },
          });
        }
        if (credenciales.length > 0) writeSync(fd, `${JSON.stringify(credenciales, null, 2)}\n`);
      },
      { timeout: 60_000 },
    );
    cambios = true;
  } finally {
    closeSync(fd);
    if (!cambios || credenciales.length === 0) unlinkSync(destinoArchivo as string);
  }
  console.log(
    `Listo: ${plan.length} membresías (${credenciales.length} cuentas con clave nueva, ${existentes} ya existían sin tocar su clave). ` +
      (credenciales.length > 0
        ? "Credenciales en el archivo --salida (0600): entrégalas por el canal seguro y bórralo."
        : "Sin credenciales nuevas."),
  );
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => cerrarClientes());
