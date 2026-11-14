// Persona ficticia con usuario de OPAI para auditar el portal Guardia (CAR-401, CAR-334). SOLO desarrollo y SOLO
// empresas de QA (`qa-*`, nunca Gard ni datos reales). Deja en la empresa: el cargo «Guardia QA», la persona «Guardia QA
// Auditoría» (RUT sintético 31000201) con vínculo vigente, un usuario @qa.opai.test con membresía solo de los portales
// Trabajador y Terreno, y la persona vinculada a ese usuario. El PIN lo asigna la auditoría desde la pantalla.
// Sin invitaciones ni correo; la contraseña del usuario es aleatoria y no se imprime (entra con RUT y PIN).
// Simula por defecto; escribe con --confirmar. Idempotente.
// Uso: OPAI_ENTORNO=dev DATABASE_URL=<opai_app de dev> DATABASE_URL_MIGRATE=<propietario de dev> \
//      pnpm --filter @opai/auth seed:guardia-qa --tenant qa-e2e [--confirmar]
import "dotenv/config";
import { randomBytes } from "node:crypto";

import { hashPassword } from "better-auth/crypto";

import { cerrarClientes, dbAdmin, enTransaccion } from "@opai/db";
import { digitoVerificador } from "@opai/domain";

const CUERPO_RUT = "31000201";
const RUT = `${CUERPO_RUT}-${digitoVerificador(CUERPO_RUT)}`;

function destino(argv: string[], env: NodeJS.ProcessEnv) {
  if (
    env["VERCEL_ENV"] === "production" ||
    env["NODE_ENV"] === "production" ||
    env["OPAI_ENTORNO"] !== "dev"
  )
    throw new Error("Solo para desarrollo: exige OPAI_ENTORNO=dev y una base de dev.");
  const i = argv.indexOf("--tenant");
  const slug = i >= 0 ? argv[i + 1] : undefined;
  if (!slug || !/^qa-[a-z0-9-]+$/.test(slug))
    throw new Error(
      "Indica una empresa de QA con --tenant qa-<nombre> (el slug debe empezar con «qa-»).",
    );
  const [app, migrar] = [env["DATABASE_URL"], env["DATABASE_URL_MIGRATE"]].map((u) => {
    if (!u) throw new Error("Faltan DATABASE_URL y DATABASE_URL_MIGRATE.");
    const url = new URL(u);
    return `${url.hostname}:${url.port}${url.pathname}`;
  });
  if (app !== migrar)
    throw new Error("DATABASE_URL y DATABASE_URL_MIGRATE deben apuntar a la misma base.");
  return { slug, confirmar: argv.includes("--confirmar") };
}

async function main(): Promise<void> {
  const { slug, confirmar } = destino(process.argv.slice(2), process.env);
  const tenant = await dbAdmin().tenant.findUnique({ where: { slug }, select: { id: true } });
  if (!tenant) throw new Error(`No existe la empresa «${slug}»: este script no crea empresas.`);
  const email = `guardia.${slug}@qa.opai.test`;
  if (!confirmar) {
    console.log(
      `Simulación en «${slug}»: cargo «Guardia QA», persona «Guardia QA Auditoría» (RUT ${RUT}) con vínculo vigente, usuario ${email} con portales Trabajador y Terreno, y la persona vinculada. Repite con --confirmar.`,
    );
    return;
  }
  // Identidad con el rol propietario (desde CAR-43 `opai_app` no crea usuarios ni toca `core.accounts`).
  const admin = dbAdmin();
  const usuario =
    (await admin.user.findUnique({ where: { email } })) ??
    (await admin.$transaction(async (tx) => {
      const u = await tx.user.create({
        data: { email, name: "Guardia QA Auditoría", emailVerified: true },
      });
      const hash = await hashPassword(randomBytes(24).toString("base64url"));
      await tx.account.create({
        data: { userId: u.id, providerId: "credential", accountId: u.id, password: hash },
      });
      return u;
    }));
  const tenantId = tenant.id;
  const personaId = await enTransaccion(tenantId, async (db) => {
    const cargo =
      (await db.cargo.findFirst({ where: { tenantId, nombre: "Guardia QA" } })) ??
      (await db.cargo.create({ data: { tenantId, nombre: "Guardia QA" } }));
    const persona =
      (await db.persona.findFirst({ where: { tenantId, rut: RUT } })) ??
      (await db.persona.create({
        data: {
          tenantId,
          nombres: "Guardia QA",
          apellidos: "Auditoría",
          rut: RUT,
          estado: "activa",
        },
      }));
    const vigente = await db.vinculoLaboral.findFirst({
      where: { tenantId, personaId: persona.id, estado: "vigente" },
    });
    if (!vigente)
      await db.vinculoLaboral.create({
        data: {
          tenantId,
          personaId: persona.id,
          cargoId: cargo.id,
          tipo: "indefinido",
          inicio: new Date("2026-11-01"),
        },
      });
    // Converge al estado esperado aunque la membresía exista (suspendida, otro rol u otros portales).
    const acceso = { rol: "viewer", portales: ["trabajador", "terreno"], estado: "activa" };
    await db.membership.upsert({
      where: { tenantId_userId: { tenantId, userId: usuario.id } },
      update: acceso,
      create: { tenantId, userId: usuario.id, ...acceso },
    });
    await db.persona.update({ where: { id: persona.id }, data: { usuarioId: usuario.id } });
    return persona.id;
  });
  console.log(
    `Listo en «${slug}»: persona ${personaId} vinculada a ${email}. La auditoría le asigna el PIN.`,
  );
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => cerrarClientes());
