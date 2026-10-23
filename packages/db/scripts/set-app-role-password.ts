// Fija la contraseña del rol `opai_app` en la base indicada por DATABASE_URL_MIGRATE.
// Se corre una vez por base (main, dev, test). La contraseña viene de OPAI_APP_DB_PASSWORD
// y nunca se imprime. Generarla con: openssl rand -base64 32
import "dotenv/config";
import { Client } from "pg";

async function main(): Promise<void> {
  const url = process.env["DATABASE_URL_MIGRATE"];
  const password = process.env["OPAI_APP_DB_PASSWORD"];
  if (!url) throw new Error("Falta DATABASE_URL_MIGRATE.");
  if (!password || password.length < 16) {
    throw new Error("Falta OPAI_APP_DB_PASSWORD o es demasiado corta (mínimo 16 caracteres).");
  }
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    const existe = await client.query("SELECT 1 FROM pg_roles WHERE rolname = 'opai_app'");
    if (existe.rowCount === 0) {
      throw new Error("El rol opai_app no existe. Aplica primero las migraciones (pnpm db:deploy).");
    }
    // ALTER ROLE no acepta parámetros: se escapa como literal con el cliente de pg.
    await client.query(`ALTER ROLE opai_app WITH LOGIN PASSWORD ${client.escapeLiteral(password)}`);
    console.log("Contraseña de opai_app actualizada.");
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
