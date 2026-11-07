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
import { chmodSync, existsSync, writeFileSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";

import { hashPassword } from "better-auth/crypto";

import { cerrarClientes, dbAdmin } from "@opai/db";
import { QA_AISLADO, exigirDestinoQa, exigirSoloEmpresasQa, planUsuariosQa } from "@opai/domain";

const RAIZ_REPO = resolve(import.meta.dirname, "../../..");

/** El archivo de credenciales no puede quedar dentro del repositorio (se podría commitear por error). */
function exigirSalidaFueraDelRepo(ruta: string): string {
  if (!isAbsolute(ruta)) throw new Error("--salida debe ser una ruta absoluta fuera del repositorio.");
  const destino = resolve(ruta);
  const rel = relative(RAIZ_REPO, destino);
  if (rel === "" || (!rel.startsWith("..") && !isAbsolute(rel))) {
    throw new Error("--salida está dentro del repositorio: usa una ruta fuera de él.");
  }
  if (existsSync(destino)) throw new Error("--salida ya existe: no se sobreescribe un archivo de credenciales.");
  return destino;
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
    if (!porSlug.has(slug)) throw new Error(`Falta la empresa ${slug}: corre primero seed:finanzas-qa para cada empresa.`);
  }
  // Con FORCE RLS el propietario solo ve las filas de todas las empresas si puede saltarse la RLS.
  const [rol] = await db.$queryRaw<{ ok: boolean }[]>`SELECT rolbypassrls AS ok FROM pg_roles WHERE rolname = current_user`;
  if (!rol?.ok) throw new Error("DATABASE_URL_MIGRATE debe ser un propietario con BYPASSRLS (rol del proyecto de QA).");

  const plan = planUsuariosQa();
  if (!confirmar) {
    console.log(`Simulación: se crearían/verificarían ${plan.length} usuarios (5 roles × ${QA_AISLADO.tenants.length} empresas) con membresía ERP. Repite con --confirmar --salida <ruta fuera del repo>.`);
    return;
  }

  const credenciales: { correo: string; empresa: string; rol: string; password: string }[] = [];
  let existentes = 0;
  for (const u of plan) {
    const tenantId = porSlug.get(u.slug) as string;
    let usuario = await db.user.findUnique({ where: { email: u.correo } });
    if (usuario && !rotar) {
      existentes += 1;
    } else {
      const password = randomBytes(18).toString("base64url");
      const hash = await hashPassword(password);
      if (usuario) {
        await db.account.updateMany({ where: { userId: usuario.id, providerId: "credential" }, data: { password: hash } });
      } else {
        const creado = await db.user.create({ data: { email: u.correo, name: `QA ${u.rol} ${u.slug}`, emailVerified: true } });
        await db.account.create({ data: { userId: creado.id, providerId: "credential", accountId: creado.id, password: hash } });
        usuario = creado;
      }
      credenciales.push({ correo: u.correo, empresa: u.slug, rol: u.rol, password });
    }
    await db.membership.upsert({
      where: { tenantId_userId: { tenantId, userId: usuario.id } },
      update: { rol: u.rol, portales: ["erp"], estado: "activa" },
      create: { tenantId, userId: usuario.id, rol: u.rol, portales: ["erp"] },
    });
  }
  if (credenciales.length > 0 && destinoArchivo) {
    writeFileSync(destinoArchivo, `${JSON.stringify(credenciales, null, 2)}\n`, { mode: 0o600 });
    chmodSync(destinoArchivo, 0o600);
  }
  console.log(
    `Listo: ${plan.length} membresías (${credenciales.length} cuentas con clave nueva, ${existentes} ya existían sin tocar su clave). ` +
      (credenciales.length > 0 ? "Credenciales en el archivo --salida (0600): entrégalas por el canal seguro y bórralo." : "Sin credenciales nuevas."),
  );
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => cerrarClientes());
