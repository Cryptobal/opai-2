import { beforeEach, describe, expect, it } from "vitest";

import { contextoDePrueba, TENANT_DE_PRUEBA, USUARIO_DE_PRUEBA } from "../src/testing";
import type { Fila } from "../src/testing/db-memoria-util";
import { codigo, dato, reiniciar } from "./maestros-ayuda";

beforeEach(reiniciar);

const PERSONA = "0192f3a0-0000-7000-8000-0000000000c1";
const CONTACTO = "0192f3a0-0000-7000-8000-0000000000c2";

function semilla(): Record<string, Fila[]> {
  return {
    persona: [
      {
        id: PERSONA,
        tenantId: TENANT_DE_PRUEBA,
        nombres: "María Fernanda",
        apellidos: "Soto",
        rut: "16234567-8",
        emailLaboral: "mf.soto@gard.cl",
        nacionalidad: "CL",
      },
    ],
    contacto: [
      {
        id: CONTACTO,
        tenantId: TENANT_DE_PRUEBA,
        cuentaId: "0192f3a0-0000-7000-8000-0000000000d1",
        nombres: "Juan",
        apellidos: "Pérez",
        email: "juan@cliente.cl",
      },
    ],
  };
}

const agente = {
  usuario: USUARIO_DE_PRUEBA,
  actor: { tipo: "agent" as const, id: "k1", viaUserId: USUARIO_DE_PRUEBA.id },
  scopes: ["*"],
};

describe("consentimientos (Brief 07d, PR 2)", () => {
  it("otorga, lista el vigente y revoca (append-only)", async () => {
    const { ctx, tabla } = contextoDePrueba({ semilla: semilla() });
    const input = { titular: { tipo: "contacto", id: CONTACTO }, proposito: "comunicaciones_comerciales", versionAviso: "2026-10" };
    const r = await dato<{ estado: string }>(ctx, "core.cumplimiento.consentimiento_registrar", input);
    expect(r.estado).toBe("otorgado");
    const lista = await dato<{ vigentes: { estado: string }[]; historial: unknown[] }>(
      ctx,
      "core.cumplimiento.consentimientos_listar",
      { titular: { tipo: "contacto", id: CONTACTO } },
    );
    expect(lista.vigentes[0]?.estado).toBe("otorgado");
    await dato(ctx, "core.cumplimiento.consentimiento_revocar", {
      titular: { tipo: "contacto", id: CONTACTO },
      proposito: "comunicaciones_comerciales",
    });
    // Append-only: quedan dos filas (otorgado + revocado), no se editó la primera.
    expect(tabla("consentimiento")).toHaveLength(2);
    const lista2 = await dato<{ vigentes: { estado: string }[] }>(ctx, "core.cumplimiento.consentimientos_listar", {
      titular: { tipo: "contacto", id: CONTACTO },
    });
    expect(lista2.vigentes[0]?.estado).toBe("revocado");
  });

  it("revocar sin consentimiento vigente falla", async () => {
    const { ctx } = contextoDePrueba({ semilla: semilla() });
    expect(
      await codigo(ctx, "core.cumplimiento.consentimiento_revocar", {
        titular: { tipo: "persona", id: PERSONA },
        proposito: "x_sin_otorgar",
      }),
    ).toBe("UNPROCESSABLE");
  });

  it("un titular inexistente da NOT_FOUND (no se confía en el id)", async () => {
    const { ctx } = contextoDePrueba({ semilla: semilla() });
    expect(
      await codigo(ctx, "core.cumplimiento.consentimiento_registrar", {
        titular: { tipo: "persona", id: "0192f3a0-0000-7000-8000-00000000ffff" },
        proposito: "marketing",
        versionAviso: "1",
      }),
    ).toBe("NOT_FOUND");
  });

  it("un agente no registra consentimientos (soloPersonas)", async () => {
    const { ctx } = contextoDePrueba({ ...agente, semilla: semilla() });
    expect(
      await codigo(ctx, "core.cumplimiento.consentimiento_registrar", {
        titular: { tipo: "contacto", id: CONTACTO },
        proposito: "comunicaciones_comerciales",
        versionAviso: "1",
      }),
    ).toBe("FORBIDDEN");
  });
});

describe("solicitudes del titular (ARCO+)", () => {
  it("crea sin plazo por defecto, avanza y resuelve con auditoría", async () => {
    const { ctx, eventos } = contextoDePrueba({ semilla: semilla() });
    const s = await dato<{ id: string; estado: string; plazoEn: string | null }>(
      ctx,
      "core.cumplimiento.solicitud_crear",
      { tipo: "acceso", titular: { tipo: "persona", id: PERSONA } },
    );
    expect(s.estado).toBe("recibida");
    expect(s.plazoEn).toBeNull(); // sin días configurados (§16.3)
    const av = await dato<{ estado: string }>(ctx, "core.cumplimiento.solicitud_avanzar", { id: s.id });
    expect(av.estado).toBe("en_proceso");
    const re = await dato<{ estado: string }>(ctx, "core.cumplimiento.solicitud_resolver", {
      id: s.id,
      estado: "resuelta",
      resultado: "Se entregó la exportación.",
    });
    expect(re.estado).toBe("resuelta");
    expect(eventos.map((e) => e.capability)).toContain("core.cumplimiento.solicitud_resolver");
  });

  it("calcula el plazo cuando los días están configurados", async () => {
    const { ctx, tabla } = contextoDePrueba({ semilla: semilla() });
    tabla("ajuste").push({
      tenantId: TENANT_DE_PRUEBA,
      sujetoId: TENANT_DE_PRUEBA,
      modulo: "core",
      clave: "cumplimiento_solicitud_dias_plazo",
      ambito: "tenant",
      valor: 20,
    });
    const s = await dato<{ plazoEn: string | null }>(ctx, "core.cumplimiento.solicitud_crear", {
      tipo: "acceso",
      titularEmail: "externo@correo.cl",
    });
    expect(s.plazoEn).not.toBeNull();
  });

  it("avanzar valida que el responsable sea miembro activo de la empresa (test negativo)", async () => {
    const { ctx, tabla } = contextoDePrueba({ semilla: semilla() });
    const s = await dato<{ id: string }>(ctx, "core.cumplimiento.solicitud_crear", {
      tipo: "acceso",
      titular: { tipo: "persona", id: PERSONA },
    });
    // Un responsable que no es miembro de la empresa se rechaza (no se confía en el id).
    expect(
      await codigo(ctx, "core.cumplimiento.solicitud_avanzar", {
        id: s.id,
        responsableId: "0192f3a0-0000-7000-8000-00000000aaaa",
      }),
    ).toBe("UNPROCESSABLE");
    // Con una membresía activa, sí se asigna.
    tabla("membership").push({
      tenantId: TENANT_DE_PRUEBA,
      userId: USUARIO_DE_PRUEBA.id,
      rol: "admin",
      estado: "activa",
      portales: ["erp"],
    });
    const av = await dato<{ responsableId: string | null }>(
      ctx,
      "core.cumplimiento.solicitud_avanzar",
      { id: s.id, responsableId: USUARIO_DE_PRUEBA.id },
    );
    expect(av.responsableId).toBe(USUARIO_DE_PRUEBA.id);
  });

  it("no se puede resolver dos veces (estado terminal)", async () => {
    const { ctx } = contextoDePrueba({ semilla: semilla() });
    const s = await dato<{ id: string }>(ctx, "core.cumplimiento.solicitud_crear", {
      tipo: "rectificacion",
      titular: { tipo: "persona", id: PERSONA },
    });
    await dato(ctx, "core.cumplimiento.solicitud_resolver", { id: s.id, estado: "resuelta", resultado: "listo" });
    expect(
      await codigo(ctx, "core.cumplimiento.solicitud_resolver", { id: s.id, estado: "resuelta", resultado: "otra vez" }),
    ).toBe("UNPROCESSABLE");
  });

  it("dryRun de crear no persiste", async () => {
    const { ctx, tabla } = contextoDePrueba({ semilla: semilla() });
    await dato(ctx, "core.cumplimiento.solicitud_crear", { tipo: "acceso", titular: { tipo: "persona", id: PERSONA } }, { dryRun: true });
    expect(tabla("solicitudArco")).toHaveLength(0);
  });

  it("un agente no crea solicitudes (soloPersonas)", async () => {
    const { ctx } = contextoDePrueba({ ...agente, semilla: semilla() });
    expect(
      await codigo(ctx, "core.cumplimiento.solicitud_crear", { tipo: "acceso", titular: { tipo: "persona", id: PERSONA } }),
    ).toBe("FORBIDDEN");
  });

  it("exporta el acceso de un titular como documento del Núcleo con huella", async () => {
    const { ctx, tabla } = contextoDePrueba({ semilla: semilla() });
    const s = await dato<{ id: string }>(ctx, "core.cumplimiento.solicitud_crear", {
      tipo: "acceso",
      titular: { tipo: "persona", id: PERSONA },
    });
    const exp = await dato<{ documentoId: string; sha256: string; bytes: number }>(
      ctx,
      "core.cumplimiento.solicitud_exportar",
      { solicitudId: s.id },
    );
    expect(exp.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(exp.bytes).toBeGreaterThan(0);
    const doc = tabla("documento").find((d) => d["id"] === exp.documentoId);
    expect(doc).toMatchObject({ mime: "application/json", estado: "disponible", origen: "generado" });
    // La solicitud queda enlazada a la evidencia.
    const sol = tabla("solicitudArco").find((x) => x["id"] === s.id);
    expect(sol?.["documentoEvidenciaId"]).toBe(exp.documentoId);
  });

  it("solo acceso y portabilidad exportan", async () => {
    const { ctx } = contextoDePrueba({ semilla: semilla() });
    const s = await dato<{ id: string }>(ctx, "core.cumplimiento.solicitud_crear", {
      tipo: "oposicion",
      titular: { tipo: "persona", id: PERSONA },
    });
    expect(await codigo(ctx, "core.cumplimiento.solicitud_exportar", { solicitudId: s.id })).toBe(
      "UNPROCESSABLE",
    );
  });

  it("la exportación (RUT, domicilio, contacto) solo la ve cumplimiento.read: supervisor y viewer no", async () => {
    const owner = contextoDePrueba({ semilla: semilla() });
    const s = await dato<{ id: string }>(owner.ctx, "core.cumplimiento.solicitud_crear", {
      tipo: "acceso",
      titular: { tipo: "persona", id: PERSONA },
    });
    const exp = await dato<{ documentoId: string }>(
      owner.ctx,
      "core.cumplimiento.solicitud_exportar",
      { solicitudId: s.id },
    );
    // Se vincula a la solicitud ARCO (entidad de cumplimiento), no al tenant.
    expect(owner.tabla("documentoVinculo").find((v) => v["documentoId"] === exp.documentoId)).toMatchObject({
      entidadTipo: "solicitud_arco",
      entidadId: s.id,
    });

    // Mismos datos, otro rol: base nueva sembrada con lo ya creado.
    const comoRol = (rol: "supervisor" | "viewer" | "gerente") =>
      contextoDePrueba({
        rol,
        semilla: {
          persona: owner.tabla("persona"),
          solicitudArco: owner.tabla("solicitudArco"),
          documento: owner.tabla("documento"),
          documentoVinculo: owner.tabla("documentoVinculo"),
        },
      }).ctx;

    for (const rol of ["supervisor", "viewer"] as const) {
      const ctx = comoRol(rol);
      // Tienen documentos.read, pero la exportación no aparece en la lista…
      const lista = await dato<{ items: { id: string }[] }>(ctx, "core.documentos.list", {});
      expect(lista.items.some((d) => d.id === exp.documentoId)).toBe(false);
      // …ni se obtiene ni se descarga: «no encontrado», sin revelar que existe (sin enumeración).
      expect(await codigo(ctx, "core.documentos.get", { id: exp.documentoId })).toBe("NOT_FOUND");
      expect(await codigo(ctx, "core.documentos.url_descarga", { id: exp.documentoId })).toBe(
        "NOT_FOUND",
      );
    }

    // Un rol con cumplimiento.read (gerente) sí la ve, la obtiene y la descarga.
    const gerente = comoRol("gerente");
    const vistos = await dato<{ items: { id: string }[] }>(gerente, "core.documentos.list", {});
    expect(vistos.items.some((d) => d.id === exp.documentoId)).toBe(true);
    expect(await codigo(gerente, "core.documentos.get", { id: exp.documentoId })).toBe("OK");
    expect(await codigo(gerente, "core.documentos.url_descarga", { id: exp.documentoId })).toBe("OK");
  });
});

describe("incidentes y avisos de brecha (§16.5)", () => {
  it("notifica por destinatario: notificado solo con Agencia y titulares; plazo desde la detección", async () => {
    const { ctx, tabla } = contextoDePrueba({ semilla: semilla() });
    // Días de plazo configurados por el tenant (el valor legal lo fija el abogado, §16.5).
    tabla("ajuste").push({
      tenantId: TENANT_DE_PRUEBA,
      sujetoId: TENANT_DE_PRUEBA,
      modulo: "core",
      clave: "cumplimiento_brecha_dias_plazo",
      ambito: "tenant",
      valor: 5,
    });
    const ocurridoEn = "2026-10-01T00:00:00.000Z";
    const i = await dato<{ casoId: string; estado: string }>(ctx, "core.cumplimiento.incidente_registrar", {
      descripcion: "Acceso no autorizado a la bandeja de documentos.",
      datosAfectados: "contacto, identificación",
      ocurridoEn,
    });
    expect(i.estado).toBe("abierto");
    await dato(ctx, "core.cumplimiento.incidente_avanzar", { casoId: i.casoId, estado: "en_evaluacion" });

    // Primer aviso (Agencia): aún NO está notificada; falta titulares.
    const n1 = await dato<{ estado: string; plazoEn: string | null; notificada: boolean; pendientes: string[] }>(
      ctx,
      "core.cumplimiento.incidente_notificar",
      { casoId: i.casoId, destinatario: "agencia", canal: "correo" },
    );
    expect(n1.notificada).toBe(false);
    expect(n1.estado).toBe("en_evaluacion"); // no se marca notificado con un solo aviso
    expect(n1.pendientes).toEqual(["titulares"]);
    // El plazo corre desde la detección (ocurridoEn + 5 días), no desde el aviso.
    expect(n1.plazoEn).toBe("2026-10-06T00:00:00.000Z");

    // Avisar de nuevo a la Agencia se rechaza (ya consta).
    expect(
      await codigo(ctx, "core.cumplimiento.incidente_notificar", { casoId: i.casoId, destinatario: "agencia" }),
    ).toBe("UNPROCESSABLE");

    // Segundo aviso (titulares): ahora sí queda notificada, con el mismo plazo desde la detección.
    const n2 = await dato<{ estado: string; plazoEn: string | null; notificada: boolean; pendientes: string[] }>(
      ctx,
      "core.cumplimiento.incidente_notificar",
      { casoId: i.casoId, destinatario: "titulares", canal: "correo" },
    );
    expect(n2.notificada).toBe(true);
    expect(n2.estado).toBe("notificado");
    expect(n2.pendientes).toEqual([]);
    expect(n2.plazoEn).toBe("2026-10-06T00:00:00.000Z");

    const lista = await dato<{
      items: { casoId: string; estado: string; avisos: unknown[]; notificada: boolean }[];
    }>(ctx, "core.cumplimiento.incidentes_listar", {});
    const caso = lista.items.find((x) => x.casoId === i.casoId);
    expect(caso?.estado).toBe("notificado");
    expect(caso?.notificada).toBe(true);
    expect(caso?.avisos).toHaveLength(2);
  });

  it("no se puede retroceder el estado de un incidente", async () => {
    const { ctx } = contextoDePrueba({ semilla: semilla() });
    const i = await dato<{ casoId: string }>(ctx, "core.cumplimiento.incidente_registrar", {
      descripcion: "Incidente de prueba.",
    });
    await dato(ctx, "core.cumplimiento.incidente_avanzar", { casoId: i.casoId, estado: "cerrado" });
    // Desde "cerrado" (terminal) no se avanza a "en_evaluacion": transición inválida.
    expect(
      await codigo(ctx, "core.cumplimiento.incidente_avanzar", { casoId: i.casoId, estado: "en_evaluacion" }),
    ).toBe("UNPROCESSABLE");
  });

  it("un agente no registra incidentes (soloPersonas)", async () => {
    const { ctx } = contextoDePrueba({ ...agente, semilla: semilla() });
    expect(
      await codigo(ctx, "core.cumplimiento.incidente_registrar", { descripcion: "x no permitido" }),
    ).toBe("FORBIDDEN");
  });
});
