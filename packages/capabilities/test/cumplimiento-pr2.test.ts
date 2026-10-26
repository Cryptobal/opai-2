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
});

describe("incidentes y avisos de brecha (§16.5)", () => {
  it("registra, avanza, notifica y lista con su estado vigente", async () => {
    const { ctx } = contextoDePrueba({ semilla: semilla() });
    const i = await dato<{ casoId: string; estado: string }>(ctx, "core.cumplimiento.incidente_registrar", {
      descripcion: "Acceso no autorizado a la bandeja de documentos.",
      datosAfectados: "contacto, identificación",
    });
    expect(i.estado).toBe("abierto");
    await dato(ctx, "core.cumplimiento.incidente_avanzar", { casoId: i.casoId, estado: "en_evaluacion" });
    const n = await dato<{ estado: string; plazoEn: string | null }>(ctx, "core.cumplimiento.incidente_notificar", {
      casoId: i.casoId,
      destinatario: "agencia",
      canal: "correo",
    });
    expect(n.estado).toBe("notificado");
    const lista = await dato<{ items: { casoId: string; estado: string; aviso: unknown }[] }>(
      ctx,
      "core.cumplimiento.incidentes_listar",
      {},
    );
    const caso = lista.items.find((x) => x.casoId === i.casoId);
    expect(caso?.estado).toBe("notificado");
    expect(caso?.aviso).not.toBeNull();
  });

  it("no se puede retroceder el estado de un incidente", async () => {
    const { ctx } = contextoDePrueba({ semilla: semilla() });
    const i = await dato<{ casoId: string }>(ctx, "core.cumplimiento.incidente_registrar", {
      descripcion: "Incidente de prueba.",
    });
    await dato(ctx, "core.cumplimiento.incidente_avanzar", { casoId: i.casoId, estado: "cerrado" });
    expect(
      await codigo(ctx, "core.cumplimiento.incidente_avanzar", { casoId: i.casoId, estado: "abierto" }),
    ).toBe("UNPROCESSABLE");
  });

  it("un agente no registra incidentes (soloPersonas)", async () => {
    const { ctx } = contextoDePrueba({ ...agente, semilla: semilla() });
    expect(
      await codigo(ctx, "core.cumplimiento.incidente_registrar", { descripcion: "x no permitido" }),
    ).toBe("FORBIDDEN");
  });
});
