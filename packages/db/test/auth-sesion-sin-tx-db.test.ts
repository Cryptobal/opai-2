// B1 · causa raíz: las funciones SECURITY DEFINER de lectura de sesión (fuera de transacción) no
// abren hoyos de RLS ni se dejan secuestrar, y la migración mantiene el idle_in_transaction del rol
// opai_app en 30 s (no se baja a 5 s en este PR, decisión del Revisor, review 5707965033). Solo
// `pnpm test:db` (Postgres real).
import { randomUUID } from "node:crypto";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { leerUsuarioPorId } from "../src/auth-lecturas";
import { clienteApp } from "../src/client";
import { type Entorno, prepararEntorno, urlPropietario } from "./entorno";

describe.skipIf(!urlPropietario)("Auth · lectura de sesión fuera de transacción (B1)", () => {
  let e: Entorno;
  let app: Client; // rol efímero, miembro de opai_app (INHERIT; opai_app es NOINHERIT hacia opai_auth)
  let owner: Client; // propietario, para montar datos, roles y tablas de prueba
  let rolApp = "";
  const sufijo = randomUUID().slice(0, 8);
  let uid = "";
  const tok = `tok_${randomUUID()}`;

  beforeAll(async () => {
    e = await prepararEntorno();
    app = new Client({ connectionString: process.env["DATABASE_URL"] });
    app.on("error", () => undefined);
    await app.connect();
    rolApp = (await app.query("SELECT current_user AS u")).rows[0].u;
    owner = new Client({ connectionString: urlPropietario });
    await owner.connect();
    const u = await e.admin.user.create({ data: { name: "s", email: `s-${sufijo}@test.opai.cl` } });
    uid = u.id;
    await e.admin.session.create({
      data: { token: tok, userId: uid, expiresAt: new Date(Date.now() + 3_600_000), mfaVerified: true },
    });
  }, 120_000);

  afterAll(async () => {
    if (!e) return;
    await e.admin.session.deleteMany({ where: { userId: uid } });
    await e.admin.user.deleteMany({ where: { id: uid } });
    await app.end().catch(() => undefined);
    await owner.end().catch(() => undefined);
    await e.cerrar();
  });

  it("la función devuelve la sesión y el usuario, filtrados por token", async () => {
    const r = await app.query("SELECT * FROM core.auth_sesion_por_token($1)", [tok]);
    expect(r.rowCount).toBe(1);
    expect(r.rows[0].s_user_id).toBe(uid);
    expect(r.rows[0].u_id).toBe(uid);
    expect(r.rows[0].s_mfa_verified).toBe(true);
    const vacio = await app.query("SELECT * FROM core.auth_sesion_por_token($1)", ["inexistente"]);
    expect(vacio.rowCount).toBe(0);
  });

  it("sesión revocada: tras borrarla la función ya no la devuelve (sin caché)", async () => {
    const otro = `tok_${randomUUID()}`;
    await e.admin.session.create({
      data: { token: otro, userId: uid, expiresAt: new Date(Date.now() + 3_600_000) },
    });
    expect((await app.query("SELECT * FROM core.auth_sesion_por_token($1)", [otro])).rowCount).toBe(1);
    await e.admin.session.deleteMany({ where: { token: otro } });
    expect((await app.query("SELECT * FROM core.auth_sesion_por_token($1)", [otro])).rowCount).toBe(0);
  });

  it("opai_app sigue sin poder leer core.sessions directamente (CAR-43 intacto)", async () => {
    await expect(app.query("SELECT token FROM core.sessions LIMIT 1")).rejects.toThrow(
      /permission denied/i,
    );
  });

  it("la función no es invocable por PUBLIC ni por un rol sin grant", async () => {
    const sin = `sin_priv_${sufijo}`;
    await owner.query(`CREATE ROLE "${sin}" NOLOGIN`);
    const r = await owner.query(
      "SELECT has_function_privilege('public','core.auth_sesion_por_token(text)','EXECUTE') pub," +
        " has_function_privilege($1,'core.auth_sesion_por_token(text)','EXECUTE') rol",
      [sin],
    );
    expect(r.rows[0].pub).toBe(false);
    expect(r.rows[0].rol).toBe(false);
    await owner.query(`DROP ROLE "${sin}"`);
  });

  it("el search_path fijo no se deja secuestrar con una tabla homónima del llamador", async () => {
    const sch = `hijack_${sufijo}`;
    await owner.query(`CREATE SCHEMA "${sch}"`);
    await owner.query(`CREATE TABLE "${sch}".sessions (token text)`);
    await owner.query(`INSERT INTO "${sch}".sessions VALUES ('falso')`);
    await owner.query(`GRANT USAGE ON SCHEMA "${sch}" TO "${rolApp}"`);
    await owner.query(`GRANT SELECT ON "${sch}".sessions TO "${rolApp}"`);
    await app.query(`SET search_path = "${sch}", pg_catalog`);
    const r = await app.query("SELECT * FROM core.auth_sesion_por_token($1)", [tok]);
    await app.query("RESET search_path");
    expect(r.rowCount).toBe(1); // leyó core.sessions real, no la falsa del search_path del llamador
    expect(r.rows[0].s_token).toBe(tok);
    await owner.query(`DROP SCHEMA "${sch}" CASCADE`);
  });

  it("la migración aplicada deja idle_in_transaction_session_timeout=30s en opai_app", async () => {
    // El valor lo dejan las migraciones ya aplicadas (CAR-35 20261028220000 lo fijó en 30 s y esta
    // migración lo reafirma), NO el test: solo lo leemos. En CI (base efímera, migraciones en orden)
    // opai_app queda en 30 s. No se baja a 5 s en este PR (decisión del Revisor, review 5707965033):
    // hay escrituras que esperan a R2 dentro de la transacción y un idle corto cortaría la transacción
    // con el archivo ya en R2 pero sin su fila ni su auditoría.
    const r = await owner.query(
      "SELECT setconfig FROM pg_db_role_setting s JOIN pg_roles r ON r.oid=s.setrole" +
        " WHERE rolname='opai_app' AND s.setdatabase=0",
    );
    expect((r.rows[0]?.setconfig ?? []) as string[]).toContain(
      "idle_in_transaction_session_timeout=30s",
    );
  });

  it("token inválido: la función no devuelve fila (no revela si el token existe)", async () => {
    const r = await app.query("SELECT * FROM core.auth_sesion_por_token($1)", [`tok_${randomUUID()}`]);
    expect(r.rowCount).toBe(0);
  });

  it("sesión expirada: la función SÍ la devuelve; el vencimiento lo valida Better Auth, no la función", async () => {
    const expirado = `tok_${randomUUID()}`;
    await e.admin.session.create({
      data: { token: expirado, userId: uid, expiresAt: new Date(Date.now() - 3_600_000) },
    });
    const r = await app.query("SELECT s_expires_at FROM core.auth_sesion_por_token($1)", [expirado]);
    expect(r.rowCount).toBe(1); // la función solo filtra por token; getSession compara expires_at
    expect(new Date(r.rows[0].s_expires_at).getTime()).toBeLessThan(Date.now());
    await e.admin.session.deleteMany({ where: { token: expirado } });
  });

  it("leerUsuarioPorId con un id que no es uuid devuelve null (no revienta el cast ::uuid)", async () => {
    const base = clienteApp();
    expect(await leerUsuarioPorId(base, "no-es-uuid")).toBeNull();
    expect(await leerUsuarioPorId(base, "")).toBeNull();
    expect(await leerUsuarioPorId(base, randomUUID())).toBeNull(); // uuid válido pero inexistente
    const u = await leerUsuarioPorId(base, uid);
    expect(u?.id).toBe(uid); // uuid válido y existente: lo devuelve
  });

  it("una conexión idle in transaction se corta a ~5 s y la siguiente obtiene conexión", async () => {
    // Mecanismo: opai_app usa idle=30s en producción; aquí se fija 5 s en el rol efímero solo para
    // comprobar el corte sin esperar 30 s. Los ALTER ROLE ... SET no se heredan por membresía.
    await owner.query(`ALTER ROLE "${rolApp}" SET idle_in_transaction_session_timeout = '5s'`);
    const victima = new Client({ connectionString: process.env["DATABASE_URL"] });
    victima.on("error", () => undefined);
    await victima.connect(); // toma el tope al conectar
    await victima.query("BEGIN");
    await victima.query("SELECT 1");
    await new Promise((r) => setTimeout(r, 7000)); // queda idle in transaction
    await expect(victima.query("SELECT 1")).rejects.toThrow(); // Postgres la cortó (25P03)
    await victima.end().catch(() => undefined);
    const otra = new Client({ connectionString: process.env["DATABASE_URL"] });
    await otra.connect();
    expect((await otra.query("SELECT 1 AS ok")).rows[0].ok).toBe(1);
    await otra.end();
  }, 20_000);
});
