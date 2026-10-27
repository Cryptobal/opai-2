import { randomUUID } from "node:crypto";

import type { Entorno } from "../../db/test/entorno";

/** Solo datos ficticios en la base local de pruebas, nunca servicios externos. */
export async function sembrarLecturas(e: Entorno) {
  const sufijo = randomUUID();
  const tenantId = (
    await e.admin.tenant.create({
      data: { slug: `lecturas-${sufijo}`, nombre: "Ficticio", vertical: "seguridad" },
    })
  ).id;
  const userId = (
    await e.admin.user.create({
      data: { name: "NO COPIAR", email: `lecturas-${sufijo}@example.test` },
    })
  ).id;
  const membershipId = (
    await e.admin.membership.create({ data: { tenantId, userId, rol: "owner", portales: ["erp"] } })
  ).id;
  await e.admin.permisoExcepcion.create({
    data: {
      tenantId,
      membershipId,
      permiso: "core:personas.read",
      conceder: true,
      creadoPor: userId,
    },
  });
  const cuentaId = (await e.admin.cuenta.create({ data: { tenantId, nombre: "Lectura cuenta" } }))
    .id;
  const instalacionId = (
    await e.admin.instalacion.create({
      data: { tenantId, cuentaId, nombre: "Lectura instalación" },
    })
  ).id;
  const contactoId = (
    await e.admin.contacto.create({
      data: {
        tenantId,
        cuentaId,
        nombres: "Lectura",
        apellidos: "Contacto",
        email: "no-copiar@example.test",
      },
    })
  ).id;
  const personaId = (
    await e.admin.persona.create({
      data: { tenantId, rut: "12345678-5", nombres: "Lectura", apellidos: "Persona" },
    })
  ).id;
  const cargoId = (await e.admin.cargo.create({ data: { tenantId, nombre: "Ficticio" } })).id;
  const vinculoId = (
    await e.admin.vinculoLaboral.create({
      data: { tenantId, personaId, cargoId, tipo: "indefinido", inicio: new Date("2026-01-01") },
    })
  ).id;
  const consentimientoId = (
    await e.admin.consentimiento.create({
      data: {
        tenantId,
        titularTipo: "contacto",
        titularId: contactoId,
        proposito: "comercial",
        versionAviso: "1",
        estado: "otorgado",
      },
    })
  ).id;
  const solicitudId = (
    await e.admin.solicitudArco.create({
      data: { tenantId, tipo: "acceso", titularTipo: "contacto", titularId: contactoId },
    })
  ).id;
  const casoId = randomUUID();
  await e.admin.incidente.create({
    data: { tenantId, casoId, evento: "registro", estado: "abierto", descripcion: "NO COPIAR" },
  });
  await e.admin.perfilEmpresa.create({ data: { tenantId, dpoNombre: "NO COPIAR" } });
  const documento = async (entidadTipo: string, entidadId: string) => {
    const d = await e.admin.documento.create({
      data: {
        tenantId,
        nombre: "NO COPIAR.pdf",
        mime: "application/pdf",
        tamano: 10,
        storageKey: `${tenantId}/${randomUUID()}`,
        creadoPorTipo: "user",
        estado: "disponible",
        venceEn: new Date("2026-01-01"),
      },
    });
    await e.admin.documentoVinculo.create({
      data: { tenantId, documentoId: d.id, entidadTipo, entidadId },
    });
    return d.id;
  };
  const documentoId = await documento("instalacion", instalacionId);
  const sensibleId = await documento("solicitud_arco", solicitudId);
  const invitacionId = (
    await e.admin.invitation.create({
      data: {
        tenantId,
        email: "no-copiar@example.test",
        rol: "viewer",
        portales: ["erp"],
        tokenHash: randomUUID(),
        expiresAt: new Date("2099-01-01"),
        invitedByUserId: userId,
      },
    })
  ).id;
  const notificacionId = (
    await e.admin.notificacion.create({
      data: {
        tenantId,
        usuarioId: userId,
        titulo: "NO COPIAR",
      },
    })
  ).id;
  const apiKeyId = (
    await e.admin.apiKey.create({
      data: {
        tenantId,
        userId,
        nombre: "Ficticio",
        prefijo: "ficticio",
        hash: randomUUID(),
        scopes: ["core"],
      },
    })
  ).id;
  const aprobacionId = (
    await e.admin.aprobacion.create({
      data: {
        tenantId,
        apiKeyId,
        viaUserId: userId,
        capability: "core.personas.create",
        input: { nombre: "NO COPIAR" },
        resumen: "NO COPIAR",
        venceEn: new Date("2099-01-01"),
      },
    })
  ).id;
  return {
    tenantId,
    userId,
    cuentaId,
    instalacionId,
    contactoId,
    personaId,
    vinculoId,
    consentimientoId,
    solicitudId,
    casoId,
    documentoId,
    sensibleId,
    invitacionId,
    notificacionId,
    membershipId,
    apiKeyId,
    aprobacionId,
  };
}

export type FixtureLecturas = Awaited<ReturnType<typeof sembrarLecturas>>;

export function casosLecturas(f: FixtureLecturas): [string, object, string[]][] {
  return [
    ["core.personas.list", {}, [f.personaId]],
    ["core.instalaciones.list", {}, [f.instalacionId]],
    ["core.instalaciones.get", { id: f.instalacionId }, [f.instalacionId]],
    ["core.excepciones.list", { membershipId: f.membershipId }, [f.userId]],
    ["core.personas.get", { id: f.personaId }, [f.personaId]],
    ["core.contactos.list", { cuentaId: f.cuentaId }, [f.contactoId]],
    ["core.contactos.get", { id: f.contactoId }, [f.contactoId]],
    ["core.vinculos.list", { personaId: f.personaId }, [f.vinculoId]],
    ["core.cuentas.list", {}, [f.cuentaId]],
    ["core.cuentas.get", { id: f.cuentaId }, [f.cuentaId, f.contactoId]],
    ["core.buscar", { q: "Lectura" }, [f.cuentaId, f.personaId, f.contactoId]],
    ["core.empresa.get", {}, []],
    ["core.cumplimiento.estado", {}, []],
    [
      "core.cumplimiento.consentimientos_listar",
      { titular: { tipo: "contacto", id: f.contactoId } },
      [f.contactoId, f.consentimientoId],
    ],
    ["core.cumplimiento.incidentes_listar", {}, [f.casoId]],
    ["core.documentos.list", {}, [f.sensibleId, f.documentoId]],
    ["core.documentos.get", { id: f.sensibleId }, [f.sensibleId]],
    ["core.documentos.url_descarga", { id: f.sensibleId }, [f.sensibleId]],
    ["core.documentos.vencimientos", {}, [f.documentoId, f.sensibleId]],
    ["core.documentos.matriz", {}, [f.personaId]],
    ["core.users.list", {}, [f.userId]],
    ["core.invitations.list", {}, [f.invitacionId]],
    ["core.notificaciones.list", {}, [f.notificacionId]],
    ["core.apikeys.list", {}, [f.apiKeyId]],
    ["core.apikeys.get", { id: f.apiKeyId }, [f.apiKeyId]],
    ["core.aprobaciones.list", {}, [f.aprobacionId]],
    ["core.aprobaciones.get", { id: f.aprobacionId }, [f.aprobacionId]],
    ["core.inicio.pendientes", {}, []],
  ];
}
