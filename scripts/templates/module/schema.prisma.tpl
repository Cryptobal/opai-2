// Tablas del módulo __NOMBRE__ en el schema de Postgres "__ID__".
// Reglas: tenant_id en toda tabla, IDs uuid(7), columnas snake_case, created_at/updated_at,
// y en la migración: ENABLE ROW LEVEL SECURITY + CREATE POLICY tenant_isolation (ver CLAUDE.md).
// Ejemplo:
// model __CAMEL__Registro {
//   id        String   @id @default(uuid(7)) @db.Uuid
//   tenantId  String   @map("tenant_id") @db.Uuid
//   nombre    String
//   createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
//   updatedAt DateTime @updatedAt @map("updated_at") @db.Timestamptz(6)
//   @@index([tenantId])
//   @@map("registros")
//   @@schema("__ID__")
// }
