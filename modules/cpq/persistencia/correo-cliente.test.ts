import { contextoDePrueba, TENANT_DE_PRUEBA } from "@opai/capabilities/testing";
import { describe, expect, it } from "vitest";

import { TOPE_ADJUNTOS_BYTES } from "../domain/documento/correo-envio";
import { CONTACTO_1, CUENTA_1 } from "../capabilities/fixtures";
import { enviarCorreoCliente, previsualizarCorreoCliente, type PdfParaCorreo } from "./correo-cliente";

const USUARIO_CLIENTE = "0192f3a0-0000-7000-8000-0000000000b1";
const MEMBRESIA = "0192f3a0-0000-7000-8000-0000000000b2";

function escenario(extra: Record<string, unknown[]> = {}, modulos = ["cpq", "portal_cliente"]) {
  return contextoDePrueba({
    modulosActivos: modulos,
    semilla: {
      tenant: [{ id: TENANT_DE_PRUEBA, slug: "empresa", nombre: "Empresa Demo" }],
      perfilEmpresa: [{ id: "p1", tenantId: TENANT_DE_PRUEBA, nombreComercial: "Demo SpA", correoComercial: "ventas@demo.cl" }],
      cuenta: [{ id: CUENTA_1, tenantId: TENANT_DE_PRUEBA, nombre: "Cliente SA", archivadaEn: null }],
      contacto: [
        { id: CONTACTO_1, tenantId: TENANT_DE_PRUEBA, cuentaId: CUENTA_1, nombres: "Marta Lagos", email: "marta@cliente.cl", estado: "activo", archivadoEn: null, anonimizadoEn: null },
      ],
      ...extra,
    },
  });
}

const pdf = (clave: "cotizacion" | "propuesta", bytes: number): PdfParaCorreo => ({
  clave,
  nombre: clave === "cotizacion" ? "Cotizacion-CPQ-1.pdf" : "Propuesta-tecnica-CPQ-1.pdf",
  bytes,
  contenido: new Uint8Array(Math.min(bytes, 8)),
  storageKey: `k/${clave}`,
});

const solicitud = (pdfs: PdfParaCorreo[]) => ({
  para: "marta@cliente.cl",
  contactoId: CONTACTO_1,
  cuentaId: CUENTA_1,
  codigo: "CPQ-1",
  titulo: "Guardias planta norte",
  version: 2,
  mensaje: "",
  pdfs,
});

describe("correo al cliente (CAR-192)", () => {
  it("envía los dos PDF adjuntos, saluda al contacto e invita a su primer acceso", async () => {
    const { ctx, correos } = escenario();
    const r = await enviarCorreoCliente(ctx, solicitud([pdf("cotizacion", 1000), pdf("propuesta", 2000)]));
    expect(r).toEqual({ enviado: true, acceso: "invitado" });
    const invitacion = correos.find((c) => c.asunto.toLowerCase().includes("invit"));
    expect(invitacion).toBeTruthy();
    const c = correos.find((x) => x.asunto.startsWith("Propuesta CPQ-1"));
    expect(c?.adjuntos?.map((a) => a.nombre)).toEqual(["Cotizacion-CPQ-1.pdf", "Propuesta-tecnica-CPQ-1.pdf"]);
    expect(c?.adjuntos?.every((a) => a.mime === "application/pdf")).toBe(true);
    expect(c?.texto).toContain("Hola Marta,");
    expect(c?.texto).toContain("CPQ-1 (versión 2)");
    expect(c?.texto).toContain("la primera vez");
    expect(c?.texto).toContain("ventas@demo.cl");
    expect(c?.texto).toContain("https://test.opai.cl/cliente");
    expect(c?.texto).not.toMatch(/\n{3,}/);
  });

  it("sin propuesta técnica adjunta solo la cotización", async () => {
    const { ctx, correos } = escenario();
    await enviarCorreoCliente(ctx, solicitud([pdf("cotizacion", 1000)]));
    const c = correos.find((x) => x.asunto.startsWith("Propuesta CPQ-1"));
    expect(c?.adjuntos?.map((a) => a.nombre)).toEqual(["Cotizacion-CPQ-1.pdf"]);
  });

  it("si la suma supera el tope adjunta la cotización y enlaza la propuesta", async () => {
    const { ctx, correos } = escenario();
    await enviarCorreoCliente(ctx, solicitud([pdf("cotizacion", 1000), pdf("propuesta", TOPE_ADJUNTOS_BYTES)]));
    const c = correos.find((x) => x.asunto.startsWith("Propuesta CPQ-1"));
    expect(c?.adjuntos?.map((a) => a.nombre)).toEqual(["Cotizacion-CPQ-1.pdf"]);
    expect(c?.texto).toContain("Propuesta-tecnica-CPQ-1.pdf:");
  });

  it("reenviar no repite la invitación si ya hay una vigente", async () => {
    const { ctx, correos } = escenario();
    await enviarCorreoCliente(ctx, solicitud([pdf("cotizacion", 10)]));
    const r = await enviarCorreoCliente(ctx, solicitud([pdf("cotizacion", 10)]));
    expect(r.acceso).toBe("invitacion_pendiente");
    expect(correos.filter((c) => c.asunto.toLowerCase().includes("invit"))).toHaveLength(1);
  });

  it("quien ya tiene acceso activo no recibe invitación ni pasos de primera vez", async () => {
    const { ctx, correos } = escenario({
      user: [{ id: USUARIO_CLIENTE, email: "marta@cliente.cl", name: "Marta Lagos" }],
      membership: [{ id: MEMBRESIA, tenantId: TENANT_DE_PRUEBA, userId: USUARIO_CLIENTE, rol: "viewer", portales: ["cliente"], estado: "activa" }],
      accesoCliente: [{ id: "a1", tenantId: TENANT_DE_PRUEBA, membershipId: MEMBRESIA, cuentaId: CUENTA_1, estado: "activo" }],
    });
    const r = await enviarCorreoCliente(ctx, solicitud([pdf("cotizacion", 10)]));
    expect(r.acceso).toBe("ya_tiene_acceso");
    expect(correos).toHaveLength(1);
    expect(correos[0]?.texto).not.toContain("la primera vez");
    expect(correos[0]?.texto).toContain("¿Olvidaste tu contraseña?");
  });

  it("un usuario de cliente sin vincular queda vinculado a su cuenta, sin instalaciones, y no se reinvita", async () => {
    const { ctx, correos } = escenario({
      user: [{ id: USUARIO_CLIENTE, email: "marta@cliente.cl", name: "Marta Lagos" }],
      membership: [{ id: MEMBRESIA, tenantId: TENANT_DE_PRUEBA, userId: USUARIO_CLIENTE, rol: "viewer", portales: ["cliente"], estado: "activa" }],
    });
    const r = await enviarCorreoCliente(ctx, solicitud([pdf("cotizacion", 10)]));
    expect(r.acceso).toBe("vinculado");
    const acceso = await ctx.db.accesoCliente.findMany();
    expect(acceso).toHaveLength(1);
    expect(acceso[0]).toMatchObject({ cuentaId: CUENTA_1, contactoId: CONTACTO_1, estado: "activo", todasInstalaciones: false });
    expect(correos.filter((c) => c.asunto.toLowerCase().includes("invit"))).toHaveLength(0);
    expect((await enviarCorreoCliente(ctx, solicitud([pdf("cotizacion", 10)]))).acceso).toBe("ya_tiene_acceso");
    expect(await ctx.db.accesoCliente.count()).toBe(1);
  });

  it("no toca a un usuario interno ni a una cuenta ajena", async () => {
    const { ctx } = escenario({
      user: [{ id: USUARIO_CLIENTE, email: "marta@cliente.cl", name: "Marta" }],
      membership: [{ id: MEMBRESIA, tenantId: TENANT_DE_PRUEBA, userId: USUARIO_CLIENTE, rol: "admin", portales: ["erp"], estado: "activa" }],
    });
    expect((await enviarCorreoCliente(ctx, solicitud([pdf("cotizacion", 10)]))).acceso).toBe("no_aplica");
    const otra = await enviarCorreoCliente(ctx, { ...solicitud([pdf("cotizacion", 10)]), cuentaId: "0192f3a0-0000-7000-8000-0000000000ff" });
    expect(otra.acceso).toBe("no_aplica");
  });

  it("con el portal apagado el correo sale con los PDF y sin instrucciones de portal", async () => {
    const { ctx, correos } = escenario({}, ["cpq"]);
    const r = await enviarCorreoCliente(ctx, solicitud([pdf("cotizacion", 10)]));
    expect(r.acceso).toBe("no_aplica");
    expect(correos).toHaveLength(1);
    expect(correos[0]?.texto).not.toContain("Portal Cliente");
  });

  it("la vista previa muestra el correo, los adjuntos y el acceso sin crear nada", async () => {
    const { ctx, correos } = escenario();
    const v = await previsualizarCorreoCliente(ctx, solicitud([pdf("cotizacion", 0), pdf("propuesta", 0)]));
    expect(v.acceso).toBe("invitado");
    expect(v.adjuntos).toEqual(["Cotizacion-CPQ-1.pdf", "Propuesta-tecnica-CPQ-1.pdf"]);
    expect(v.texto).toContain("Hola Marta,");
    expect(correos).toHaveLength(0);
    expect(await ctx.db.invitation.count()).toBe(0);
  });
});
