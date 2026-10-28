import { cerrarClientes, dbAdmin, enTransaccion, type TenantTx } from "../src/index";

const PERSONA_ID = "00000000-0000-7000-8000-000000000082";

async function main() {
  const url = new URL(process.env["DATABASE_URL_MIGRATE"] ?? "postgresql://sin-configurar/");
  if (
    !["localhost", "127.0.0.1"].includes(url.hostname) ||
    !/^\/opai_e2e(?:_[a-zA-Z0-9_]+)?$/.test(url.pathname) ||
    process.env["NODE_ENV"] === "production"
  )
    throw new Error("Solo e2e local.");
  // FORCE RLS: el tenant se fija con `enTransaccion`; `tenants` no tiene RLS y da el id.
  const { id: tenantId } = await dbAdmin().tenant.findUniqueOrThrow({ where: { slug: "gard" } });
  await enTransaccion(tenantId, sembrar);
}

async function sembrar(db: TenantTx) {
  const vinculo = await db.vinculoLaboral.findFirstOrThrow({
    where: { personaId: PERSONA_ID, estado: "vigente" },
  });
  await db.anexoContrato.upsert({
    where: { id: "00000000-0000-7000-8000-0000000000a9" },
    update: {
      estado: "borrador",
      aprobadoPorId: null,
      aprobadoEn: null,
      rechazadoPorId: null,
      rechazadoEn: null,
      motivoRechazo: null,
      documentoId: null,
    },
    create: {
      id: "00000000-0000-7000-8000-0000000000a9",
      tenantId: vinculo.tenantId,
      personaId: PERSONA_ID,
      vinculoId: vinculo.id,
      motivoCambio: "instalacion",
      snapshotAntes: { instalacionId: "00000000-0000-7000-8000-000000000081" },
      snapshotDespues: { instalacionId: "00000000-0000-7000-8000-000000000085" },
      generadoPorTipo: "evento",
      estado: "borrador",
    },
  });
}
main()
  .catch(() => {
    console.error("Falló la fixture del anexo.");
    process.exitCode = 1;
  })
  .finally(cerrarClientes);
