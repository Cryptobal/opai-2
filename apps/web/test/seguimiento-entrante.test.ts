import { createHmac } from "node:crypto";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { leerEventoEntrante, tokenDeDestinatarios } from "@/lib/correo-entrante";
import { verificarFirmaSvix } from "@/lib/firma-svix";

const SECRETO = `whsec_${Buffer.from("clave-de-prueba-0123456789").toString("base64")}`;
const AHORA = 1_800_000_000;
const firmar = (id: string, ts: number, cuerpo: string) =>
  `v1,${createHmac("sha256", Buffer.from(SECRETO.slice(6), "base64")).update(`${id}.${ts}.${cuerpo}`).digest("base64")}`;

describe("verificarFirmaSvix", () => {
  const cuerpo = '{"type":"email.received"}';
  it("acepta una firma válida y una lista con firmas viejas", () => {
    const f = firmar("msg_1", AHORA, cuerpo);
    expect(verificarFirmaSvix(SECRETO, cuerpo, { id: "msg_1", timestamp: String(AHORA), firma: f }, AHORA)).toBe(true);
    expect(verificarFirmaSvix(SECRETO, cuerpo, { id: "msg_1", timestamp: String(AHORA), firma: `v1,AAAA ${f}` }, AHORA)).toBe(true);
  });
  it("rechaza cuerpo alterado, firma ajena, vencida y cabeceras o secreto faltantes", () => {
    const f = firmar("msg_1", AHORA, cuerpo);
    const h = { id: "msg_1", timestamp: String(AHORA), firma: f };
    expect(verificarFirmaSvix(SECRETO, `${cuerpo} `, h, AHORA)).toBe(false);
    expect(verificarFirmaSvix(SECRETO, cuerpo, { ...h, firma: "v1,AAAA" }, AHORA)).toBe(false);
    expect(verificarFirmaSvix(SECRETO, cuerpo, h, AHORA + 301)).toBe(false);
    expect(verificarFirmaSvix(SECRETO, cuerpo, h, AHORA - 301)).toBe(false);
    expect(verificarFirmaSvix(SECRETO, cuerpo, { ...h, id: null }, AHORA)).toBe(false);
    expect(verificarFirmaSvix("", cuerpo, h, AHORA)).toBe(false);
    expect(verificarFirmaSvix(SECRETO, cuerpo, { ...h, firma: f.replace("v1,", "v2,") }, AHORA)).toBe(false);
  });
});

describe("leerEventoEntrante", () => {
  const evento = (d: object, type = "email.received") => JSON.stringify({ type, created_at: "2026-11-03T15:00:00Z", data: d });
  it("lee un correo recibido y su token de respuestas", () => {
    const e = leerEventoEntrante(evento({ email_id: "e1", from: "Ana <ana@cliente.cl>", subject: "Re: cotización", to: ["s0123456789abcdef0123456789abcdef@respuestas.opai.cl"] }));
    expect(e?.emailId).toBe("e1");
    expect(tokenDeDestinatarios(e?.para ?? [])).toBe("s0123456789abcdef0123456789abcdef");
  });
  it("descarta otros tipos, JSON roto y destinatarios de dominios ajenos", () => {
    expect(leerEventoEntrante(evento({ email_id: "e1" }, "email.sent"))).toBeNull();
    expect(leerEventoEntrante("no es json")).toBeNull();
    expect(tokenDeDestinatarios(["dte@inbound.opai.cl", "s0123456789abcdef0123456789abcdef@gard.cl"])).toBeNull();
  });
});

describe("POST /api/webhooks/resend/entrante", () => {
  const resolver = vi.fn();
  const ejecutar = vi.fn();
  beforeEach(() => {
    vi.resetModules();
    resolver.mockReset();
    ejecutar.mockReset().mockResolvedValue({ ok: true, data: { registrado: true } });
    vi.stubEnv("RESEND_INBOUND_WEBHOOK_SECRET", SECRETO);
    vi.stubEnv("RESEND_API_KEY", "");
    vi.doMock("@opai/db", () => ({ resolverTokenSeguimiento: resolver }));
    vi.doMock("@opai/capabilities", () => ({ crearContexto: () => ({}), executeCapability: ejecutar }));
    vi.doMock("@/lib/registro", () => ({ asegurarRegistro: () => undefined }));
    vi.doMock("@/lib/medidor", () => ({ medidorDiferido: {} }));
    vi.doMock("@/lib/solo-lectura", () => ({ soloLecturaDe: async () => [] }));
    vi.doMock("@/lib/rate-limit", () => ({ permitir: async () => true }));
  });
  const pedir = async (cuerpo: string, firmaValida = true) => {
    const { POST } = await import("../app/api/webhooks/resend/entrante/route");
    const ts = Math.floor(Date.now() / 1000);
    return POST(new Request("http://x/api/webhooks/resend/entrante", {
      method: "POST", body: cuerpo,
      headers: { "svix-id": "m1", "svix-timestamp": String(ts), "svix-signature": firmaValida ? firmar("m1", ts, cuerpo) : "v1,AAAA" },
    }));
  };
  const para = (a: string) => JSON.stringify({ type: "email.received", data: { email_id: "e1", from: "x@y.cl", to: [a] } });

  it("firma inválida: 401 y no toca nada", async () => {
    expect((await pedir(para("s0123456789abcdef0123456789abcdef@respuestas.opai.cl"), false)).status).toBe(401);
    expect(resolver).not.toHaveBeenCalled();
  });
  it("correo de otro dominio: 200 sin resolver ni ejecutar nada", async () => {
    expect((await pedir(para("dte@inbound.opai.cl"))).status).toBe(200);
    expect(resolver).not.toHaveBeenCalled();
    expect(ejecutar).not.toHaveBeenCalled();
  });
  it("token desconocido: 200 sin ejecutar", async () => {
    resolver.mockResolvedValue(null);
    expect((await pedir(para("s0123456789abcdef0123456789abcdef@respuestas.opai.cl"))).status).toBe(200);
    expect(ejecutar).not.toHaveBeenCalled();
  });
  it("token válido: ejecuta la capacidad con el tenant del token", async () => {
    resolver.mockResolvedValue({ tenantId: "t1", seguimientoId: "s1" });
    expect((await pedir(para("s0123456789abcdef0123456789abcdef@respuestas.opai.cl"))).status).toBe(200);
    expect(ejecutar).toHaveBeenCalledWith(expect.anything(), "comercial.seguimientos.recibir_correo", expect.objectContaining({ seguimientoId: "s1", mensajeId: "e1" }));
  });
  it("sin secreto configurado falla cerrado", async () => {
    vi.stubEnv("RESEND_INBOUND_WEBHOOK_SECRET", "");
    expect((await pedir(para("s0123456789abcdef0123456789abcdef@respuestas.opai.cl"))).status).toBe(401);
  });
});
