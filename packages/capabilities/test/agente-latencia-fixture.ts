import { createHash, randomUUID } from "node:crypto";
import { crearContexto, prohibido } from "../src";
import type { Entorno } from "../../db/test/entorno";
export const respuesta = {
  texto: "Respuesta sintética",
  llamadas: [],
  uso: { tokensEntrada: 1, tokensSalida: 1 },
};
export const cap = "agente.turno.preparar";
// Lee autorización fresca de la DB fixture; no sustituye las pruebas del borde web/MFA.
export async function crearFixture(e: Entorno) {
  const suffix = randomUUID();
  const t = await e.admin.tenant.create({
    data: { slug: suffix, nombre: "Sintético", vertical: "seguridad", estado: "activo" },
  });
  const u = await e.admin.user.create({
    data: { name: "Sintético", email: `${suffix}@prueba.invalid`, emailVerified: true },
  });
  const m = await e.admin.membership.create({
    data: { tenantId: t.id, userId: u.id, rol: "owner", portales: ["erp"] },
  });
  await e.admin.tenantModule.create({
    data: { tenantId: t.id, moduloId: "agente", estado: "activo" },
  });
  const leer = async () => {
    const membership = await e.forTenant(t.id).membership.findUnique({
      where: { id: m.id },
      include: { excepciones: true, rolTenant: true },
    });
    const tenant = await e.admin.tenant.findUniqueOrThrow({ where: { id: t.id } });
    const modules = await e.forTenant(t.id).tenantModule.findMany({ orderBy: { moduloId: "asc" } });
    return {
      tenant: t.id,
      user: u.id,
      estadoTenant: tenant.estado,
      membership: membership && {
        id: membership.id,
        rol: membership.rol,
        estado: membership.estado,
        portales: [...membership.portales].sort(),
        permisos: membership.rolTenant?.permisos ?? null,
        excepciones: membership.excepciones.map((x) => [x.permiso, x.conceder]).sort(),
      },
      modules: modules.map((x) => [x.moduloId, x.estado]),
    };
  };
  const contexto = async () => {
    const inicial = await leer();
    const hash = (s: unknown) => createHash("sha256").update(JSON.stringify(s)).digest("hex");
    const ctx = crearContexto({
      tenantId: t.id,
      rol: "owner",
      actor: { tipo: "user", id: u.id },
      usuario: { id: u.id, nombre: "Sintético", email: u.email, platformRole: null },
      portal: "erp",
      portalesMembresia: ["erp"],
      modulosActivos: ["agente"],
    });
    ctx.revalidarAccesoSolicitud = async () => {
      const actual = await leer();
      if (
        actual.estadoTenant !== "activo" ||
        actual.membership?.estado !== "activa" ||
        !actual.membership.portales.includes("erp") ||
        hash(actual) !== hash(inicial) ||
        actual.membership.excepciones.some((x) => x[0] === "agente:usar" && x[1] === false)
      )
        throw prohibido("Acceso sintético revocado");
      return hash(actual);
    };
    return ctx;
  };
  const counts = async () => ({
    conversaciones: await e.admin.agenteConversacion.count({ where: { tenantId: t.id } }),
    auditorias: await e.admin.auditEvent.count({ where: { tenantId: t.id, capability: cap } }),
  });
  const consumos = () =>
    e.admin.consumo.findMany({ where: { tenantId: t.id, actorTipo: "agent", capability: cap } });
  const input = {
    mensaje: "Ensayo sintético",
    modelo: { proveedor: "ia_anthropic", modelo: "simulado", clase: "economica" },
    nivel: "paso_a_paso",
    turnoId: randomUUID(),
  };
  return { t, u, m, contexto, counts, consumos, input };
}

/** Falla real de Postgres, acotada al tenant fixture; conserva auditoría y tx reales. */
export async function conFalloAuditoria(
  e: Entorno,
  tenantId: string,
  ejecutar: () => Promise<void>,
) {
  await e.admin.$executeRawUnsafe(
    `CREATE FUNCTION core.car227_rechazar_auditoria() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.tenant_id = '${tenantId}'::uuid AND NEW.capability = 'agente.turno.preparar' THEN RAISE EXCEPTION 'fixture audit rejected'; END IF; RETURN NEW; END $$`,
  );
  try {
    await e.admin.$executeRawUnsafe(
      "CREATE TRIGGER car227_rechazar BEFORE INSERT ON core.audit_events FOR EACH ROW EXECUTE FUNCTION core.car227_rechazar_auditoria()",
    );
    await ejecutar();
  } finally {
    await e.admin.$executeRawUnsafe("DROP TRIGGER IF EXISTS car227_rechazar ON core.audit_events");
    await e.admin.$executeRawUnsafe("DROP FUNCTION IF EXISTS core.car227_rechazar_auditoria()");
  }
}
