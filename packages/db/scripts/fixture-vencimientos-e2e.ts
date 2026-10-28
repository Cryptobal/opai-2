import { cerrarClientes, dbAdmin } from "../src/index";

async function main() {
  const url = new URL(process.env["DATABASE_URL_MIGRATE"] ?? "postgresql://sin-configurar/");
  if (!["localhost", "127.0.0.1"].includes(url.hostname)) throw new Error("Solo base local de e2e");
  const db = dbAdmin();
  const tenant = await db.tenant.findUniqueOrThrow({ where: { slug: "gard" } });
  const codigo = "fixture-vencimientos-inicio-e2e";
  const existente = await db.documentoTipo.findUnique({ where: { tenantId_codigo: { tenantId: tenant.id, codigo } } });
  if (existente) {
    await db.documento.deleteMany({ where: { tenantId: tenant.id, tipoId: existente.id } });
    await db.documentoTipo.delete({ where: { id: existente.id } });
  }
  if (process.argv[2] === "limpiar") return;
  const persona = await db.persona.findFirstOrThrow({ where: { tenantId: tenant.id, archivadaEn: null, estado: { not: "inactiva" } } });
  const tipo = await db.documentoTipo.create({ data: { tenantId: tenant.id, codigo, nombre: "Vencimiento E2E", capa: "persona", tieneVencimiento: true } });
  const documento = await db.documento.create({ data: { tenantId: tenant.id, tipoId: tipo.id, nombre: "e2e.pdf", mime: "application/pdf", tamano: 1, storageKey: crypto.randomUUID(), creadoPorTipo: "user", estado: "disponible", venceEn: new Date("2020-01-01") } });
  await db.documentoVinculo.create({ data: { tenantId: tenant.id, documentoId: documento.id, entidadTipo: "persona", entidadId: persona.id } });
}
main().finally(() => cerrarClientes());
