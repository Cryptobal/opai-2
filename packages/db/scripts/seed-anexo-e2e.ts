import { cerrarClientes, dbAdmin, enTransaccion, type TenantTx } from "../src/index";

const PERSONA_ID = "00000000-0000-7000-8000-000000000082";
// Por defecto, el anexo que recorren las e2e; cada proyecto rechaza el suyo (`ANEXO_E2E_ID`, solo
// ids fijos de prueba) para no pisarse si los proyectos corren en paralelo.
const ANEXO_ID = process.env["ANEXO_E2E_ID"] ?? "00000000-0000-7000-8000-0000000000a9";

async function main() {
  const url = new URL(process.env["DATABASE_URL_MIGRATE"] ?? "postgresql://sin-configurar/");
  if (
    !["localhost", "127.0.0.1"].includes(url.hostname) ||
    !/^\/opai_e2e(?:_[a-zA-Z0-9_]+)?$/.test(url.pathname) ||
    process.env["NODE_ENV"] === "production"
  )
    throw new Error("Solo e2e local.");
  if (!/^00000000-0000-7000-8000-0000000000a[0-9a-f]$/.test(ANEXO_ID))
    throw new Error("Id de prueba inválido.");
  // FORCE RLS: el tenant se fija con `enTransaccion`; `tenants` no tiene RLS y da el id.
  const { id: tenantId } = await dbAdmin().tenant.findUniqueOrThrow({ where: { slug: "gard" } });
  await enTransaccion(tenantId, sembrar);
}

async function sembrar(db: TenantTx) {
  const vinculo = await db.vinculoLaboral.findFirstOrThrow({
    where: { personaId: PERSONA_ID, estado: "vigente" },
  });
  await db.anexoContrato.upsert({
    where: { id: ANEXO_ID },
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
      id: ANEXO_ID,
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
