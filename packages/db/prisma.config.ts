// Configuración de la CLI de Prisma (migraciones). La aplicación NO usa este archivo:
// se conecta con el rol `opai_app` a través de DATABASE_URL (ver src/client.ts).
import "dotenv/config";
import { defineConfig } from "prisma/config";

// Rol propietario, conexión directa. Solo en la máquina de Carlos o en CI. Nunca en Vercel.
// Si falta (por ejemplo en `prisma generate` durante un build), se usa un valor inválido:
// `generate` no se conecta, y `migrate` falla con un error claro.
const urlMigraciones = process.env["DATABASE_URL_MIGRATE"] ?? "postgresql://sin-configurar/opai";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: urlMigraciones,
  },
});
