// Usuario de fixture e2e con contraseña. Identidad con el rol propietario (`dbAdmin`): desde CAR-43,
// `opai_app` no crea usuarios ni toca `core.accounts`. Nunca Neon/producción (exigirBaseE2E).
import { dbAdmin } from "@opai/db";

export async function usuarioE2E(email: string, nombre: string, hash: string) {
  const db = dbAdmin();
  const user = await db.user.upsert({
    where: { email },
    update: {},
    create: { email, name: nombre, emailVerified: true },
  });
  const actual = await db.account.findFirst({ where: { userId: user.id, providerId: "credential" } });
  if (actual) await db.account.update({ where: { id: actual.id }, data: { password: hash } });
  else
    await db.account.create({
      data: { userId: user.id, providerId: "credential", accountId: user.id, password: hash },
    });
  return user;
}
